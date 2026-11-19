import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = path.join(root, 'dist/client');
const output = path.join(root, 'dist/pages');
const mediaOrigin = (process.env.SHIXU_MEDIA_ORIGIN || 'https://media.example.com/shixu').replace(/\/+$/, '');
const narration = JSON.parse(await readFile(path.join(input, 'audio/timeline-zh.json'), 'utf8'));
const prcManifestPath = path.join(input, 'audio/timeline-prc-zh.json');
const prcNarration = existsSync(prcManifestPath) ? JSON.parse(await readFile(prcManifestPath, 'utf8')) : null;
const audioFiles = [
  'road-90.m4a',
  path.basename(narration.audio),
  ...(prcNarration ? [path.basename(prcNarration.audio)] : []),
];
const runtimeDataFiles = ['history.json', 'history-prc.json', 'china-d3.json', 'exam-questions.json'];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const name of ['index.html', 'theme-init.js', 'assets']) {
  await cp(path.join(input, name), path.join(output, name), { recursive: true });
}

// Copy only runtime data; omit build-time source inputs (china.json, places.json).
await mkdir(path.join(output, 'data'));
for (const name of runtimeDataFiles) {
  await cp(path.join(input, 'data', name), path.join(output, 'data', name));
}

await mkdir(path.join(output, 'audio'));
const audioMetaFiles = [
  'timeline-zh.json',
  path.basename(narration.captions),
  ...(prcNarration ? ['timeline-prc-zh.json', path.basename(prcNarration.captions)] : []),
];
for (const name of audioMetaFiles) {
  await cp(path.join(input, 'audio', name), path.join(output, 'audio', name));
}

// Nginx or object storage serves immutable audio with native Range support; Pages only redirects.
const redirects = await Promise.all(
  audioFiles.map(async (name) => {
    const hash = createHash('sha256')
      .update(await readFile(path.join(input, 'audio', name)))
      .digest('hex');
    return `/audio/${name} ${mediaOrigin}/${hash}/${name} 302`;
  }),
);
await writeFile(path.join(output, '_redirects'), `${redirects.join('\n')}\n`);

// Keep missing PDF requests as real 404s instead of Pages' default SPA fallback.
await writeFile(
  path.join(output, '404.html'),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>未找到页面</title><p>未找到页面。<a href="/">返回史序</a></p></html>',
);

const entries = await readdir(output);
console.log(`Prepared Pages build without PDF, source data or old audio: ${entries.join(', ')}`);
