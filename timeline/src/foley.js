export const SFX_STORAGE_KEY = 'shixu-sfx';

const CONVERGENCE_MODES = new Set(['geography', 'rendezvous', 'union']);

let sfxEnabled = true;
let audioCtx = null;
let paperNoiseBuffer = null;

export function readSfxPreference(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(SFX_STORAGE_KEY);
    if (raw === null || raw === undefined) return true;
    const normalized = String(raw).trim().toLowerCase();
    if (normalized === 'false' || normalized === '0' || normalized === 'off') return false;
    if (normalized === 'true' || normalized === '1' || normalized === 'on') return true;
    return true;
  } catch {
    return true;
  }
}

export function writeSfxPreference(enabled, storage = globalThis.localStorage) {
  const value = Boolean(enabled);
  try {
    storage?.setItem?.(SFX_STORAGE_KEY, String(value));
  } catch {
    // Keep session toggle functional when storage is unavailable or blocked.
  }
  return value;
}

export function setSfxEnabled(enabled) {
  sfxEnabled = Boolean(enabled);
  return sfxEnabled;
}

export function isSfxEnabled() {
  return sfxEnabled;
}

/**
 * Pure cue classifier for storyboard beat transitions.
 * - Final beat -> 'stamp' (archival seal conclusion)
 * - Middle geographic or convergence beat -> 'ripple'
 * - Opening or normal structural beat -> 'beat'
 */
export function cueForBeat(story, beatIndex) {
  if (!story || !Array.isArray(story.beats) || story.beats.length === 0) return 'beat';
  if (typeof beatIndex !== 'number' || !Number.isFinite(beatIndex) || beatIndex < 0) return 'beat';
  const lastIndex = story.beats.length - 1;
  if (beatIndex >= lastIndex) return 'stamp';
  if (beatIndex > 0 && (CONVERGENCE_MODES.has(story.mode) || story.kind === 'autumn')) {
    return 'ripple';
  }
  return 'beat';
}

function resolveEnabled(options) {
  if (typeof options === 'boolean') return options;
  if (options && typeof options.enabled === 'boolean') return options.enabled;
  return sfxEnabled;
}

function isReducedMotion(options) {
  if (options && typeof options.reducedMotion === 'boolean') return options.reducedMotion;
  try {
    return Boolean(globalThis.window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function getAudioContext() {
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (typeof AudioCtx !== 'function') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioCtx();
      paperNoiseBuffer = null;
    }
    if (audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function getPaperNoiseBuffer(ctx) {
  if (paperNoiseBuffer && paperNoiseBuffer.sampleRate === ctx.sampleRate) {
    return paperNoiseBuffer;
  }
  const sampleRate = ctx.sampleRate || 44100;
  const length = Math.max(1, Math.floor(sampleRate * 0.09));
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channel = buffer.getChannelData(0);
  // Gentle 1-pole smoothed noise with tapered ends for warm cotton-paper texture.
  let prev = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    prev = prev * 0.62 + white * 0.38;
    const env = Math.sin((Math.PI * i) / length);
    channel[i] = prev * env;
  }
  paperNoiseBuffer = buffer;
  return buffer;
}

function prepareContext(options) {
  if (!resolveEnabled(options) || isReducedMotion(options)) return null;
  return getAudioContext();
}

/** Soft warm paper-turn / subtle filtered noise brush (~70ms, peak gain ~0.07). */
export function playBeat(options) {
  const ctx = prepareContext(options);
  if (!ctx) return false;
  try {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = getPaperNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.frequency.exponentialRampToValueAtTime(760, now + 0.07);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.068, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.072);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    src.start(now);
    src.stop(now + 0.08);
    return true;
  } catch {
    return false;
  }
}

/** Muted documentary wooden/cinnabar seal thud (~140ms, 135Hz -> 62Hz + 18ms transient, peak gain ~0.12). */
export function playStamp(options) {
  const ctx = prepareContext(options);
  if (!ctx) return false;
  try {
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.115);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.linearRampToValueAtTime(0.11, now + 0.007);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    const clickSrc = ctx.createBufferSource();
    clickSrc.buffer = getPaperNoiseBuffer(ctx);

    const clickFilter = ctx.createBiquadFilter();
    clickFilter.type = 'bandpass';
    clickFilter.frequency.setValueAtTime(1800, now);
    clickFilter.Q.setValueAtTime(1.6, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.linearRampToValueAtTime(0.032, now + 0.003);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

    clickSrc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickSrc.start(now);
    clickSrc.stop(now + 0.024);
    return true;
  } catch {
    return false;
  }
}

/** Soft crystalline harmonic ping (triangle/sine 520Hz + 780Hz, ~190ms, peak gain ~0.05). */
export function playRipple(options) {
  const ctx = prepareContext(options);
  if (!ctx) return false;
  try {
    const now = ctx.currentTime;

    const fundamental = ctx.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.setValueAtTime(520, now);

    const fundGain = ctx.createGain();
    fundGain.gain.setValueAtTime(0.0001, now);
    fundGain.gain.linearRampToValueAtTime(0.032, now + 0.012);
    fundGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);

    fundamental.connect(fundGain);
    fundGain.connect(ctx.destination);
    fundamental.start(now);
    fundamental.stop(now + 0.2);

    const overtone = ctx.createOscillator();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(780, now);

    const overGain = ctx.createGain();
    overGain.gain.setValueAtTime(0.0001, now);
    overGain.gain.linearRampToValueAtTime(0.018, now + 0.01);
    overGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.165);

    overtone.connect(overGain);
    overGain.connect(ctx.destination);
    overtone.start(now);
    overtone.stop(now + 0.18);
    return true;
  } catch {
    return false;
  }
}

/** Calm resonant bell-tone cue (~240ms, 440Hz + 660Hz, peak gain ~0.08) for the 90s lesson decision pause & feedback. */
export function playGate(options) {
  const ctx = prepareContext(options);
  if (!ctx) return false;
  try {
    const now = ctx.currentTime;

    const base = ctx.createOscillator();
    base.type = 'sine';
    base.frequency.setValueAtTime(440, now);

    const baseGain = ctx.createGain();
    baseGain.gain.setValueAtTime(0.0001, now);
    baseGain.gain.linearRampToValueAtTime(0.052, now + 0.014);
    baseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    base.connect(baseGain);
    baseGain.connect(ctx.destination);
    base.start(now);
    base.stop(now + 0.25);

    const fifth = ctx.createOscillator();
    fifth.type = 'triangle';
    fifth.frequency.setValueAtTime(660, now);

    const fifthGain = ctx.createGain();
    fifthGain.gain.setValueAtTime(0.0001, now);
    fifthGain.gain.linearRampToValueAtTime(0.026, now + 0.012);
    fifthGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);

    fifth.connect(fifthGain);
    fifthGain.connect(ctx.destination);
    fifth.start(now);
    fifth.stop(now + 0.22);
    return true;
  } catch {
    return false;
  }
}

export function playCue(cue, options) {
  if (cue === 'stamp') return playStamp(options);
  if (cue === 'ripple') return playRipple(options);
  if (cue === 'gate') return playGate(options);
  return playBeat(options);
}
