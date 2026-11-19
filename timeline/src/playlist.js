export const PLAYLIST_KINDS = [
  { id: 'all', label: '全部时间轴' },
  { id: 'event', label: '历史事件' },
  { id: 'meeting', label: '重要会议' },
  { id: 'writing', label: '代表著作' },
  { id: 'land', label: '土地政策' },
];

export function buildPlaylist(events, kind = 'all') {
  const indices = [];
  for (let i = 0; i < events.length; i++) {
    if (kind === 'all' || events[i].kind === kind) indices.push(i);
  }
  return indices;
}

export function playlistPosition(playlist, eventIndex) {
  return playlist.indexOf(eventIndex);
}

export function nextInPlaylist(playlist, currentIndex, { loop = false } = {}) {
  if (!playlist.length) return null;
  const pos = playlist.indexOf(currentIndex);
  if (pos === -1) {
    const after = playlist.find((i) => i > currentIndex);
    if (after !== undefined) return after;
    return loop ? playlist[0] : null;
  }
  if (pos + 1 < playlist.length) return playlist[pos + 1];
  return loop ? playlist[0] : null;
}

export function prevInPlaylist(playlist, currentIndex, { loop = false } = {}) {
  if (!playlist.length) return null;
  const pos = playlist.indexOf(currentIndex);
  if (pos === -1) {
    for (let i = playlist.length - 1; i >= 0; i--) {
      if (playlist[i] < currentIndex) return playlist[i];
    }
    return loop ? playlist.at(-1) : null;
  }
  if (pos > 0) return playlist[pos - 1];
  return loop ? playlist.at(-1) : null;
}

export function chapterBounds(events, starts, chapterIndex) {
  let firstIndex = -1;
  let lastIndex = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].chapter === chapterIndex) {
      if (firstIndex === -1) firstIndex = i;
      lastIndex = i;
    }
  }
  if (firstIndex === -1) return null;
  return {
    firstIndex,
    lastIndex,
    startTime: starts[firstIndex],
    endTime: starts[lastIndex] + events[lastIndex].duration,
  };
}

export function playlistDuration(events, playlist) {
  return playlist.reduce((sum, idx) => sum + events[idx].duration, 0);
}

export function playlistElapsed(events, starts, playlist, currentIndex, currentTime) {
  let elapsed = 0;
  for (const idx of playlist) {
    if (idx === currentIndex) {
      const local = Math.max(0, Math.min(events[idx].duration, currentTime - starts[idx]));
      return elapsed + local;
    }
    elapsed += events[idx].duration;
  }
  return elapsed;
}
