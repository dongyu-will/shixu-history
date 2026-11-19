import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { geoMercator } from 'd3-geo';
import { createServer } from 'vite';
import { AUTHORED_STORIES } from '../src/stories.js';
import { PROCESS_PLACES } from '../src/storyboards/places.js';
import { PRC_HERO_IDS, PRC_STORIES } from '../src/storyboards/prc-catalog.js';
import { PRC_PLACES } from '../src/storyboards/prc-places.js';
import {
  ERA_PRESETS,
  FLAT_MODES,
  getSceneAtmosphere,
} from '../src/EraAtmosphere.js';

const TIMELINE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const ALL_PLACES = { ...PROCESS_PLACES, ...PRC_PLACES };

const modernData = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const prcData = JSON.parse(readFileSync(new URL('../public/data/history-prc.json', import.meta.url), 'utf8'));
const narrationManifest = JSON.parse(readFileSync(new URL('../public/audio/timeline-zh.json', import.meta.url), 'utf8'));
const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8');

const VOL1_HERO_IDS = ['e-1', 'e-20', 'e-21', 'e-36', 'e-38', 'e-47'];
const VOL2_HERO_IDS = ['prc-e-1', 'prc-e-5', 'prc-e-6', 'prc-m-6', 'prc-e-9', 'prc-m-19'];
const ALL_HERO_IDS = [...VOL1_HERO_IDS, ...VOL2_HERO_IDS];
const HERO_ID_SET = new Set(ALL_HERO_IDS);

function buildProjection(story) {
  const diagram = story.kind === 'process' && !['geography', 'rendezvous'].includes(story.mode);
  const p = geoMercator()
    .center(story.center || [104, 32])
    .scale(story.scale || 730)
    .translate(diagram && story.anchor ? [950, 653] : [930, 340]);
  if (story.locations) {
    const coordinates = story.locations.map((loc) => ALL_PLACES[loc.place]).filter(Boolean);
    if (coordinates.length) {
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
  }
  return p.clipExtent([
    [0, 0],
    [1440, 790],
  ]);
}

function collectMotionHelpers(domMotions) {
  const animatedIds = new Set();
  const usedRoutes = new Set();
  const helpers = {
    add: (id) => animatedIds.add(id),
    show: (id) => animatedIds.add(id),
    pop: (id) => animatedIds.add(id),
    stamp: (id) => animatedIds.add(id),
    ripple: (id) => animatedIds.add(id),
    move: (id) => animatedIds.add(id),
    trace: (id) => animatedIds.add(id),
    travel: (id, routeId) => {
      animatedIds.add(id);
      if (domMotions?.has(`${id}-heading`)) {
        animatedIds.add(`${id}-heading`);
      }
      usedRoutes.add(routeId);
    },
  };
  return { animatedIds, usedRoutes, helpers };
}

function assertNoAmbOnDataMotion(markup, label) {
  const tags = markup.match(/<[^>]*data-motion="[^"]+"[^>]*>/g) || [];
  for (const tag of tags) {
    const classMatch = tag.match(/class="([^"]+)"/);
    if (classMatch) {
      assert.doesNotMatch(
        classMatch[1],
        /\bamb-/,
        `${label}: ambient CSS class must not be placed directly on data-motion element: ${tag}`,
      );
    }
  }
}

test('EraAtmosphere maps all 136 scenes across Vol I + Vol II with strict flat/spatial tilt separation', () => {
  const allEntries = [
    ...modernData.events.map((scene) => ({
      volumeId: 'modern',
      scene,
      authored: AUTHORED_STORIES[scene.id],
    })),
    ...prcData.events.map((scene) => ({
      volumeId: 'prc',
      scene,
      authored: PRC_STORIES[scene.id],
    })),
  ];

  assert.equal(allEntries.length, 136, 'Expected 100 Vol I + 36 Vol II = 136 total scenes');
  assert.equal(Object.keys(ERA_PRESETS).length, 9, 'Expected 9 chapter era presets');

  const requiredVars = ['--era-glow', '--era-glow-soft', '--era-vignette', '--era-accent-tint', '--era-horizon'];

  for (const { volumeId, scene, authored } of allEntries) {
    assert.ok(authored, `Missing authored storyboard for ${scene.id}`);
    const atm = getSceneAtmosphere({ volumeId, scene, authored });
    assert.ok(ERA_PRESETS[atm.eraKey], `${scene.id}: invalid eraKey ${atm.eraKey}`);
    assert.ok(typeof atm.label === 'string' && atm.label.length > 0, `${scene.id}: missing era label`);
    for (const v of requiredVars) {
      assert.ok(atm.dayVars[v], `${scene.id}: missing dayVars[${v}]`);
      assert.ok(atm.nightVars[v], `${scene.id}: missing nightVars[${v}]`);
    }

    if (authored.kind === 'process' && FLAT_MODES.has(authored.mode) && !HERO_ID_SET.has(scene.id)) {
      assert.equal(
        atm.tiltDeg,
        0,
        `${scene.id} (non-Hero ${authored.mode}) must stay strictly flat (tiltDeg === 0), got ${atm.tiltDeg}`,
      );
      assert.equal(atm.isSpatial, false, `${scene.id} must have isSpatial === false`);
    }
  }

  const expectedSpatialIds = ['e-1', 'e-38', 'prc-e-1', 'prc-e-6', 'prc-e-9', 'prc-m-19', 'prc-w-3', 'prc-e-10'];
  for (const id of expectedSpatialIds) {
    const entry = allEntries.find((e) => e.scene.id === id);
    assert.ok(entry, `Missing spatial test scene ${id}`);
    const atm = getSceneAtmosphere(entry);
    assert.ok(
      atm.tiltDeg >= 10 && atm.tiltDeg <= 18,
      `${id}: expected restrained 2.5D tilt in [10, 18], got ${atm.tiltDeg}`,
    );
    assert.equal(atm.isSpatial, true, `${id}: expected isSpatial === true`);
  }
  assert.equal(existsSync(new URL('../src/ParticleCanvas.jsx', import.meta.url)), false, 'ParticleCanvas.jsx must stay removed');
});

test('HeroEmblems, all 12 Hero scenes, and representative upgraded ProcessGraphic apparatuses pass Vite SSR & SVG/WAAPI parity', async () => {
  const server = await createServer({
    root: TIMELINE_ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    // 1. HeroEmblems SSR validation across every emblem in EMBLEM_NAMES
    const { HeroEmblem, EMBLEM_NAMES } = await server.ssrLoadModule('/src/HeroEmblems.jsx');
    assert.ok(Array.isArray(EMBLEM_NAMES) && EMBLEM_NAMES.length >= 25, 'Expected >= 25 bespoke hero emblems');
    for (const name of EMBLEM_NAMES) {
      for (const tone of ['org', 'force', 'gold']) {
        const markup = renderToStaticMarkup(
          React.createElement('svg', null, React.createElement(HeroEmblem, { name, size: 28, tone })),
        );
        assert.match(markup, new RegExp(`hero-emblem-${name}`), `Emblem ${name} missing class`);
        assert.match(markup, /<(path|circle|ellipse|rect|polygon)\b/, `Emblem ${name} missing vector geometry`);
        assert.doesNotMatch(markup, /NaN|undefined/, `Emblem ${name} (${tone}) contains NaN or undefined`);
        assert.doesNotMatch(markup, /url\(#/, `Emblem ${name} should not rely on external SVG defs`);
      }
    }

    // 2. All 12 Hero scenes (Vol I + Vol II) SVG/WAAPI parity & living ambient upgrade checks
    const { EARLY_HEROES } = await server.ssrLoadModule('/src/heroes/EarlyHeroes.jsx');
    const { TURNING_HEROES } = await server.ssrLoadModule('/src/heroes/TurningHeroes.jsx');
    const { PRC_HEROES } = await server.ssrLoadModule('/src/heroes/PrcHeroes.jsx');
    const allHeroes = { ...EARLY_HEROES, ...TURNING_HEROES, ...PRC_HEROES };

    assert.equal(PRC_HERO_IDS.size, 6);
    assert.deepEqual(Object.keys(allHeroes).sort(), [...ALL_HERO_IDS].sort());

    for (const id of ALL_HERO_IDS) {
      const hero = allHeroes[id];
      const story = AUTHORED_STORIES[id] || PRC_STORIES[id];
      assert.ok(story, `Missing story for Hero ${id}`);
      const projection = buildProjection(story);
      const markup = renderToStaticMarkup(
        React.createElement(
          'svg',
          null,
          React.createElement(hero.Graphic, { story, projection, phase: story.beats.length - 1, prefix: id }),
        ),
      );

      assert.ok(markup.length > 400, `${id} Hero SVG unexpectedly short`);
      assert.doesNotMatch(markup, /NaN|undefined/, `${id} Hero SVG contains NaN or undefined`);
      assert.doesNotMatch(markup, /marker-end=/i, `${id} Hero must not use markerEnd`);
      assert.match(markup, /hero-emblem/, `${id} Hero must embed bespoke HeroEmblem icons`);
      assertNoAmbOnDataMotion(markup, `Hero ${id}`);

      const domMotions = new Set([...markup.matchAll(/data-motion="([^"]+)"/g)].map((m) => m[1]));
      const domRoutes = new Set([...markup.matchAll(/data-route="([^"]+)"/g)].map((m) => m[1]));
      const { animatedIds, usedRoutes, helpers } = collectMotionHelpers(domMotions);
      hero.animate(story, projection, helpers);

      assert.ok(animatedIds.size >= 6, `${id} Hero registered too few WAAPI animations`);
      for (const m of animatedIds) {
        assert.ok(domMotions.has(m), `Hero ${id}: animate() references missing data-motion="${m}"`);
      }
      for (const m of domMotions) {
        assert.ok(animatedIds.has(m), `Hero ${id}: orphan SVG data-motion="${m}" never animated`);
      }
      for (const r of usedRoutes) {
        assert.ok(domRoutes.has(r), `Hero ${id}: travel() references missing data-route="${r}"`);
      }

      if (id === 'prc-e-6') {
        assert.match(markup, /amb-satellite-orbit/, 'prc-e-6 must animate Dongfanghong-1 orbital wrapper');
      }
      if (id === 'e-47' || id === 'prc-m-19') {
        assert.match(markup, /amb-sunburst-spin/, `${id} must animate 12-ray sunburst rotation`);
      }
      if (id === 'e-21') {
        assert.match(markup, /amb-boat-bob/, 'e-21 must animate Nanhu Red Boat bob');
      }
    }

    // 3. Representative upgraded ProcessGraphic scenes across every generic mode
    const { ProcessGraphic, processLayout, animateProcess } = await server.ssrLoadModule('/src/ProcessGraphic.jsx');
    const representativeCases = [
      // debate -> mechanical tilting balance scale
      { id: 'e-14', mode: 'debate', expect: [/proc-scale-frame/, /p-scale-beam/] },
      { id: 'prc-e-8', mode: 'debate', expect: [/proc-scale-frame/, /p-scale-beam/] },
      // cycle -> meshing rotating flywheel gears
      { id: 'prc-w-1', mode: 'cycle', expect: [/proc-gear/, /amb-gear-cw/, /amb-gear-ccw/] },
      { id: 'prc-m-16', mode: 'cycle', expect: [/proc-gear/, /amb-gear-cw/, /amb-gear-ccw/] },
      // land -> preserve-rich, 2-layer Xiaogang peel, 3-layer Three-Rights peel, unimplemented proposal
      { id: 'prc-l-1', mode: 'land', expect: [/proc-land-preserve-frame/, /保存富农经济/] },
      { id: 'prc-l-3', mode: 'land', expect: [/p-layer-base/, /p-layer-top/, /proc-thumbprint-seal/, /amb-float-soft/] },
      { id: 'prc-l-4', mode: 'land', expect: [/p-tri-layer-0/, /p-tri-layer-1/, /p-tri-layer-2/, /amb-float-soft-mid/] },
      { id: 'land-70', mode: 'land', expect: [/land-field/, /is-proposal/] },
      // seats -> ceremonial amphitheater wave fill
      { id: 'e-41', mode: 'seats', expect: [/hemicycle-seat/, /p-rostrum-crest/, /amb-seat-wave/, /1 \/ 3/] },
      { id: 'prc-e-3', mode: 'seats', expect: [/hemicycle-seat/, /p-rostrum-crest/, /amb-seat-wave/] },
      // strategy -> concentric tactical radar
      { id: 'e-40', mode: 'strategy', expect: [/p-strategy-radar/, /amb-radar-sweep/, /proc-radar-wedge/] },
      // geography -> living flow trails & hub beacons
      { id: 'prc-w-3', mode: 'geography', expect: [/amb-flow-dash/, /amb-ripple-loop/] },
      { id: 'e-15', mode: 'geography', expect: [/amb-flow-dash/, /amb-ripple-loop/] },
      // fronts -> strategic battle fronts with living flow dashes
      { id: 'writing-88', mode: 'fronts', expect: [/front-lane/, /amb-flow-dash/] },
      { id: 'e-45', mode: 'fronts', expect: [/front-lane/, /amb-flow-dash/] },
      // fork / chain / union -> living conduits + monument plinths on prc-m-18
      { id: 'e-5', mode: 'fork', expect: [/amb-flow-dash-soft/, /amb-breathe/] },
      { id: 'prc-m-1', mode: 'fork', expect: [/amb-flow-dash-soft/, /amb-breathe/] },
      { id: 'prc-l-2', mode: 'chain', expect: [/amb-flow-dash-soft/, /amb-breathe/] },
      { id: 'prc-m-18', mode: 'chain', expect: [/amb-flow-dash-soft/, /proc-monument-plinth/] },
      { id: 'e-24', mode: 'union', expect: [/amb-flow-dash-soft/, /union-wave/] },
      { id: 'meeting-69', mode: 'union', expect: [/amb-flow-dash-soft/, /union-wave/] },
    ];

    for (const { id, mode, expect } of representativeCases) {
      const story = AUTHORED_STORIES[id] || PRC_STORIES[id];
      assert.ok(story, `Missing story ${id}`);
      assert.equal(story.mode, mode, `Expected ${id} mode=${mode}, got ${story.mode}`);

      const projection = buildProjection(story);
      const layout = processLayout(story, projection);
      const markup = renderToStaticMarkup(
        React.createElement(
          'svg',
          null,
          React.createElement(ProcessGraphic, {
            story,
            layout,
            phase: story.beats.length - 1,
            prefix: id,
          }),
        ),
      );

      assert.ok(markup.length > 300, `Process ${id} rendered SVG unexpectedly short`);
      assert.doesNotMatch(markup, /NaN|undefined/, `Process ${id} contains NaN or undefined`);
      assert.doesNotMatch(markup, /marker-end=/i, `Process ${id} must not use markerEnd`);
      assertNoAmbOnDataMotion(markup, `Process ${id}`);

      for (const pattern of expect) {
        assert.match(markup, pattern, `Process ${id} (${mode}) missing expected pattern ${pattern}`);
      }

      const domMotions = new Set([...markup.matchAll(/data-motion="([^"]+)"/g)].map((m) => m[1]));
      const domRoutes = new Set([...markup.matchAll(/data-route="([^"]+)"/g)].map((m) => m[1]));
      const { animatedIds, usedRoutes, helpers } = collectMotionHelpers(domMotions);
      animateProcess(story, layout, helpers);

      assert.ok(animatedIds.size >= 4, `Process ${id} registered too few WAAPI targets`);
      for (const m of animatedIds) {
        assert.ok(domMotions.has(m), `Process ${id}: animateProcess() references missing data-motion="${m}"`);
      }
      for (const m of domMotions) {
        assert.ok(animatedIds.has(m), `Process ${id}: orphan SVG data-motion="${m}" never animated`);
      }
      for (const r of usedRoutes) {
        assert.ok(domRoutes.has(r), `Process ${id}: travel() references missing data-route="${r}"`);
      }
    }
  } finally {
    await server.close();
  }
});

test('motion.css complies with reduced-motion opt-in, pause freeze, physics linear() easing, and identity transforms', () => {
  // 1. Reduced-motion opt-in media query
  assert.match(motionCss, /@media\s*\(\s*prefers-reduced-motion:\s*no-preference\s*\)/);

  // 2. Pause freeze on both .history-map.is-paused and .map-cinema-stage.is-paused
  assert.match(motionCss, /\.history-map\.is-paused\s+\[class\*="amb-"\]/);
  assert.match(motionCss, /\.map-cinema-stage\.is-paused\s+\[class\*="amb-"\]/);
  assert.match(motionCss, /animation-play-state:\s*paused\s*!important/);

  // 3. Physics-based linear(...) easing with cubic-bezier(...) fallback declared before @supports
  const bezierIdx = motionCss.indexOf('--motion-ease-spring: cubic-bezier(');
  const supportsIdx = motionCss.indexOf('@supports (animation-timing-function: linear(0, 1))');
  const linearIdx = motionCss.indexOf('--motion-ease-spring: linear(');
  assert.ok(bezierIdx > 0, 'Missing cubic-bezier fallback for --motion-ease-spring');
  assert.ok(supportsIdx > bezierIdx, 'Expected @supports linear() block after cubic-bezier fallback');
  assert.ok(linearIdx > supportsIdx, 'Expected linear() definition inside @supports block');

  // 4. Identity base 3D transform on .map-cinema-tilt + mobile flat safeguard
  assert.match(motionCss, /\.map-cinema-tilt\s*\{[\s\S]*?transform:\s*perspective\(1800px\)\s*rotateX\(0deg\)/);
  assert.match(motionCss, /@media\s*\(\s*max-width:\s*760px\s*\)[\s\S]*?\.map-cinema-tilt\s*\{[\s\S]*?transform:\s*none\s*!important/);

  // 5. Key ambient & apparatus selectors present
  for (const selector of [
    '.amb-breathe',
    '.amb-ripple-loop',
    '.amb-flow-dash',
    '.amb-flow-dash-soft',
    '.amb-sunburst-spin',
    '.amb-gear-cw',
    '.amb-gear-ccw',
    '.amb-atom-spin',
    '.amb-radar-sweep',
    '.amb-boat-bob',
    '.amb-torch-flicker',
    '.amb-compass-settle',
    '.amb-satellite-orbit',
    '.amb-shield-pulse',
    '.amb-float-soft',
    '.amb-float-soft-mid',
    '.amb-seat-wave',
    '.proc-land-preserve-box',
  ]) {
    assert.ok(motionCss.includes(selector), `motion.css missing selector ${selector}`);
  }
  assert.equal(motionCss.includes('.map-particle-canvas'), false, 'motion.css must not retain removed particle canvas styles');
});

test('the 5 hash-pinned Volume I files match timeline-zh.json SHA-256 contentHashes verbatim', () => {
  const pinnedFiles = [
    'public/data/history.json',
    'src/stories.js',
    'src/storyboards/catalog.js',
    'src/narration.js',
    'src/lesson.js',
  ];
  assert.deepEqual(
    Object.keys(narrationManifest.contentHashes).sort(),
    [...pinnedFiles].sort(),
    'Unexpected set of hash-pinned files in timeline-zh.json',
  );
  for (const relPath of pinnedFiles) {
    const actualHash = createHash('sha256')
      .update(readFileSync(new URL(`../${relPath}`, import.meta.url)))
      .digest('hex');
    assert.equal(
      actualHash,
      narrationManifest.contentHashes[relPath],
      `Hash-pinned Volume I file mutated: ${relPath}`,
    );
  }
});
