// Synthesize, fit, and publish the 90-second Causal Lesson (road-90.m4a) using the locally approved GPT-SoVITS voice.
// Reads src/lesson.js NARRATION verbatim without modifying the hash-pinned file.
import { readFile, writeFile, mkdir, copyFile, rename, stat } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LESSON_SECONDS, NARRATION } from '../src/lesson.js';
import { fitEventSegments } from './lib/audio-timing.mjs';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const work = resolve(project, '../output/voice-road');
const stage = join(work, 'staged');
const backend = process.env.SHIXU_GPT_SOVITS_DIR || resolve(project, '../output/voice-tools/GPT-SoVITS');
const python = process.env.SHIXU_VOICE_PYTHON || resolve(project, '../output/voice-tools/gpt-env/bin/python');
const reference = resolve(project, '../output/voice-reference/reference.wav');
const prompt = resolve(project, '../output/voice-reference/reference-prompt.txt');
const audition = resolve(project, '../output/voice-reference/ai-voice-audition.m4a');

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

const plan = NARRATION.map(([start, end, text], idx) => ({
  eventId: `road-${idx}`,
  title: `90秒样片第${idx + 1}段`,
  start,
  end,
  duration: Number((end - start).toFixed(4)),
  lines: [text],
}));

await mkdir(stage, { recursive: true });
await mkdir(join(work, 'backup'), { recursive: true });

const publish = async () => {
  const backup = join(work, 'backup', 'road-90-before-clone.m4a');
  const dest = join(project, 'public/audio/road-90.m4a');
  try {
    await stat(backup);
  } catch {
    await copyFile(dest, backup);
  }

  const audit = JSON.parse(await readFile(join(work, 'audit.json'), 'utf8'));
  const rawBytes = await readFile(join(work, 'raw-manifest.json'));
  const raw = JSON.parse(rawBytes);
  if (audit.checked !== raw.events.flatMap((e) => e.clips).length || audit.rawHash !== sha(rawBytes)) {
    throw Error('Run voice content audit against current road-90 clips before publishing');
  }
  if (audit.unresolved?.length) {
    throw Error(`Resolve flagged road-90 clips before publishing: ${audit.unresolved.join(', ')}`);
  }

  const stagedAudio = join(stage, 'road-90.m4a');
  await copyFile(stagedAudio, `${dest}.tmp`);
  await rename(`${dest}.tmp`, dest);
  console.log('Published GPT-SoVITS cloned voice for 90s lesson: public/audio/road-90.m4a');
};

if (process.argv.includes('--publish-only')) {
  await publish();
  process.exit(0);
}

await writeFile(join(work, 'plan.json'), `${JSON.stringify(plan, null, 2)}\n`);

await new Promise((ok, bad) => {
  const child = spawn(
    python,
    [
      join(project, 'scripts/render-cloned-voice.py'),
      '--backend',
      backend,
      '--plan',
      join(work, 'plan.json'),
      '--work',
      work,
      '--reference',
      reference,
      '--prompt',
      prompt,
      '--audition',
      audition,
    ],
    { cwd: backend, stdio: 'inherit' },
  );
  child.on('error', bad);
  child.on('exit', (code) => (code === 0 ? ok() : bad(Error(`Road voice renderer exited ${code}`))));
});

const rawBytes = await readFile(join(work, 'raw-manifest.json'));
const raw = JSON.parse(rawBytes);
if (raw.events.length !== plan.length) throw Error('Incomplete road-90 narration coverage');

const rate = 44100;
const parts = [];
const metrics = [];
let cursor = 0;
const fitted = join(work, 'fitted');
await mkdir(fitted, { recursive: true });

for (let i = 0; i < plan.length; i += 1) {
  const seg = plan[i];
  const clip = raw.events[i].clips[0];
  const targetSamples = i === plan.length - 1 ? LESSON_SECONDS * rate - cursor : Math.round(seg.end * rate) - cursor;
  const exactSec = targetSamples / rate;
  const fit = fitEventSegments([clip.duration], exactSec, rate);
  const file = join(fitted, `${seg.eventId}.wav`);
  execFileSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    clip.path,
    '-af',
    `atempo=${fit.tempo},aresample=${rate},apad,atrim=end_sample=${targetSamples}`,
    '-ar',
    String(rate),
    '-ac',
    '1',
    file,
  ]);
  cursor += targetSamples;
  parts.push(file);
  metrics.push({ eventId: seg.eventId, nativeDuration: fit.nativeDuration, tempo: fit.tempo, exactSec });
}

await writeFile(join(work, 'concat.txt'), parts.map((p) => `file '${p}'`).join('\n'));
const encoded = join(stage, 'road-90.m4a');
const codecArgs = process.platform === 'darwin' ? ['-c:a', 'aac_at', '-b:a', '48k'] : ['-c:a', 'aac', '-b:a', '56k'];
execFileSync('ffmpeg', [
  '-v',
  'error',
  '-y',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  join(work, 'concat.txt'),
  '-af',
  'loudnorm=I=-18:TP=-1.5:LRA=11',
  '-ar',
  String(rate),
  '-ac',
  '1',
  ...codecArgs,
  '-movflags',
  '+faststart',
  '-metadata',
  'title=史序 · 90秒因果精讲 AI合成讲解',
  encoded,
]);

const duration = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', encoded], {
    encoding: 'utf8',
  }).trim(),
);
if (cursor !== LESSON_SECONDS * rate || Math.abs(duration - LESSON_SECONDS) > 0.05) {
  throw Error(`Actual road-90 audio is ${duration}s; expected ${LESSON_SECONDS}s`);
}

console.log(
  JSON.stringify({
    staged: true,
    segments: plan.length,
    duration,
    maxTempo: Math.max(...metrics.map((m) => m.tempo)),
  }),
);
