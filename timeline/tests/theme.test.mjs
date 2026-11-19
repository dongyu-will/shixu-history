import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  applyTheme,
  nextTheme,
  normalizeTheme,
  readStoredTheme,
} from '../src/theme.js';

test('theme helpers normalize legacy values and toggle strictly between light and dark', () => {
  assert.equal(normalizeTheme(undefined), 'light');
  assert.equal(normalizeTheme('day'), 'light');
  assert.equal(normalizeTheme('light'), 'light');
  assert.equal(normalizeTheme('dark'), 'dark');
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('day'), 'dark');
});

test('applyTheme updates DOM, theme-color meta, and shixu-theme storage gracefully', () => {
  let metaContent = '';
  const store = new Map();
  const doc = {
    documentElement: { dataset: {} },
    querySelector: (selector) =>
      selector === 'meta[name="theme-color"]'
        ? { setAttribute: (_name, value) => { metaContent = value; } }
        : null,
  };
  const storage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
  };

  assert.equal(applyTheme('dark', { doc, storage, persist: true }), 'dark');
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  assert.equal(metaContent, THEME_COLORS.dark);
  assert.equal(readStoredTheme(storage), 'dark');
  assert.equal(store.get(THEME_STORAGE_KEY), 'dark');

  assert.equal(applyTheme('light', { doc, storage, persist: true }), 'light');
  assert.equal(doc.documentElement.dataset.theme, 'light');
  assert.equal(metaContent, THEME_COLORS.light);
  assert.equal(readStoredTheme(storage), 'light');

  const blockedStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
  };
  assert.equal(readStoredTheme(blockedStorage), null);
  assert.equal(applyTheme('dark', { doc, storage: blockedStorage, persist: true }), 'dark');
  assert.equal(doc.documentElement.dataset.theme, 'dark');
});

test('both App and CausalLesson share the same theme hook and storage key', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const lesson = readFileSync(new URL('../src/CausalLesson.jsx', import.meta.url), 'utf8');
  const init = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');

  assert.match(app, /useTheme/);
  assert.match(lesson, /useTheme/);
  assert.doesNotMatch(lesson, /history-theme/);
  assert.doesNotMatch(lesson, /'day'/);
  assert.match(init, new RegExp(THEME_STORAGE_KEY));
});
