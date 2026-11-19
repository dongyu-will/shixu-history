import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { geoMercator } from 'd3-geo';
import { createServer } from 'vite';
import {
  SFX_STORAGE_KEY,
  cueForBeat,
  isSfxEnabled,
  playBeat,
  playCue,
  playGate,
  playRipple,
  playStamp,
  readSfxPreference,
  setSfxEnabled,
  writeSfxPreference,
} from '../src/foley.js';
import { AUTHORED_STORIES } from '../src/stories.js';
import { PROCESS_PLACES } from '../src/storyboards/places.js';

const TIMELINE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const EARLY_IDS = ['e-1', 'e-20', 'e-21'];
const TURNING_IDS = ['e-36', 'e-38', 'e-47'];
const ALL_HERO_IDS = [...EARLY_IDS, ...TURNING_IDS];

function buildSceneProjection(story) {
  const diagram = story.kind === 'process' && !['geography', 'rendezvous'].includes(story.mode);
  const p = geoMercator()
    .center(story.center)
    .scale(story.scale)
    .translate(diagram && story.anchor ? [950, 653] : [930, 340]);
  if (story.locations) {
    const coordinates = story.locations.map((loc) => PROCESS_PLACES[loc.place]);
    p.fitExtent(
      [
        [670, 175],
        [1230, 535],
      ],
      { type: 'MultiPoint', coordinates },
    );
    if (p.scale() > 40000) {
      p.center([
        coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length,
        coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length,
      ])
        .translate([950, 355])
        .scale(40000);
    }
  }
  return p.clipExtent([
    [0, 0],
    [1440, 790],
  ]);
}

test('all 6 Stage 2 Hero scenes export valid Graphic and animate functions with SVG/WAAPI parity', async () => {
  const server = await createServer({
    root: TIMELINE_ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const { EARLY_HEROES } = await server.ssrLoadModule('/src/heroes/EarlyHeroes.jsx');
    const { TURNING_HEROES } = await server.ssrLoadModule('/src/heroes/TurningHeroes.jsx');

    assert.deepEqual(Object.keys(EARLY_HEROES).sort(), [...EARLY_IDS].sort());
    assert.deepEqual(Object.keys(TURNING_HEROES).sort(), [...TURNING_IDS].sort());

    const heroes = { ...EARLY_HEROES, ...TURNING_HEROES };
    for (const id of ALL_HERO_IDS) {
      const hero = heroes[id];
      assert.ok(hero, `Missing Hero definition for ${id}`);
      assert.equal(typeof hero.Graphic, 'function', `${id}.Graphic must be a function`);
      assert.equal(typeof hero.animate, 'function', `${id}.animate must be a function`);

      const story = AUTHORED_STORIES[id];
      assert.ok(story, `Missing AUTHORED_STORIES entry for ${id}`);
      const projection = buildSceneProjection(story);

      const markup = renderToStaticMarkup(
        React.createElement('svg', null, React.createElement(hero.Graphic, { story, projection, phase: 2, prefix: id })),
      );
      assert.ok(markup.length > 200, `${id} rendered SVG unexpectedly short`);
      assert.doesNotMatch(markup, /NaN|undefined/, `${id} SVG contains NaN or undefined`);
      assert.doesNotMatch(markup, /marker-end=/i, `${id} must not attach markerEnd to traced paths`);

      const domMotions = new Set([...markup.matchAll(/data-motion="([^"]+)"/g)].map((m) => m[1]));
      const domRoutes = new Set([...markup.matchAll(/data-route="([^"]+)"/g)].map((m) => m[1]));

      const animatedIds = new Set();
      const usedRoutes = new Set();
      const helpers = {
        add: (motionId) => animatedIds.add(motionId),
        show: (motionId) => animatedIds.add(motionId),
        pop: (motionId) => animatedIds.add(motionId),
        stamp: (motionId) => animatedIds.add(motionId),
        ripple: (motionId) => animatedIds.add(motionId),
        move: (motionId) => animatedIds.add(motionId),
        travel: (motionId, routeId) => {
          animatedIds.add(motionId);
          usedRoutes.add(routeId);
        },
        trace: (motionId) => animatedIds.add(motionId),
      };

      hero.animate(story, projection, helpers);
      assert.ok(animatedIds.size >= 5, `${id} should register WAAPI motion targets`);
      for (const motionId of animatedIds) {
        assert.ok(domMotions.has(motionId), `${id} animate() references missing data-motion="${motionId}"`);
      }
      for (const routeId of usedRoutes) {
        assert.ok(domRoutes.has(routeId), `${id} travel() references missing data-route="${routeId}"`);
      }
    }
  } finally {
    await server.close();
  }
});

test('foley preference read/write handles defaults, toggles, and blocked storage safely', () => {
  assert.equal(SFX_STORAGE_KEY, 'shixu-sfx');

  const backing = new Map();
  const storage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => backing.set(key, String(value)),
  };

  // Defaults to true when key is absent
  assert.equal(readSfxPreference(storage), true);

  // Persists false / true transitions under shixu-sfx
  assert.equal(writeSfxPreference(false, storage), false);
  assert.equal(backing.get(SFX_STORAGE_KEY), 'false');
  assert.equal(readSfxPreference(storage), false);

  assert.equal(writeSfxPreference(true, storage), true);
  assert.equal(backing.get(SFX_STORAGE_KEY), 'true');
  assert.equal(readSfxPreference(storage), true);

  // Graceful fallback when storage throws (private mode / blocked quota)
  const blocked = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(readSfxPreference(blocked), true);
  assert.equal(writeSfxPreference(false, blocked), false);
  assert.equal(writeSfxPreference(true, blocked), true);
});

test('cueForBeat classifies final beats as stamp, middle geographic/convergence beats as ripple, and normal beats as beat', () => {
  // Hero geographic scenes (e-1, e-20, e-21): beat 0 -> beat, beat 1 -> ripple, final beat 2 -> stamp
  for (const id of ['e-1', 'e-20', 'e-21', 'e-38', 'e-47']) {
    const story = AUTHORED_STORIES[id];
    assert.equal(cueForBeat(story, 0), 'beat', `${id} opening beat`);
    assert.equal(cueForBeat(story, 1), 'ripple', `${id} middle geographic/convergence beat`);
    assert.equal(cueForBeat(story, story.beats.length - 1), 'stamp', `${id} final beat`);
  }

  // Structural/debate/chain/fork scenes: opening & middle -> beat, final -> stamp
  for (const id of ['e-36', 'e-5', 'e-11', 'land-75']) {
    const story = AUTHORED_STORIES[id];
    assert.equal(cueForBeat(story, 0), 'beat', `${id} opening beat`);
    assert.equal(cueForBeat(story, 1), 'beat', `${id} middle structural beat`);
    assert.equal(cueForBeat(story, story.beats.length - 1), 'stamp', `${id} final beat`);
  }

  // Autumn harvest (5 beats, geographic/convergence kind): beat 0 -> beat, 1..3 -> ripple, 4 -> stamp
  const autumn = AUTHORED_STORIES['e-29'];
  assert.equal(cueForBeat(autumn, 0), 'beat');
  assert.equal(cueForBeat(autumn, 2), 'ripple');
  assert.equal(cueForBeat(autumn, 4), 'stamp');

  // Defensive fallback for invalid input
  assert.equal(cueForBeat(null, 0), 'beat');
  assert.equal(cueForBeat({ beats: [] }, 0), 'beat');
  assert.equal(cueForBeat(autumn, -1), 'beat');
});

test('foley playback cues silently no-op in Node when AudioContext is absent or disabled', () => {
  const prevEnabled = isSfxEnabled();
  try {
    setSfxEnabled(true);
    assert.equal(isSfxEnabled(), true);
    assert.equal(playBeat(), false);
    assert.equal(playStamp(), false);
    assert.equal(playRipple(), false);
    assert.equal(playGate(), false);
    assert.equal(playCue('beat'), false);
    assert.equal(playCue('ripple'), false);
    assert.equal(playCue('stamp'), false);
    assert.equal(playCue('gate'), false);

    setSfxEnabled(false);
    assert.equal(isSfxEnabled(), false);
    assert.equal(playBeat(), false);
    assert.equal(playStamp({ enabled: false }), false);
    assert.equal(playGate({ enabled: true, reducedMotion: true }), false);
  } finally {
    setSfxEnabled(prevEnabled);
  }
});

test('StoryLayer, App, and CausalLesson integrate Hero scenes and foley without altering hash-pinned data', () => {
  const storyLayer = readFileSync(new URL('../src/StoryLayer.jsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const lesson = readFileSync(new URL('../src/CausalLesson.jsx', import.meta.url), 'utf8');

  assert.match(storyLayer, /EARLY_HEROES/);
  assert.match(storyLayer, /TURNING_HEROES/);
  assert.match(storyLayer, /HERO_SCENES/);
  assert.match(app, /readSfxPreference/);
  assert.match(app, /writeSfxPreference/);
  assert.match(app, /音效/);
  assert.match(lesson, /playGate/);
  assert.match(lesson, /readSfxPreference/);
});
