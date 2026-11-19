import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';

const pagesDir = new URL('../dist/pages/', import.meta.url);

test('Pages build packages only runtime data, active audio redirects, and 404 without PDFs or source inputs', () => {
  assert.ok(existsSync(pagesDir), 'Run npm run build:pages before testing Pages output');

  const topEntries = new Set(readdirSync(pagesDir));
  assert.ok(topEntries.has('index.html'));
  assert.ok(topEntries.has('theme-init.js'));
  assert.ok(topEntries.has('_redirects'));
  assert.ok(topEntries.has('404.html'));
  assert.ok(!topEntries.has('sources'), 'PDF sources must not be packaged for Pages');

  const dataEntries = readdirSync(new URL('data/', pagesDir)).sort();
  assert.deepEqual(dataEntries, ['china-d3.json', 'exam-questions.json', 'history-prc.json', 'history.json']);

  const audioEntries = readdirSync(new URL('audio/', pagesDir));
  assert.ok(audioEntries.includes('timeline-zh.json'));
  assert.ok(audioEntries.includes('timeline-prc-zh.json'));
  assert.ok(audioEntries.every((name) => !name.endsWith('.m4a')), 'Audio binaries should redirect rather than ship in Pages');

  const redirects = readFileSync(new URL('_redirects', pagesDir), 'utf8');
  assert.match(redirects, /^\/audio\/road-90\.m4a https?:\/\/.+\/road-90\.m4a 302$/m);
  assert.match(redirects, /^\/audio\/timeline-zh-gpt-[a-f0-9]+\.m4a https?:\/\/.+\.m4a 302$/m);
  assert.match(redirects, /^\/audio\/timeline-prc-zh-gpt-[a-f0-9]+\.m4a https?:\/\/.+\.m4a 302$/m);
});
