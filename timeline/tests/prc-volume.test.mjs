import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { geoMercator } from 'd3-geo';
import { createServer } from 'vite';
import { buildClozeSegments } from '../src/cloze.js';
import {
  PRC_HERO_IDS,
  PRC_PLAYBACK_SECONDS,
  PRC_STORIES,
  storyboardPrcEvents,
} from '../src/storyboards/prc-catalog.js';
import { PRC_PLACES } from '../src/storyboards/prc-places.js';
import {
  PRC_NARRATION_SCRIPTS,
  prcFallbackCaptions,
  prcNarrationPlan,
} from '../src/narration-prc.js';
import {
  VOLUMES,
  normalizeVolumeId,
  playbackTimeFor,
  storyTimeFor,
  volumeIdForEvent,
} from '../src/volumes.js';

const prcData = JSON.parse(readFileSync(new URL('../public/data/history-prc.json', import.meta.url), 'utf8'));
const modernData = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const prcHeroesSource = readFileSync(new URL('../src/heroes/PrcHeroes.jsx', import.meta.url), 'utf8');

test('history-prc.json contains 36 chronologically valid nodes across 4 chapters with zero ID collision', () => {
  assert.equal(prcData.volume, 'prc');
  assert.equal(prcData.chapters.length, 4);
  assert.equal(prcData.events.length, 36);

  const modernIds = new Set(modernData.events.map((e) => e.id));
  const seen = new Set();
  const perChapter = [0, 0, 0, 0];
  let pdfCount = 0;

  for (const e of prcData.events) {
    assert.ok(e.id.startsWith('prc-'), `Unexpected PRC ID prefix: ${e.id}`);
    assert.ok(!seen.has(e.id), `Duplicate PRC ID: ${e.id}`);
    assert.ok(!modernIds.has(e.id), `Collision with Volume I ID: ${e.id}`);
    seen.add(e.id);
    assert.ok(['event', 'meeting', 'writing', 'land'].includes(e.kind), e.id);
    assert.ok(e.chapter >= 0 && e.chapter <= 3, e.id);
    perChapter[e.chapter] += 1;
    assert.ok(e.year >= 1949 && e.year <= 2026, e.id);
    assert.ok(e.title && e.headline && e.summary, e.id);
    assert.ok(Array.isArray(e.original) && e.original.length >= 1, `${e.id} missing original points`);
    assert.ok(['pdf', 'pdf_expanded', 'editorial_supplement'].includes(e.sourceType), e.id);
    if (e.sourceType === 'pdf' || e.sourceType === 'pdf_expanded') {
      pdfCount += 1;
      assert.ok(e.pages.length >= 1, `${e.id} marked as PDF source without page numbers`);
    }
  }

  assert.deepEqual(perChapter, [8, 8, 14, 6]);
  assert.equal(pdfCount, 26, 'All 26 post-1949 PDF entries must be preserved');
});

test('all 36 PRC nodes have complete storyboards, valid places, exact 480s clock, and cloze blanks', () => {
  const timed = storyboardPrcEvents(prcData.events);
  const totalSeconds = timed.reduce((sum, e) => sum + e.duration, 0);
  assert.equal(PRC_PLAYBACK_SECONDS, 480);
  assert.ok(Math.abs(totalSeconds - PRC_PLAYBACK_SECONDS) < 1e-6, `Expected 480s, got ${totalSeconds}`);

  for (const event of timed) {
    const story = PRC_STORIES[event.id];
    assert.ok(story, `Missing storyboard for ${event.id}`);
    assert.ok(Array.isArray(story.beats) && story.beats.length >= 3, `${event.id} needs >= 3 beats`);
    assert.equal(story.beats[0].at, 0, `${event.id} first beat must start at 0`);
    for (let i = 1; i < story.beats.length; i += 1) {
      assert.ok(story.beats[i].at > story.beats[i - 1].at, `${event.id} beats must strictly increase`);
    }
    if (story.anchor) {
      assert.ok(PRC_PLACES[story.anchor], `${event.id} missing PRC_PLACES anchor ${story.anchor}`);
    }
    if (story.locations) {
      for (const loc of story.locations) {
        assert.ok(PRC_PLACES[loc.place], `${event.id} missing PRC_PLACES location ${loc.place}`);
      }
    }
    const headlineSegs = buildClozeSegments(event.headline);
    const summarySegs = buildClozeSegments(event.summary);
    assert.equal(headlineSegs.map((s) => s.text).join(''), event.headline);
    assert.equal(summarySegs.map((s) => s.text).join(''), event.summary);
    assert.ok(headlineSegs.some((s) => s.blank) || summarySegs.some((s) => s.blank), event.id);

    // Bidirectional storyTimeFor <-> playbackTimeFor round-trip
    const mid = event.duration / 2;
    const authoredMid = storyTimeFor(story, event, mid);
    const roundTrip = playbackTimeFor(story, event, authoredMid);
    assert.ok(Math.abs(roundTrip - mid) < 1e-6, `${event.id} round-trip timing mismatch`);
  }
});

test('all 36 PRC narration scripts generate contiguous 0..480s captions', () => {
  const timed = storyboardPrcEvents(prcData.events);
  const plan = prcNarrationPlan(timed);
  assert.equal(plan.length, 36);
  assert.equal(Object.keys(PRC_NARRATION_SCRIPTS).length, 36);

  const cues = prcFallbackCaptions(timed);
  assert.ok(cues.length >= 60);
  assert.equal(cues[0].start, 0);
  assert.ok(Math.abs(cues.at(-1).end - PRC_PLAYBACK_SECONDS) < 1e-6);
  for (let i = 1; i < cues.length; i += 1) {
    assert.ok(Math.abs(cues[i].start - cues[i - 1].end) < 1e-6, `Gap/overlap at cue ${i}`);
    assert.ok(cues[i].end > cues[i].start, `Non-positive duration at cue ${i}`);
  }
});

test('all 6 PRC Hero scenes export valid Graphic/animate with 100% SVG/WAAPI motion-ID parity', async () => {
  assert.equal(PRC_HERO_IDS.size, 6);
  assert.doesNotMatch(prcHeroesSource, /markerEnd=/, 'Traced Hero paths must use ArrivalTip, not markerEnd');
  assert.equal(volumeIdForEvent('prc-e-1'), 'prc');
  assert.equal(volumeIdForEvent('e-47'), 'modern');
  assert.equal(normalizeVolumeId('prc'), 'prc');
  assert.equal(normalizeVolumeId('unknown'), 'modern');
  assert.equal(VOLUMES.modern.totalSeconds, 720);
  assert.equal(VOLUMES.prc.totalSeconds, 480);
  assert.equal(VOLUMES.prc.hasAudioTrack, true);
  assert.equal(VOLUMES.prc.audioManifestUrl, '/audio/timeline-prc-zh.json');

  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const { PRC_HEROES } = await server.ssrLoadModule('/src/heroes/PrcHeroes.jsx');
    assert.deepEqual(Object.keys(PRC_HEROES).sort(), [...PRC_HERO_IDS].sort());

    for (const id of PRC_HERO_IDS) {
      const hero = PRC_HEROES[id];
      const story = PRC_STORIES[id];
      const p = geoMercator().center(story.center).scale(story.scale).translate([930, 340]);
      if (story.locations) {
        p.fitExtent([[670, 175], [1230, 535]], {
          type: 'MultiPoint',
          coordinates: story.locations.map((loc) => PRC_PLACES[loc.place]),
        });
      }
      const markup = renderToStaticMarkup(
        React.createElement('svg', null, React.createElement(hero.Graphic, { story, projection: p, phase: 3, prefix: id })),
      );
      assert.ok(markup.length > 300, `${id} SVG too short`);
      assert.doesNotMatch(markup, /NaN|undefined/, `${id} SVG contains NaN or undefined`);
      assert.match(markup, /seal-stamp/, `${id} must render SealStamp`);

      const motionIds = new Set([...markup.matchAll(/data-motion="([^"]+)"/g)].map((m) => m[1]));
      const routeIds = new Set([...markup.matchAll(/data-route="([^"]+)"/g)].map((m) => m[1]));
      const usedMotions = [];
      const usedRoutes = [];
      const h = {
        add: (m) => usedMotions.push(m),
        show: (m) => usedMotions.push(m),
        pop: (m) => usedMotions.push(m),
        stamp: (m) => usedMotions.push(m),
        ripple: (m) => usedMotions.push(m),
        move: (m) => usedMotions.push(m),
        trace: (m) => usedMotions.push(m),
        travel: (m, r) => {
          usedMotions.push(m);
          usedRoutes.push(r);
        },
      };
      hero.animate(story, p, h);
      assert.ok(usedMotions.length >= 6, `${id} expected animated elements`);
      for (const m of usedMotions) {
        assert.ok(motionIds.has(m), `${id}: animated data-motion="${m}" missing from SVG`);
      }
      for (const r of usedRoutes) {
        assert.ok(routeIds.has(r), `${id}: travel data-route="${r}" missing from SVG`);
      }
    }
  } finally {
    await server.close();
  }
});

test('published PRC AI narration manifest matches approved GPT-SoVITS voice, 480s duration, and exact scripts', () => {
  const manifestUrl = new URL('../public/audio/timeline-prc-zh.json', import.meta.url);
  assert.ok(existsSync(manifestUrl), 'Missing public/audio/timeline-prc-zh.json');
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const profile = JSON.parse(readFileSync(new URL('../scripts/approved-voice.json', import.meta.url), 'utf8'));

  assert.equal(manifest.version, 1);
  assert.equal(manifest.engine, profile.engine);
  assert.equal(manifest.model, profile.model);
  assert.equal(manifest.voiceProfileId, profile.id);
  assert.equal(manifest.duration, PRC_PLAYBACK_SECONDS);
  for (const key of ['engine', 'model', 'referenceHash', 'promptHash', 'approvedAuditionHash']) {
    assert.equal(manifest.synthesis[key], profile[key], `PRC synthesis mismatch: ${key}`);
  }

  const audioFile = fileURLToPath(new URL(`../public${manifest.audio}`, import.meta.url));
  const vttFile = fileURLToPath(new URL(`../public${manifest.captions}`, import.meta.url));
  assert.ok(existsSync(audioFile), `Missing PRC audio file: ${audioFile}`);
  assert.ok(existsSync(vttFile), `Missing PRC VTT file: ${vttFile}`);
  assert.equal(createHash('sha256').update(readFileSync(audioFile)).digest('hex'), manifest.audioHash);

  const actualDuration = Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audioFile], {
      encoding: 'utf8',
    }).trim(),
  );
  assert.ok(Math.abs(actualDuration - PRC_PLAYBACK_SECONDS) < 0.05, `Actual PRC audio ${actualDuration}s != 480s`);

  const maxTempo = Math.max(...manifest.metrics.map((m) => m.tempo));
  assert.ok(maxTempo <= 1.25, `PRC maxTempo too high: ${maxTempo}`);

  const timed = storyboardPrcEvents(prcData.events, PRC_PLAYBACK_SECONDS);
  const plan = prcNarrationPlan(timed);
  assert.equal(manifest.cues.length, plan.flatMap((p) => p.lines).length);
  assert.deepEqual(
    manifest.cues.map((c) => c.text),
    plan.flatMap((p) => p.lines),
  );

  // Also check 90-second road lesson audio exists and is exact 90s
  const roadFile = path.resolve(fileURLToPath(new URL('../public/audio/road-90.m4a', import.meta.url)));
  assert.ok(existsSync(roadFile), 'Missing public/audio/road-90.m4a');
  const roadDur = Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', roadFile], {
      encoding: 'utf8',
    }).trim(),
  );
  assert.ok(Math.abs(roadDur - 90) < 0.05, `Actual road-90 audio ${roadDur}s != 90s`);
});
