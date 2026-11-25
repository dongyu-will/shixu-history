import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  cancelTopLayerClose,
  canTransitionDisplay,
  closeTopLayer,
  supportsTopLayerExit,
} from '../src/top-layer.js';

const motionCss = readFileSync(new URL('../src/motion.css', import.meta.url), 'utf8');
const uiMotionCss = readFileSync(new URL('../src/ui-motion.css', import.meta.url), 'utf8');
const mainJsx = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');

test('ui-motion.css is wired last in main.jsx and defines unified curves, top-layer exit, and accessible motion guards', () => {
  assert.match(mainJsx, /import\s+["']\.\/ui-motion\.css["']/);

  // Unified motion language tokens in motion.css
  for (const token of [
    '--motion-dur-press',
    '--motion-dur-micro',
    '--motion-dur-ui',
    '--motion-dur-sheet',
    '--motion-dur-exit',
    '--motion-ease-standard',
    '--motion-ease-exit',
    '--motion-ease-tactile',
    'interpolate-size: allow-keywords',
  ]) {
    assert.ok(motionCss.includes(token), `motion.css missing token/setting ${token}`);
  }

  // Top-layer entry/exit and discrete transitions
  assert.match(uiMotionCss, /@starting-style\s*\{/);
  assert.match(uiMotionCss, /transition-behavior:\s*allow-discrete/);
  assert.match(uiMotionCss, /transition-property:[^;]*overlay/);
  assert.ok(uiMotionCss.includes(':is(:popover-open, .\\:popover-open)'));
  assert.match(uiMotionCss, /:where\(:not\(\[data-closing\]\)\)/);

  // Anchor positioning tab underline with graceful fallback & Forced Colors border
  assert.match(uiMotionCss, /@supports\s*\(position-anchor:\s*--active-vol-pill\)/);
  assert.match(uiMotionCss, /anchor-name:\s*--active-study-tab/);
  assert.match(uiMotionCss, /anchor-name:\s*--active-detail-tab/);
  assert.match(uiMotionCss, /border-block-end:\s*2(?:\.5)?px solid/);

  // Long list virtualization and compositor-driven progress bar
  assert.match(uiMotionCss, /content-visibility:\s*auto/);
  assert.match(uiMotionCss, /\.evo-progress-fill\s*\{[\s\S]*transition:\s*transform/);

  // Reduced motion compliance without 0.01ms hacks
  assert.match(uiMotionCss, /@media\s*\(prefers-reduced-motion:\s*no-preference\)/);
  assert.match(uiMotionCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(uiMotionCss, /(?:animation|transition)-duration:\s*0\.0+1m?s/i);
});

test('top-layer.js guards SSR/Node environments cleanly without throwing', async () => {
  assert.equal(canTransitionDisplay(), false);
  assert.equal(supportsTopLayerExit(), false);
  cancelTopLayerClose(null);
  await closeTopLayer(null);
  await closeTopLayer({ open: false });
});
