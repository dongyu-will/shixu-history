/**
 * Dual-volume registry for 「史序」:
 * - modern: Volume I (1840—1949), 100 nodes, 720s audio, 5 SHA-256 hash-pinned files untouched.
 * - prc:    Volume II (1949—新时代), 36 nodes, 480s audio, lazy-loaded module.
 */
import { AUTHORED_STORIES, PLAYBACK_SECONDS, storyboardEvents } from './stories.js';
import { fallbackCaptions } from './narration.js';
import { sitePath } from './site-path.js';

export const DEFAULT_VOLUME_ID = 'modern';
export const VOLUME_ORDER = ['modern', 'prc'];

export const VOLUMES = {
  modern: {
    id: 'modern',
    shortLabel: '近代史',
    label: '中国近代史',
    range: '1840—1949',
    dataUrl: '/data/history.json',
    audioManifestUrl: '/audio/timeline-zh.json',
    chapterOffset: 0,
    totalSeconds: PLAYBACK_SECONDS,
    hasAudioTrack: true,
    nextVolumeId: 'prc',
    nextPrompt: '继续观看下篇：新中国史（1949—新时代）',
  },
  prc: {
    id: 'prc',
    shortLabel: '新中国史',
    label: '新中国史',
    range: '1949—新时代',
    dataUrl: '/data/history-prc.json',
    audioManifestUrl: '/audio/timeline-prc-zh.json',
    chapterOffset: 5,
    totalSeconds: 480,
    hasAudioTrack: true,
    nextVolumeId: null,
    nextPrompt: '',
  },
};

export function normalizeVolumeId(raw) {
  return raw && VOLUMES[raw] ? raw : DEFAULT_VOLUME_ID;
}

export function volumeIdForEvent(eventId) {
  return String(eventId || '').startsWith('prc-') ? 'prc' : 'modern';
}

export function storyTimeFor(story, event, playbackSeconds) {
  const duration = story?.duration || event.duration;
  return Math.max(0, Math.min(duration, (playbackSeconds / event.duration) * duration));
}

export function playbackTimeFor(story, event, authoredSeconds) {
  const duration = story?.duration || event.duration;
  return Math.max(0, Math.min(event.duration, (authoredSeconds / duration) * event.duration));
}

const bundleCache = new Map();

export async function loadVolumeBundle(volumeId) {
  const id = normalizeVolumeId(volumeId);
  if (bundleCache.has(id)) return bundleCache.get(id);

  const meta = VOLUMES[id];
  const promise = (async () => {
    const res = await fetch(sitePath(meta.dataUrl));
    if (!res.ok) throw new Error(`无法载入${meta.label}数据，请稍后重试。`);
    const raw = await res.json();

    if (id === 'modern') {
      const events = storyboardEvents(raw.events).map((e) => ({ ...e, volume: 'modern' }));
      return {
        meta,
        data: { ...raw, events },
        events,
        chapters: raw.chapters.map((ch, idx) => ({ ...ch, volume: 'modern', localIndex: idx, globalIndex: idx })),
        stories: AUTHORED_STORIES,
        fallbackCues: fallbackCaptions(events),
      };
    }

    const [{ PRC_STORIES, storyboardPrcEvents }, { prcFallbackCaptions }] = await Promise.all([
      import('./storyboards/prc-catalog.js'),
      import('./narration-prc.js'),
    ]);
    const events = storyboardPrcEvents(raw.events, meta.totalSeconds).map((e) => ({ ...e, volume: 'prc' }));
    return {
      meta,
      data: { ...raw, events },
      events,
      chapters: raw.chapters.map((ch, idx) => ({
        ...ch,
        volume: 'prc',
        localIndex: idx,
        globalIndex: meta.chapterOffset + idx,
      })),
      stories: PRC_STORIES,
      fallbackCues: prcFallbackCaptions(events),
    };
  })();

  bundleCache.set(id, promise);
  try {
    return await promise;
  } catch (err) {
    bundleCache.delete(id);
    throw err;
  }
}

export function getCachedBundles() {
  return bundleCache;
}
