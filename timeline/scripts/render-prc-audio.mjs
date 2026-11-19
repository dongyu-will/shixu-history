// Synthesize, fit, and publish Volume II (PRC History, 480s) using the locally approved GPT-SoVITS voice.
import { readFile, writeFile, mkdir, copyFile, rename } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRC_PLAYBACK_SECONDS, storyboardPrcEvents } from '../src/storyboards/prc-catalog.js';
import { prcNarrationPlan } from '../src/narration-prc.js';
import { fitEventSegments } from './lib/audio-timing.mjs';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const work = resolve(project, '../output/voice-prc');
const stage = join(work, 'staged');
const backend = process.env.SHIXU_GPT_SOVITS_DIR || resolve(project, '../output/voice-tools/GPT-SoVITS');
const python = process.env.SHIXU_VOICE_PYTHON || resolve(project, '../output/voice-tools/gpt-env/bin/python');
const reference = resolve(project, '../output/voice-reference/reference.wav');
const prompt = resolve(project, '../output/voice-reference/reference-prompt.txt');
const audition = resolve(project, '../output/voice-reference/ai-voice-audition.m4a');

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const trackedFiles = ['public/data/history-prc.json', 'src/storyboards/prc-catalog.js', 'src/narration-prc.js'];
const snapshot = async () =>
  Object.fromEntries(await Promise.all(trackedFiles.map(async (f) => [f, sha(await readFile(join(project, f)))])));

const prcRaw = JSON.parse(await readFile(join(project, 'public/data/history-prc.json'), 'utf8'));
const timed = storyboardPrcEvents(prcRaw.events, PRC_PLAYBACK_SECONDS);
const plan = prcNarrationPlan(timed);
const scriptHash = sha(JSON.stringify(plan));

await mkdir(stage, { recursive: true });

const vttTime = (seconds) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

const publish = async () => {
  const manifest = JSON.parse(await readFile(join(stage, 'manifest.json'), 'utf8'));
  const profile = JSON.parse(await readFile(join(project, 'scripts/approved-voice.json'), 'utf8'));
  for (const key of ['engine', 'model', 'referenceHash', 'promptHash', 'approvedAuditionHash']) {
    if (manifest.synthesis[key] !== profile[key]) {
      throw Error(`Voice differs from approved audition: ${key}`);
    }
  }
  for (const [key, value] of Object.entries(profile.parameters)) {
    if (manifest.synthesis[key] !== value) {
      throw Error(`Voice settings differ: ${key}`);
    }
  }
  manifest.voiceProfileId = profile.id;
  manifest.voiceProfileHash = sha(await readFile(join(project, 'scripts/approved-voice.json')));

  if (manifest.scriptHash !== scriptHash || JSON.stringify(manifest.contentHashes) !== JSON.stringify(await snapshot())) {
    throw Error('PRC source content changed; rebuild before switching audio');
  }
  if (
    manifest.synthesis.approvedAuditionHash !== sha(await readFile(audition)) ||
    manifest.synthesis.referenceHash !== sha(await readFile(reference))
  ) {
    throw Error('Approved voice reference changed');
  }

  const audio = join(stage, 'timeline-prc.m4a');
  if (sha(await readFile(audio)) !== manifest.audioHash) {
    throw Error('Staged PRC audio hash mismatch');
  }

  const audit = JSON.parse(await readFile(join(work, 'audit.json'), 'utf8'));
  const raw = JSON.parse(await readFile(join(work, 'raw-manifest.json'), 'utf8'));
  if (
    audit.checked !== raw.events.flatMap((e) => e.clips).length ||
    audit.rawHash !== sha(await readFile(join(work, 'raw-manifest.json')))
  ) {
    throw Error('Run voice content audit against current PRC clips before publishing');
  }
  if (manifest.rawManifestHash !== audit.rawHash) {
    throw Error('Rebuild aligned PRC audio after regenerating spoken clips');
  }
  if (audit.unresolved?.length) {
    throw Error(`Resolve flagged PRC narration clips before publishing: ${audit.unresolved.join(', ')}`);
  }

  const publicAudio = join(project, 'public/audio');
  for (const [src, url] of [
    ['timeline-prc.m4a', manifest.audio],
    ['timeline-prc.vtt', manifest.captions],
  ]) {
    const dest = join(publicAudio, basename(url));
    await copyFile(join(stage, src), `${dest}.tmp`);
    await rename(`${dest}.tmp`, dest);
  }
  const target = join(publicAudio, 'timeline-prc-zh.json');
  await writeFile(`${target}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(`${target}.tmp`, target);
  console.log(`Published PRC cloned voice: ${manifest.duration}s, ${manifest.cues.length} aligned captions.`);
};

if (process.argv.includes('--publish-only')) {
  await publish();
  process.exit(0);
}

const before = await snapshot();
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
  child.on('exit', (code) => (code === 0 ? ok() : bad(Error(`PRC voice renderer exited ${code}`))));
});

const rawBytes = await readFile(join(work, 'raw-manifest.json'));
const raw = JSON.parse(rawBytes);
if (raw.events.length !== plan.length) throw Error('Incomplete PRC narration coverage');

const rate = 44100;
const cues = [];
const parts = [];
const metrics = [];
let cursor = 0;
const fitted = join(work, 'fitted');
await mkdir(fitted, { recursive: true });

for (let i = 0; i < plan.length; i += 1) {
  const event = plan[i];
  const clips = raw.events[i].clips;
  if (
    raw.events[i].eventId !== event.eventId ||
    JSON.stringify(clips.map((c) => c.text)) !== JSON.stringify(event.lines)
  ) {
    throw Error(`Changed or missing PRC words: ${event.eventId}`);
  }
  const fit = fitEventSegments(
    clips.map((c) => c.duration),
    event.duration,
    rate,
  );
  for (let j = 0; j < clips.length; j += 1) {
    const clip = clips[j];
    const file = join(fitted, `${event.eventId}-${j}.wav`);
    const samples = fit.samples[j];
    // Resample BEFORE trimming by sample count so total audio equals exact 480.000s.
    execFileSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-i',
      clip.path,
      '-af',
      `atempo=${fit.tempo},aresample=${rate},apad,atrim=end_sample=${samples}`,
      '-ar',
      String(rate),
      '-ac',
      '1',
      file,
    ]);
    cues.push({
      eventId: event.eventId,
      start: cursor / rate,
      end: (cursor + samples) / rate,
      text: clip.text,
    });
    cursor += samples;
    parts.push(file);
  }
  metrics.push({
    eventId: event.eventId,
    nativeDuration: fit.nativeDuration,
    tempo: fit.tempo,
    outputSamples: fit.totalSamples,
    clips: clips.map((c) => ({
      id: c.id,
      rawHash: c.audioHash,
      seed: c.seed,
      nativeDuration: c.duration,
    })),
  });
}

await writeFile(join(work, 'concat.txt'), parts.map((p) => `file '${p}'`).join('\n'));
const encoded = join(stage, 'timeline-prc.m4a');
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
  'title=史序 · 新中国史 AI合成讲解',
  encoded,
]);

const duration = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', encoded], {
    encoding: 'utf8',
  }).trim(),
);
if (cursor !== PRC_PLAYBACK_SECONDS * rate || Math.abs(duration - PRC_PLAYBACK_SECONDS) > 0.05) {
  throw Error(`Actual PRC audio is ${duration}s; expected ${PRC_PLAYBACK_SECONDS}s`);
}
if (JSON.stringify(before) !== JSON.stringify(await snapshot())) {
  throw Error('PRC source content changed during synthesis');
}

const audioHash = sha(await readFile(encoded));
const stem = `timeline-prc-zh-gpt-${audioHash.slice(0, 16)}`;
const manifest = {
  version: 1,
  audio: `/audio/${stem}.m4a`,
  audioHash,
  captions: `/audio/${stem}.vtt`,
  duration: PRC_PLAYBACK_SECONDS,
  voice: 'approved-cloned-voice',
  rawManifestHash: sha(rawBytes),
  engine: 'GPT-SoVITS',
  model: 'v2ProPlus',
  disclosure: 'AI合成讲解，采用已确认试听音色；不代表参考声音作者本人讲述或认可。',
  referenceSource: 'https://www.bilibili.com/video/BV1YxmWBzEYL/',
  scriptHash,
  synthesis: raw.recipe,
  contentHashes: before,
  cues,
  metrics,
};

await writeFile(
  join(stage, 'timeline-prc.vtt'),
  `WEBVTT\n\n${cues.map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n')}`,
);
await writeFile(join(stage, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify({
    staged: true,
    events: plan.length,
    cues: cues.length,
    duration,
    maxTempo: Math.max(...metrics.map((m) => m.tempo)),
    audioHash,
  }),
);
