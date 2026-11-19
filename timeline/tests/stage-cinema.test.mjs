import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { ERA_PRESETS } from '../src/EraAtmosphere.js';
import { AUTHORED_STORIES } from '../src/stories.js';
import { PRC_STORIES } from '../src/storyboards/prc-catalog.js';

const TIMELINE_ROOT = fileURLToPath(new URL('..', import.meta.url));
const modernData = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const prcData = JSON.parse(readFileSync(new URL('../public/data/history-prc.json', import.meta.url), 'utf8'));
const allEvents = [...modernData.events, ...prcData.events];
const eventById = Object.fromEntries(allEvents.map((e) => [e.id, e]));
const stageCinemaCss = readFileSync(new URL('../src/stage-cinema.css', import.meta.url), 'utf8');

test('Multi-Stage Cinema pilots, EraCanvas, KineticCopy, and EvolutionStage render cleanly via Vite SSR', async () => {
  const server = await createServer({
    root: TIMELINE_ROOT,
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const {
      PILOT_STAGES,
      PILOT_STAGE_LIST,
      StageCinema,
      computeBeatProgress,
    } = await server.ssrLoadModule('/src/StageCinema.jsx');
    const { EraCanvas, ERA_CANVAS_MOTIFS } = await server.ssrLoadModule('/src/EraCanvas.jsx');
    const { KineticCopy } = await server.ssrLoadModule('/src/KineticCopy.jsx');
    const {
      EvolutionStage,
      EVOLUTION_SET_IDS,
      LAND_EVOLUTION_STEPS,
    } = await server.ssrLoadModule('/src/EvolutionStage.jsx');

    // 1. All 4 pilot scenes render cleanly across every beat phase with zero NaN/undefined
    assert.equal(PILOT_STAGE_LIST.length, 4);
    for (const pilot of PILOT_STAGE_LIST) {
      const scene = eventById[pilot.id];
      const story = AUTHORED_STORIES[pilot.id] || PRC_STORIES[pilot.id];
      assert.ok(scene && story, `Missing scene/story for pilot ${pilot.id}`);
      assert.equal(PILOT_STAGES[pilot.id].kind, pilot.kind);

      for (let phase = 0; phase < story.beats.length; phase += 1) {
        const markup = renderToStaticMarkup(
          React.createElement(StageCinema, { scene, story, phase, playing: false }),
        );
        assert.match(markup, new RegExp(`stage-cinema-${pilot.kind}`), `${pilot.id} missing stage kind class`);
        assert.doesNotMatch(markup, /NaN|undefined/, `${pilot.id} phase ${phase} has NaN or undefined`);
      }

      // Clock & beat progress determinism
      const atStartPlaying = computeBeatProgress(story, 0, false, true);
      assert.equal(atStartPlaying.b[0], 0, `${pilot.id} playing at t=0 starts at 0`);

      const atStartPaused = computeBeatProgress(story, 0, false, false);
      assert.ok(atStartPaused.b[0] >= 0.9, `${pilot.id} paused at beat head settles visibly`);

      const atReduced = computeBeatProgress(story, story.beats[1].at + 0.1, true, true);
      assert.ok(atReduced.b[1] >= 0.9, `${pilot.id} reduced-motion settles active beat`);
    }

    // 2. EraCanvas covers all 9 EraPresets & renders cleanly
    for (const eraKey of Object.keys(ERA_PRESETS)) {
      assert.ok(ERA_CANVAS_MOTIFS[eraKey], `EraCanvas missing motif for ${eraKey}`);
    }
    const canvasMarkup = renderToStaticMarkup(
      React.createElement(EraCanvas, { eraKey: 'vol1-1', theme: 'light', playing: false }),
    );
    assert.match(canvasMarkup, /era-canvas-layer/);

    // 3. KineticCopy preserves verbatim copy while highlighting key terms
    const sampleText = '文章批判亡国论和速胜论，预见抗战战略相持阶段，提出“兵民是胜利之本”。';
    const copyMarkup = renderToStaticMarkup(
      React.createElement(KineticCopy, { text: sampleText, beatKey: 'test:0', playing: true }),
    );
    assert.match(copyMarkup, /kinetic-term/);
    const stripped = copyMarkup.replace(/<[^>]+>/g, '');
    assert.equal(stripped, sampleText, 'KineticCopy must preserve 100% verbatim text');

    // 4. EvolutionStage covers all 12 retained land policies + 2 bonus sets
    assert.equal(LAND_EVOLUTION_STEPS.length, 12);
    for (const step of LAND_EVOLUTION_STEPS) {
      assert.ok(eventById[step.id], `LAND_EVOLUTION_STEPS references unknown event ${step.id}`);
      assert.ok(step.changed && step.kept && step.stamp, `LAND_EVOLUTION_STEPS ${step.id} missing delta metadata`);
    }
    for (const setId of EVOLUTION_SET_IDS) {
      const evoMarkup = renderToStaticMarkup(React.createElement(EvolutionStage, { setId }));
      assert.match(evoMarkup, /evo-stage/);
      assert.doesNotMatch(evoMarkup, /NaN|undefined/, `EvolutionStage ${setId} contains NaN/undefined`);
    }
  } finally {
    await server.close();
  }
});

test('stage-cinema.css adheres to modern entry/exit, pause freeze, and reduced-motion rules', () => {
  assert.match(stageCinemaCss, /transition-behavior:\s*allow-discrete/);
  assert.match(stageCinemaCss, /@starting-style\s*\{/);
  assert.match(stageCinemaCss, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
  assert.match(stageCinemaCss, /@media\s*\(\s*prefers-reduced-motion:\s*no-preference\s*\)/);
  assert.match(stageCinemaCss, /content-visibility:\s*auto/);
  assert.match(stageCinemaCss, /animation-play-state:\s*paused/);
  assert.equal(stageCinemaCss.includes('.map-particle-canvas'), false);
});
