import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowsOut,
  BookOpen,
  Books,
  CaretRight,
  Check,
  ClosedCaptioning,
  Compass,
  Exam,
  Eye,
  EyeSlash,
  FileText,
  FilmStrip,
  Flag,
  GithubLogo,
  Headphones,
  List,
  MagnifyingGlass,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  Scales,
  Scroll,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  SpeakerHigh,
  SpeakerSlash,
  Stack,
  Sun,
  Waveform,
  X,
} from '@phosphor-icons/react';
import { ChapterIntertitle } from './ChapterIntertitle.jsx';
import { ClozeText } from './ClozeText.jsx';
import { getSceneAtmosphere } from './EraAtmosphere.js';
import { EraCanvas } from './EraCanvas.jsx';
import { KineticCopy } from './KineticCopy.jsx';
import { MapScene } from './MapScene.jsx';
import { PILOT_STAGE_LIST, StageCinema, getPilotStage } from './StageCinema.jsx';
import { YearRoll } from './YearRoll.jsx';
import {
  cueForBeat,
  playCue,
  readSfxPreference,
  setSfxEnabled,
  writeSfxPreference,
} from './foley.js';

const CausalLesson = lazy(() =>
  import('./CausalLesson.jsx').then((m) => ({ default: m.CausalLesson })),
);
const ConfusionCompare = lazy(() =>
  import('./ConfusionCompare.jsx').then((m) => ({ default: m.ConfusionCompare })),
);
const ExamPractice = lazy(() =>
  import('./ExamPractice.jsx').then((m) => ({ default: m.ExamPractice })),
);
import { captionAt } from './narration.js';
import {
  buildPlaylist,
  chapterBounds,
  nextInPlaylist,
  playlistDuration,
  playlistPosition,
  prevInPlaylist,
} from './playlist.js';
import { REPO } from './repo.js';
import { sitePath } from './site-path.js';
import { beatAt } from './stories.js';
import {
  DEFAULT_VOLUME_ID,
  VOLUMES,
  VOLUME_ORDER,
  loadVolumeBundle,
  normalizeVolumeId,
  playbackTimeFor,
  storyTimeFor,
  volumeIdForEvent,
} from './volumes.js';
import {
  dueQuestionIds,
  emptyStudyState,
  exportStudyBackup,
  importStudyBackup,
  readStudyState,
  recordQuestionAttempt,
  searchEvents,
  setNodeMastery,
  writeStudyState,
} from './study-store.js';
import { useTheme } from './theme.js';
import { useNarration } from './useNarration.jsx';
import './styles.css';
import './study.css';

const TYPES = {
  event: { label: '历史事件', color: 'var(--ui-tone-event)', Icon: Flag },
  meeting: { label: '重要会议', color: 'var(--ui-tone-meeting)', Icon: BookOpen },
  writing: { label: '代表著作', color: 'var(--ui-tone-writing)', Icon: Books },
  land: { label: '土地政策', color: 'var(--ui-tone-land)', Icon: Scroll },
};

const MASTERY_OPTIONS = [
  { id: 'known', label: '已掌握' },
  { id: 'fuzzy', label: '有点模糊' },
  { id: 'forgot', label: '需要再练' },
];

const MASTERY_FILTER_LABELS = [
  { id: 'all', label: '全部状态' },
  { id: 'review', label: '待巩固' },
  { id: 'unmarked', label: '未标记' },
  { id: 'known', label: '已掌握' },
];

// Temporarily hide attribution controls at the user's request; retain source data.
const SHOW_SOURCE_METADATA = false;
const WALKMAN_KEY = 'shixu-walkman';

const formatClock = (seconds) =>
  `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

const sourcePages = (e) => e.pages.map((p) => `第${p}页`).join('、');

const readableDate = (e) => {
  const m = e.dateLabel.match(/^(\d{4})[.、](\d{1,2})(?:[.、](\d{1,2}))?$/);
  return m ? `${m[1]}年${m[2]}月${m[3] ? `${m[3]}日` : ''}` : e.dateLabel;
};

function readBoolPref(key, fallback = false) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

function HistoryExperience({
  geography,
  volumeId,
  bundle,
  allBundles,
  onSwitchVolume,
  pendingNav,
  onConsumePendingNav,
}) {
  const { data, events, stories, fallbackCues, meta } = bundle;
  const allEvents = useMemo(() => {
    const modernEvs = allBundles.modern?.events || [];
    const prcEvs = allBundles.prc?.events || [];
    const combined = [...modernEvs, ...prcEvs];
    return combined.length ? combined : events;
  }, [allBundles, events]);
  const allChapters = useMemo(() => {
    const modernCh = allBundles.modern?.chapters || [];
    const prcCh = allBundles.prc?.chapters || [];
    const combined = [...modernCh, ...prcCh];
    return combined.length ? combined : bundle.chapters;
  }, [allBundles, bundle.chapters]);
  const allStories = useMemo(
    () => ({
      ...(allBundles.modern?.stories || {}),
      ...(allBundles.prc?.stories || {}),
      ...stories,
    }),
    [allBundles, stories],
  );
  const allEventIds = useMemo(() => new Set(allEvents.map((e) => e.id)), [allEvents]);

  const initialId = new URLSearchParams(location.search).get('event') || events[0].id;
  const initialIndex = Math.max(
    0,
    events.findIndex((e) => e.id === initialId),
  );
  const starts = useMemo(() => {
    let t = 0;
    return events.map((e) => {
      const s = t;
      t += e.duration;
      return s;
    });
  }, [events]);
  const total = Math.round((starts.at(-1) + events.at(-1).duration) * 10) / 10;

  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [overview, setOverview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panel, setPanel] = useState(null);
  const [detailId, setDetailId] = useState(events[initialIndex].id);
  const [detailTab, setDetailTab] = useState('summary');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');
  const [clozeMasked, setClozeMasked] = useState(true);
  const [clozeRevealed, setClozeRevealed] = useState({});
  const [fullScreen, setFullScreen] = useState(false);
  const [notice, setNotice] = useState('');
  const [theme, toggleTheme] = useTheme();
  const [beatIndex, setBeatIndex] = useState(0);
  const [nextVolDismissed, setNextVolDismissed] = useState(false);
  const [stageView, setStageView] = useState('cinema');
  const [reduceMotion, setReduceMotion] = useState(() =>
    Boolean(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
  );

  useEffect(() => {
    const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
    if (!media) return undefined;
    const sync = () => setReduceMotion(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Study upgrade states: topic playlist, loop, walkman background audio, exam bank, mastery.
  const [playlistKind, setPlaylistKind] = useState('all');
  const [loopMode, setLoopMode] = useState(false);
  const [backgroundAudio, setBackgroundAudio] = useState(() => readBoolPref(WALKMAN_KEY, false));
  const [sfx, setSfx] = useState(() => readSfxPreference());
  const [returnContext, setReturnContext] = useState(null);
  const [compareResume, setCompareResume] = useState(null);
  const [examResume, setExamResume] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [analysisQuestions, setAnalysisQuestions] = useState([]);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState('');
  const [examSubmitted, setExamSubmitted] = useState({});
  const [studyState, setStudyState] = useState(() => readStudyState(globalThis.localStorage, null, allEventIds).state);

  const beatRef = useRef(0);
  const lastFoleyKeyRef = useRef(`${events[initialIndex].id}:0`);
  const lastFoleyAtRef = useRef(0);
  const manualSeekUntilRef = useRef(0);
  const clock = useRef({ time: starts[initialIndex] });
  const indexRef = useRef(index);
  const prevVolumeRef = useRef(volumeId);
  const safeIndex = Math.min(index, events.length - 1);
  indexRef.current = safeIndex;
  const animationRef = useRef(null);
  const storyController = useRef(null);
  const cinemaController = useRef(null);
  const progressRef = useRef(null);
  const sliderRef = useRef(null);
  const elapsedRef = useRef(null);
  const dialogRef = useRef(null);

  const playlist = useMemo(() => buildPlaylist(events, playlistKind), [events, playlistKind]);
  const playlistSet = useMemo(() => new Set(playlist), [playlist]);
  const playlistTotalSeconds = useMemo(() => playlistDuration(events, playlist), [events, playlist]);
  const playlistPos = useMemo(() => playlistPosition(playlist, safeIndex), [playlist, safeIndex]);

  const narration = useNarration({
    clock,
    playing,
    rate,
    onNotice: setNotice,
    manifestUrl: meta.audioManifestUrl,
  });
  const captions = narration.manifest?.cues || fallbackCues;
  const [captionIndex, setCaptionIndex] = useState(-1);
  const captionRef = useRef(-1);

  const scene = events[safeIndex];
  const detail = allEvents.find((e) => e.id === detailId) || scene;
  const type = TYPES[scene.kind];
  const authored = stories[scene.id];
  const currentBeat = authored?.beats[Math.min(beatIndex, authored.beats.length - 1)];
  const activeCaption = captions[captionIndex];
  const pilotStage = getPilotStage(scene.id);
  const cinemaActive = Boolean(pilotStage && !overview && stageView === 'cinema');
  const sceneAtmosphere = useMemo(
    () => getSceneAtmosphere({ volumeId, scene, authored }),
    [volumeId, scene, authored],
  );

  const questionIds = useMemo(() => new Set(examQuestions.map((q) => q.id)), [examQuestions]);
  const dueIds = useMemo(() => dueQuestionIds(studyState, examQuestions), [studyState, examQuestions]);

  // Load curated exam questions & Q36 analysis skeletons asynchronously without blocking initial map paint.
  useEffect(() => {
    let alive = true;
    fetch(sitePath('/data/exam-questions.json'))
      .then((res) => {
        if (!res.ok) throw new Error(`真题库载入失败：${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (!alive) return;
        const list = Array.isArray(payload.questions) ? payload.questions : [];
        const analysis = Array.isArray(payload.analysisQuestions) ? payload.analysisQuestions : [];
        setExamQuestions(list);
        setAnalysisQuestions(analysis);
        const validQ = new Set(list.map((q) => q.id));
        const restored = readStudyState(globalThis.localStorage, validQ, allEventIds);
        setStudyState(restored.state);
        if (restored.error) setNotice(restored.error);
      })
      .catch((err) => {
        if (alive) setExamError(err.message);
      })
      .finally(() => {
        if (alive) setExamLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [allEventIds]);

  const persistStudy = useCallback((updater) => {
    setStudyState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeStudyState(next);
      return next;
    });
  }, []);

  const handleRecordAttempt = useCallback(
    (question, answer, opts) => {
      let recorded = null;
      persistStudy((prev) => {
        const next = recordQuestionAttempt(prev, question, answer, opts);
        recorded = next.attempts.at(-1);
        return next;
      });
      return recorded;
    },
    [persistStudy],
  );

  const handleSetMastery = useCallback(
    (eventId, level) => {
      persistStudy((prev) => {
        const nextLevel = prev.mastery[eventId]?.level === level ? null : level;
        return setNodeMastery(prev, eventId, nextLevel);
      });
    },
    [persistStudy],
  );

  const handleExportBackup = useCallback(() => {
    const content = exportStudyBackup(studyState);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shixu-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [studyState]);

  const handleImportBackup = useCallback(
    (jsonText) => {
      let summary = null;
      persistStudy((prev) => {
        const result = importStudyBackup(jsonText, prev, questionIds, allEventIds);
        summary = result.summary;
        return result.state;
      });
      return summary;
    },
    [persistStudy, questionIds, allEventIds],
  );

  const handleResetStudy = useCallback(() => {
    persistStudy(emptyStudyState());
    setExamSubmitted({});
  }, [persistStudy]);

  const paintTime = useCallback(() => {
    const time = clock.current.time;
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${time / total})`;
    const stamp = formatClock(time);
    if (sliderRef.current) {
      const value = time.toFixed(1);
      const label = `${stamp}，当前${events[indexRef.current].title}`;
      if (Number(sliderRef.current.value) !== Number(value)) sliderRef.current.value = value;
      if (sliderRef.current.getAttribute('aria-valuetext') !== label) {
        sliderRef.current.setAttribute('aria-valuetext', label);
      }
    }
    if (elapsedRef.current && elapsedRef.current.textContent !== stamp) {
      elapsedRef.current.textContent = stamp;
    }
    const active = events[indexRef.current];
    if (!active) return;
    const activeStory = stories[active.id];
    const local = storyTimeFor(activeStory, active, time - starts[indexRef.current]);
    const media = narration.audioRef.current;
    const advancing =
      playing &&
      (!narration.voice ||
        !narration.manifest ||
        (media && !media.paused && !media.seeking && media.readyState >= 3));
    if (storyController.current?.id === active.id) {
      storyController.current.seek(local, {
        playing: advancing,
        rate: (rate * (activeStory?.duration || active.duration)) / active.duration,
      });
    }
    if (cinemaController.current?.id === active.id) {
      cinemaController.current.seek(local, {
        playing: advancing,
      });
    }
    const nextBeat = beatAt(activeStory, local);
    if (nextBeat !== beatRef.current) {
      beatRef.current = nextBeat;
      setBeatIndex(nextBeat);
    }
    const nextCaption = captionAt(captions, time);
    if (nextCaption !== captionRef.current) {
      captionRef.current = nextCaption;
      setCaptionIndex(nextCaption);
    }
  }, [
    total,
    events,
    stories,
    starts,
    captions,
    playing,
    rate,
    narration.voice,
    narration.manifest,
    narration.audioRef,
  ]);

  const seek = useCallback(
    (time, pause = false) => {
      const bounded = Math.min(total, Math.max(0, time));
      clock.current.time = bounded;
      narration.syncSeek(bounded);
      const next = Math.max(0, starts.findLastIndex((s) => s <= bounded));
      if (next === indexRef.current && animationRef.current) {
        animationRef.current.currentTime = Math.min(
          events[next].duration * 1000,
          (bounded - starts[next]) * 1000,
        );
      }
      indexRef.current = next;
      setIndex(next);
      if (pause || bounded === total) setPlaying(false);
      paintTime();
    },
    [total, starts, events, paintTime, narration.syncSeek],
  );

  const selectEvent = useCallback(
    (id, pause = true) => {
      const targetVol = volumeIdForEvent(id);
      if (targetVol !== volumeId) {
        onSwitchVolume(targetVol, id, !pause);
        return;
      }
      const next = events.findIndex((e) => e.id === id);
      if (next !== -1) seek(starts[next], pause);
    },
    [volumeId, onSwitchVolume, events, starts, seek],
  );

  const step = useCallback(
    (delta) => {
      if (playlistKind !== 'all') {
        const target =
          delta > 0
            ? nextInPlaylist(playlist, indexRef.current, { loop: loopMode })
            : prevInPlaylist(playlist, indexRef.current, { loop: loopMode });
        if (target !== null) seek(starts[target]);
        return;
      }
      const i = Math.max(0, Math.min(events.length - 1, indexRef.current + delta));
      seek(starts[i]);
    },
    [playlistKind, playlist, loopMode, starts, events.length, seek],
  );

  const toggle = useCallback(() => {
    if (playlistKind !== 'all' && !playlistSet.has(indexRef.current)) {
      seek(starts[playlist[0]], false);
      setPlaying(true);
      return;
    }
    if (clock.current.time >= total) seek(0);
    setPlaying((v) => !v);
  }, [playlistKind, playlistSet, playlist, starts, total, seek]);

  const enforcePlaybackBoundary = useCallback(() => {
    const cur = indexRef.current;
    const sceneEnd = starts[cur] + events[cur].duration;
    if (playlistKind !== 'all') {
      if (clock.current.time >= sceneEnd - 0.05) {
        const nextIdx = nextInPlaylist(playlist, cur, { loop: loopMode });
        if (nextIdx !== null) {
          seek(starts[nextIdx], false);
          return true;
        }
        seek(sceneEnd, true);
        return true;
      }
      return false;
    }
    if (loopMode) {
      const bounds = chapterBounds(events, starts, events[cur].chapter);
      if (bounds && clock.current.time >= bounds.endTime - 0.05) {
        seek(bounds.startTime, false);
        return true;
      }
    }
    return false;
  }, [events, starts, playlistKind, playlist, loopMode, seek]);

  const startPlaylist = useCallback(
    (nextKind) => {
      setPlaylistKind(nextKind);
      const nextList = buildPlaylist(events, nextKind);
      if (nextList.length) {
        const startIdx = nextList.includes(indexRef.current) ? indexRef.current : nextList[0];
        seek(starts[startIdx], false);
        setPlaying(true);
      }
      setPanel(null);
    },
    [events, starts, seek],
  );

  const toggleWalkman = useCallback(() => {
    setBackgroundAudio((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WALKMAN_KEY, String(next));
      } catch {
        // Keep current session switchable if storage is unavailable.
      }
      setNotice(
        next
          ? '已开启随身听：切后台或锁屏将继续播放配音，支持耳机切幕。'
          : '已关闭随身听：切换标签页或锁屏将自动暂停。',
      );
      return next;
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setSfx((prev) => {
      const next = writeSfxPreference(!prev);
      setSfxEnabled(next);
      return next;
    });
  }, []);

  const inspectOnMap = useCallback(
    (eventId, context) => {
      setPlaylistKind('all');
      if (context.compareState) setCompareResume(context.compareState);
      if (context.examState) setExamResume(context.examState);
      setReturnContext({ panel: context.panel, label: context.label });
      setPanel(null);
      const targetVol = volumeIdForEvent(eventId);
      if (targetVol !== volumeId) {
        onSwitchVolume(targetVol, eventId, true);
        return;
      }
      selectEvent(eventId, false);
      setPlaying(true);
    },
    [volumeId, onSwitchVolume, selectEvent],
  );

  // Sync clock, index, URL, and document title when switching volumes or fulfilling a cross-volume jump.
  useEffect(() => {
    const volumeChanged = prevVolumeRef.current !== volumeId;
    const hasPendingForHere = pendingNav && pendingNav.volumeId === volumeId;
    if (!volumeChanged && !hasPendingForHere) return;
    prevVolumeRef.current = volumeId;

    const targetId = hasPendingForHere ? pendingNav.eventId : null;
    const autoPlay = hasPendingForHere ? Boolean(pendingNav.autoPlay) : false;
    if (hasPendingForHere) onConsumePendingNav();

    const nextIdx = targetId ? Math.max(0, events.findIndex((e) => e.id === targetId)) : 0;
    const nextStart = starts[nextIdx] ?? 0;
    setPlaylistKind('all');
    setNextVolDismissed(false);
    setOverview(false);
    clock.current.time = nextStart;
    indexRef.current = nextIdx;
    beatRef.current = 0;
    captionRef.current = -1;
    setIndex(nextIdx);
    setDetailId(events[nextIdx].id);
    setBeatIndex(0);
    setCaptionIndex(-1);
    lastFoleyKeyRef.current = `${events[nextIdx].id}:0`;
    manualSeekUntilRef.current = performance.now() + 300;
    narration.syncSeek(nextStart);
    setPlaying(autoPlay);
    paintTime();
  }, [volumeId, pendingNav, onConsumePendingNav, events, starts, narration.syncSeek, paintTime]);

  useEffect(() => {
    document.title = `史序 · ${meta.label}（${meta.range}）`;
  }, [meta.label, meta.range]);

  useEffect(() => {
    paintTime();
  }, [safeIndex, paintTime]);

  useEffect(() => {
    setSfxEnabled(sfx);
  }, [sfx]);

  useEffect(() => {
    const key = `${scene.id}:${beatIndex}`;
    if (!playing) {
      lastFoleyKeyRef.current = key;
      return;
    }
    if (key === lastFoleyKeyRef.current) return;
    lastFoleyKeyRef.current = key;
    const now = performance.now();
    if (!sfx || now < manualSeekUntilRef.current || now - lastFoleyAtRef.current < 220) return;
    lastFoleyAtRef.current = now;
    playCue(cueForBeat(authored, beatIndex), { enabled: sfx });
  }, [playing, scene.id, beatIndex, authored, sfx]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const currentEvent = url.searchParams.get('event');
      const currentVol = url.searchParams.get('vol');
      const desiredVol = volumeId === DEFAULT_VOLUME_ID ? null : volumeId;
      if (volumeId === DEFAULT_VOLUME_ID && scene.id === 'e-1' && !currentEvent && !currentVol) return;
      if (currentEvent === scene.id && currentVol === desiredVol) return;
      if (desiredVol) url.searchParams.set('vol', desiredVol);
      else url.searchParams.delete('vol');
      url.searchParams.set('event', scene.id);
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Ignore history restrictions in sandboxed environments.
    }
  }, [volumeId, scene.id]);

  // Main animation/audio master clock loop
  useEffect(() => {
    if (!playing) return;
    let frame;
    let previous = performance.now();
    const tick = (now) => {
      const delta = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      const media = narration.audioRef.current;
      const audioMaster = narration.voice && narration.manifest && media;
      // Metadata can exist while a chapter seek is still pending. Reading the
      // media's old time here would reset the requested chapter to the start.
      const nextTime = audioMaster
        ? media.readyState >= 2 && !media.seeking
          ? media.currentTime
          : clock.current.time
        : clock.current.time + delta * rate;
      clock.current.time = Math.min(total, nextTime);
      if (enforcePlaybackBoundary()) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const next = Math.max(0, starts.findLastIndex((s) => s <= clock.current.time));
      if (next !== indexRef.current) {
        indexRef.current = next;
        setIndex(next);
      }
      paintTime();
      if (clock.current.time >= total) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    playing,
    rate,
    total,
    starts,
    paintTime,
    enforcePlaybackBoundary,
    narration.voice,
    narration.manifest,
    narration.audioRef,
  ]);

  // Media Session integration for lock-screen / headphone controls in Walkman & normal playback
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      if (typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `${scene.year}年 · ${scene.title}`,
          artist: `史序 · ${meta.label}`,
          album:
            playlistKind === 'all'
              ? data.chapters[scene.chapter]?.title || meta.label
              : `专题连播 · ${TYPES[playlistKind].label}`,
        });
      }
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
      navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
    } catch {
      // Some embedded webviews partially expose mediaSession; degrade quietly.
    }
  }, [scene, playing, playlistKind, data.chapters, step]);

  useEffect(() => {
    const handler = (e) => {
      if (
        dialogRef.current?.open ||
        /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(e.target.tagName) ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        step(1);
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        step(-1);
      }
    };
    const visibility = () => {
      if (document.hidden) {
        if (!backgroundAudio) setPlaying(false);
        return;
      }
      // Returning to foreground in Walkman mode: snap map & clock to current audio time.
      const media = narration.audioRef.current;
      if (backgroundAudio && playing && narration.voice && media && media.readyState >= 2) {
        clock.current.time = Math.min(total, media.currentTime);
        const next = Math.max(0, starts.findLastIndex((s) => s <= clock.current.time));
        if (next !== indexRef.current) {
          indexRef.current = next;
          setIndex(next);
        }
        paintTime();
      }
    };
    const fs = () => setFullScreen(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', handler);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fs);
    return () => {
      window.removeEventListener('keydown', handler);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fs);
    };
  }, [toggle, step, backgroundAudio, playing, narration.voice, narration.audioRef, total, starts, paintTime]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel && !dialog.open) dialog.showModal();
    else if (!panel && dialog.open) dialog.close();
  }, [panel]);

  // Fallback for browsers without <dialog closedby="any"> support (e.g. Safari):
  // require both pointerdown and pointerup outside the dialog bounding box.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const isOutside = (e) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };
    let pressedOutside = false;
    const onDown = (e) => {
      pressedOutside = dialog.open && isOutside(e);
    };
    const onUp = (e) => {
      if (pressedOutside && dialog.open && isOutside(e)) dialog.close();
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, []);

  const openDetails = (id = scene.id, tab = 'summary') => {
    setPlaying(false);
    setDetailId(id);
    setDetailTab(tab);
    setClozeMasked(true);
    setClozeRevealed({});
    setPanel('detail');
  };
  const openDirectory = () => {
    setPlaying(false);
    setPanel('directory');
  };
  const openCompare = () => {
    setPlaying(false);
    setPanel('compare');
  };
  const openExam = () => {
    setPlaying(false);
    setPanel('exam');
  };
  const full = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice('当前浏览器未开启全屏，可使用浏览器的全屏功能。');
    }
  };

  const chapterStarts = data.chapters.map((c, i) => {
    const n = events.findIndex((e) => e.chapter === i);
    return { ...c, index: n, time: starts[n] };
  });
  const related = events
    .filter((e) => e.id !== detail.id && Math.abs(e.year - detail.year) <= 2)
    .sort(
      (a, b) =>
        (a.kind === detail.kind) - (b.kind === detail.kind) ||
        Math.abs(a.sort - detail.sort) - Math.abs(b.sort - detail.sort),
    )
    .slice(0, 6);
  const storyboardEvidence = (allStories[detail.id]?.evidence || [])
    .map((id) => allEvents.find((e) => e.id === id))
    .filter(Boolean);
  const searchingAllVolumes = query.trim().length > 0;
  const directoryResults = useMemo(
    () =>
      searchEvents(searchingAllVolumes ? allEvents : events, searchingAllVolumes ? allStories : stories, {
        query,
        kind,
        masteryFilter,
        masteryMap: studyState.mastery,
      }),
    [searchingAllVolumes, allEvents, events, allStories, stories, query, kind, masteryFilter, studyState.mastery],
  );

  const canStepPrev =
    playlistKind === 'all'
      ? safeIndex > 0
      : prevInPlaylist(playlist, safeIndex, { loop: loopMode }) !== null;
  const canStepNext =
    playlistKind === 'all'
      ? safeIndex < events.length - 1
      : nextInPlaylist(playlist, safeIndex, { loop: loopMode }) !== null;

  const showNextVolumeBanner =
    Boolean(meta.nextVolumeId) &&
    safeIndex === events.length - 1 &&
    !playing &&
    !nextVolDismissed &&
    !returnContext;

  const isWideDialog = panel === 'compare' || panel === 'exam';

  return (
    <main className="experience narrated-experience">
      <audio
        ref={narration.audioRef}
        className="narration-audio"
        src={narration.manifest?.audio}
        preload="auto"
        onLoadedMetadata={() => {
          const a = narration.audioRef.current;
          if (Math.abs(a.duration - total) > 0.05) narration.fail();
          else narration.syncSeek(clock.current.time);
        }}
        onTimeUpdate={() => {
          // Keep topic playlists and chapter loops advancing even when tab is hidden in Walkman mode.
          if (!playing || !backgroundAudio || !document.hidden) return;
          const a = narration.audioRef.current;
          if (!a || a.seeking || a.readyState < 2) return;
          clock.current.time = Math.min(total, a.currentTime);
          if (enforcePlaybackBoundary()) return;
          const next = Math.max(0, starts.findLastIndex((s) => s <= clock.current.time));
          if (next !== indexRef.current) {
            indexRef.current = next;
            setIndex(next);
          }
        }}
        onError={narration.fail}
        onWaiting={() => narration.setWaiting(true)}
        onCanPlay={() => narration.setWaiting(false)}
        onPlaying={() => narration.setWaiting(false)}
        onEnded={() => {
          if (!enforcePlaybackBoundary()) seek(total, true);
        }}
      >
        {narration.manifest && (
          <track kind="captions" src={narration.manifest.captions} srcLang="zh-CN" label="简体中文字幕" />
        )}
      </audio>

      <header className="masthead">
        <div className="brand-group">
          <a className="brand" href="./" aria-label="史序首页">
            <Compass weight="light" size={22} />
            <span>史序</span>
            <i />
          </a>
          <div className="volume-switch" role="group" aria-label="切换历史分卷">
            {VOLUME_ORDER.map((vid) => {
              const v = VOLUMES[vid];
              const active = vid === volumeId;
              return (
                <button
                  key={vid}
                  type="button"
                  className={`volume-pill ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  title={`${v.label}（${v.range}）`}
                  onClick={() => {
                    if (vid !== volumeId) onSwitchVolume(vid, null, false);
                  }}
                >
                  <span>{v.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="header-actions">
          <button type="button" onClick={openCompare} title="高频易混同屏对照">
            <Scales size={17} />
            <span className="label-wide">易混对照</span>
            <span className="label-narrow">对照</span>
          </button>
          <button type="button" className="exam-entry" onClick={openExam} title="2017—2026 考研政治史纲真题复测">
            <Exam size={17} />
            <span className="label-wide">真题复测</span>
            <span className="label-narrow">真题</span>
            {dueIds.length > 0 && <em className="due-badge" aria-label={`${dueIds.length}题待巩固`}>{dueIds.length}</em>}
          </button>
          <button type="button" onClick={openDirectory}>
            <List size={18} />
            <span>目录</span>
          </button>
          <button
            type="button"
            className="icon-button theme-toggle"
            aria-label={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <section className="stage" aria-label="地图叙事主画面">
        <div
          className={`map-viewport ${cinemaActive ? 'has-cinema-stage' : ''} ${playing ? 'is-playing' : 'is-paused'}`}
        >
          <MapScene
            geography={geography}
            events={events}
            scene={scene}
            stories={stories}
            volumeId={volumeId}
            theme={theme}
            playing={playing}
            rate={rate}
            clock={clock}
            sceneStart={starts[safeIndex]}
            animationRef={animationRef}
            storyController={storyController}
            phase={beatIndex}
            onPick={(id) => (id === scene.id ? openDetails() : selectEvent(id))}
            overview={overview}
            zoom={zoom}
          />

          <EraCanvas
            eraKey={sceneAtmosphere.eraKey}
            theme={theme}
            playing={playing}
            reduce={reduceMotion}
            active={!overview}
          />

          {cinemaActive && (
            <StageCinema
              scene={scene}
              story={authored}
              phase={beatIndex}
              playing={playing}
              reduce={reduceMotion}
              controller={cinemaController}
              clock={clock}
              sceneStart={starts[safeIndex]}
            />
          )}

          <div className="map-tools">
            <button
              type="button"
              className="pilot-switcher-btn"
              popoverTarget="pilot-showcase-popover"
              aria-label="切换多形式动画样片"
              title="直达 5 种非地图动画样片：文献手稿 / 纵深档案 / 木刻视差 / 号外公报 / 土地演化"
            >
              <FilmStrip size={15} />
              <span>样片</span>
            </button>
            {pilotStage && !overview && (
              <button
                type="button"
                className={`stage-mode-btn ${stageView === 'cinema' ? 'is-cinema' : ''}`}
                aria-pressed={stageView === 'cinema'}
                title={stageView === 'cinema' ? '切回地图图解视角对比' : '切回多维影院画布'}
                onClick={() => setStageView((v) => (v === 'cinema' ? 'map' : 'cinema'))}
              >
                <Stack size={14} />
                <span>{stageView === 'cinema' ? '地图' : '画布'}</span>
              </button>
            )}
            <button
              type="button"
              className={overview ? 'selected' : ''}
              onClick={() => setOverview((v) => !v)}
              aria-pressed={overview}
            >
              <Compass size={15} />
              <span>{overview ? '跟随' : '全图'}</span>
            </button>
            {!cinemaActive && (
              <>
                <button type="button" aria-label="放大地图" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}>
                  <Plus size={14} />
                </button>
                <button type="button" aria-label="缩小地图" onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}>
                  <Minus size={14} />
                </button>
              </>
            )}
          </div>

          <div id="pilot-showcase-popover" popover="auto" className="pilot-popover" aria-label="多形式动画样片直达">
            <div className="pilot-popover-head">
              <strong>多形式动画样片</strong>
              <span>脱离地图 · 5 种镜头形态</span>
            </div>
            <div className="pilot-popover-list">
              {PILOT_STAGE_LIST.map((item) => {
                const isCurrent = scene.id === item.id && cinemaActive;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`pilot-popover-item ${isCurrent ? 'is-active' : ''}`}
                    onClick={() => {
                      document.getElementById('pilot-showcase-popover')?.hidePopover?.();
                      setOverview(false);
                      setStageView('cinema');
                      setPlaylistKind('all');
                      if (volumeIdForEvent(item.id) !== volumeId) {
                        onSwitchVolume(item.volumeId, item.id, true);
                      } else {
                        selectEvent(item.id, false);
                        setPlaying(true);
                      }
                    }}
                  >
                    <span className="pilot-popover-item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.badge}</small>
                    </span>
                    <span className="pilot-popover-tag">{item.shortLabel}</span>
                  </button>
                );
              })}
              <button
                type="button"
                className="pilot-popover-item"
                onClick={() => {
                  document.getElementById('pilot-showcase-popover')?.hidePopover?.();
                  setPlaying(false);
                  setCompareResume({ mode: 'preset', scope: 'cross', setId: 'land-evolution' });
                  setPanel('compare');
                }}
              >
                <span className="pilot-popover-item-copy">
                  <strong>土地政策演进（1853—2017）</strong>
                  <small>易混对照 · 12 步产权分层连续变形短片</small>
                </span>
                <span className="pilot-popover-tag">演化短片</span>
              </button>
            </div>
          </div>
        </div>

        <ChapterIntertitle
          eraKey={sceneAtmosphere.eraKey}
          volumeId={volumeId}
          chapterIndex={scene.chapter}
          chapterTitle={data.chapters[scene.chapter]?.title}
          playing={playing}
          overview={overview}
        />

        <article className="story" key={scene.id}>
          <div className="story-head-meta">
            <div className="year-line">
              <YearRoll year={scene.year} />
              <span className="year-unit">年</span>
              {scene.endYear && <span className="period-end">— {scene.endYear}</span>}
            </div>
            <div className="story-category" style={{ color: type.color }}>
              <type.Icon size={14} />
              {type.label}
              <span>·</span>
              <span>{currentBeat?.date || readableDate(scene)}</span>
            </div>
          </div>
          <h1 className={scene.title.length > 20 ? 'long-title' : ''}>{scene.title}</h1>
          {currentBeat && <h2 className="beat-title">{currentBeat.title}</h2>}
          <KineticCopy
            text={currentBeat?.text || scene.summary}
            beatKey={`${scene.id}:${beatIndex}`}
            playing={playing}
          />
          {authored && (
            <nav className="beat-navigation" aria-label="事件阶段">
              {authored.beats.map((beat, i) => (
                <button
                  key={beat.at}
                  type="button"
                  aria-current={i === beatIndex ? 'step' : undefined}
                  onClick={() => seek(starts[safeIndex] + playbackTimeFor(authored, scene, beat.at) + 0.12, true)}
                  title={beat.title}
                >
                  {beat.short}
                </button>
              ))}
            </nav>
          )}
          <div className="story-bottom">
            <button type="button" className="details-trigger" onClick={() => openDetails()}>
              详情 <ArrowUpRight size={15} />
            </button>
          </div>
        </article>

        {returnContext && (
          <div className="return-context-pill" role="region" aria-label="返回刷题或对照">
            <button
              type="button"
              className="return-context-action"
              onClick={() => {
                setPlaying(false);
                const target = returnContext.panel;
                setReturnContext(null);
                setPanel(target);
              }}
            >
              <ArrowLeft size={15} />
              <span>{returnContext.label}</span>
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="关闭返回提示"
              onClick={() => setReturnContext(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {showNextVolumeBanner && (
          <div className="return-context-pill volume-continue-pill" role="region" aria-label="衔接下篇">
            <button
              type="button"
              className="return-context-action"
              onClick={() => onSwitchVolume(meta.nextVolumeId, null, true)}
            >
              <span>{meta.nextPrompt}</span>
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="暂不切换下篇"
              onClick={() => setNextVolDismissed(true)}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {narration.captionsVisible && activeCaption && (
          <div className="narration-subtitles" aria-label="配音字幕">
            <p>{activeCaption.text}</p>
          </div>
        )}
      </section>

      <footer className="player">
        {playlistKind !== 'all' && (
          <div className="playlist-bar" role="status">
            <span>
              专题连播 · <strong>{TYPES[playlistKind].label}</strong>
              <small>
                {playlistPos >= 0 ? `${playlistPos + 1} / ${playlist.length}` : `${playlist.length} 条`} · 约{' '}
                {formatClock(playlistTotalSeconds)}
              </small>
            </span>
            <button type="button" onClick={() => setPlaylistKind('all')}>
              退出专题 <X size={13} />
            </button>
          </div>
        )}

        <div className="timeline-track">
          <div ref={progressRef} className="timeline-fill" />
          <div className={`scene-ticks ${playlistKind !== 'all' ? 'is-filtered' : ''}`} aria-hidden="true">
            {events.map((e, i) => (
              <span
                key={e.id}
                style={{ left: `${(starts[i] / total) * 100}%` }}
                className={`${i === safeIndex ? 'current' : ''} ${playlistSet.has(i) ? 'in-playlist' : ''}`}
              />
            ))}
          </div>
          <input
            ref={sliderRef}
            type="range"
            min="0"
            max={total}
            step="0.1"
            defaultValue={starts[initialIndex]}
            aria-label="叙事播放进度"
            onChange={(e) => {
              manualSeekUntilRef.current = performance.now() + 300;
              seek(Number(e.target.value));
            }}
          />
        </div>

        <div className="playback-row">
          <div className="transport">
            <button
              type="button"
              className="icon-button"
              aria-label="上一幕"
              title="上一幕（←）"
              disabled={!canStepPrev}
              onClick={() => step(-1)}
            >
              <SkipBack size={18} weight="fill" />
            </button>
            <button
              type="button"
              className="play-button"
              aria-label={playing ? '暂停播放' : '开始播放'}
              title="播放 / 暂停（空格）"
              onClick={toggle}
            >
              {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="下一幕"
              title="下一幕（→）"
              disabled={!canStepNext}
              onClick={() => step(1)}
            >
              <SkipForward size={18} weight="fill" />
            </button>
          </div>
          <div className="playback-time">
            <span ref={elapsedRef}>{formatClock(clock.current.time)}</span>
            <span>/</span>
            <span>{formatClock(total)}</span>
          </div>
          <div className="transport-secondary">
            <button
              type="button"
              className={`narration-toggle ${narration.voice ? 'is-active' : ''}`}
              aria-label={narration.voice ? '关闭配音讲解' : '开启配音讲解'}
              aria-pressed={narration.voice}
              aria-description={narration.manifest?.disclosure}
              title={
                !narration.hasAudioTrack
                  ? '下篇当前为字幕与拟音模式，配音将于文案定稿后接入'
                  : narration.loading
                    ? '配音载入中'
                    : `${narration.voice ? '关闭' : '开启'}配音讲解${
                        narration.manifest?.engine === 'GPT-SoVITS' ? ' · AI合成 · 已确认音色' : ''
                      }`
              }
              disabled={narration.loading}
              onClick={narration.toggleVoice}
            >
              {narration.voice ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}
              <span>
                {!narration.hasAudioTrack
                  ? '配音'
                  : narration.manifest?.engine === 'GPT-SoVITS'
                    ? 'AI配音'
                    : '配音'}
              </span>
            </button>
            <button
              type="button"
              className={`narration-toggle ${narration.captionsVisible ? 'is-active' : ''}`}
              aria-label={narration.captionsVisible ? '关闭字幕' : '开启字幕'}
              aria-pressed={narration.captionsVisible}
              title={narration.captionsVisible ? '关闭字幕' : '开启字幕'}
              onClick={narration.toggleCaptions}
            >
              <ClosedCaptioning size={18} />
              <span>字幕</span>
            </button>
            <button
              type="button"
              className="read-toggle"
              aria-label="考点回忆"
              onClick={() => openDetails(scene.id, 'review')}
            >
              <BookOpen size={16} />
              <span className="label-wide">考点回忆</span>
              <span className="label-narrow">回忆</span>
            </button>
            <button
              type="button"
              className={`narration-toggle prefs-trigger ${
                rate !== 1 || loopMode || backgroundAudio ? 'has-active-pref' : ''
              }`}
              popoverTarget="player-prefs-popover"
              aria-label="播放设置与更多工具"
              title="倍速、循环、音效、随身听与全屏"
            >
              <SlidersHorizontal size={18} />
              <span>{rate !== 1 ? `${rate}×` : '设置'}</span>
              {(loopMode || backgroundAudio) && <i className="pref-dot" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div id="player-prefs-popover" popover="auto" className="prefs-popover" aria-label="播放设置">
          <div className="prefs-section">
            <span className="prefs-label">播放速度</span>
            <div className="prefs-rate-row" role="group" aria-label="选择播放速度">
              {[0.5, 1, 1.5, 2].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`prefs-rate-btn ${rate === v ? 'is-active' : ''}`}
                  aria-pressed={rate === v}
                  onClick={() => setRate(v)}
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>
          <div className="prefs-toggles">
            <button
              type="button"
              className={`prefs-row sfx-toggle ${sfx ? 'is-active' : ''}`}
              aria-pressed={sfx}
              onClick={toggleSfx}
            >
              <Waveform size={17} />
              <span>微音效</span>
              <em>{sfx ? '已开' : '已关'}</em>
            </button>
            <button
              type="button"
              className={`prefs-row ${loopMode ? 'is-active' : ''}`}
              aria-pressed={loopMode}
              onClick={() => setLoopMode((v) => !v)}
            >
              <Repeat size={17} />
              <span>{playlistKind === 'all' ? '单章循环' : '专题循环'}</span>
              <em>{loopMode ? '已开' : '已关'}</em>
            </button>
            <button
              type="button"
              className={`prefs-row ${backgroundAudio ? 'is-active' : ''}`}
              aria-pressed={backgroundAudio}
              onClick={toggleWalkman}
            >
              <Headphones size={17} />
              <span>随身听（后台播音）</span>
              <em>{backgroundAudio ? '已开' : '已关'}</em>
            </button>
          </div>
          <div className="prefs-footer">
            <button
              type="button"
              onClick={() => {
                setPlaylistKind('all');
                seek(0, true);
              }}
            >
              <ArrowCounterClockwise size={15} />
              <span>从 {events[0].year} 重播</span>
            </button>
            <button type="button" onClick={full}>
              <ArrowsOut size={15} />
              <span>{fullScreen ? '退出全屏' : '全屏'}</span>
            </button>
            <a href="./?lesson=road">
              <span>90秒样片</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
          {REPO.url && (
            <div className="prefs-footer">
              <a
                href={REPO.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={REPO.ariaLabel}
              >
                <GithubLogo size={15} />
                <span>{REPO.label}</span>
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <span className="prefs-label">{REPO.license}</span>
            </div>
          )}
        </div>

        {narration.voice && playing && narration.waiting && (
          <span className="narration-waiting" role="status">
            配音载入中…
          </span>
        )}

        <div className="chapter-track">
          {chapterStarts.map((c, i) => (
            <button
              key={c.title}
              type="button"
              className={scene.chapter === i ? 'active' : ''}
              style={{ width: `${(((chapterStarts[i + 1]?.time || total) - c.time) / total) * 100}%` }}
              onClick={() => {
                setPlaylistKind('all');
                seek(c.time);
              }}
            >
              <span>{c.range}</span>
              <strong>{c.title}</strong>
            </button>
          ))}
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        closedby="any"
        className={`reading-dialog ${panel === 'directory' ? 'directory-dialog' : ''} ${isWideDialog ? 'wide-dialog' : ''}`}
        onClose={() => setPanel(null)}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <div className="dialog-top">
            <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={() => setPanel(null)}>
              <X size={21} />
            </button>
          </div>

          {panel === 'compare' && (
            <Suspense fallback={<p className="study-empty">正在载入易混对照…</p>}>
              <ConfusionCompare
                events={allEvents}
                chapters={allChapters}
                stories={allStories}
                masteryMap={studyState.mastery}
                onInspectMap={inspectOnMap}
                initialMode={compareResume?.mode || 'preset'}
                initialScope={compareResume?.scope || 'all'}
                initialSetId={
                  compareResume?.setId ||
                  (volumeId === 'prc' ? 'three-transformations' : 'land-evolution')
                }
                initialPair={compareResume?.pair}
              />
            </Suspense>
          )}

          {panel === 'exam' && (
            <Suspense fallback={<p className="study-empty">正在载入真题复测…</p>}>
              <ExamPractice
                questions={examQuestions}
                analysisQuestions={analysisQuestions}
                loading={examLoading}
                error={examError}
                chapters={allChapters}
                events={allEvents}
                studyState={studyState}
                onRecordAttempt={handleRecordAttempt}
                onInspectMap={inspectOnMap}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onResetStudy={handleResetStudy}
                initialView={examResume?.view || null}
                initialVolume={examResume?.volume ?? 'all'}
                initialChapter={examResume?.chapter ?? 'all'}
                initialQuestionId={examResume?.questionId || null}
                initialAnalysisId={examResume?.analysisId || null}
                submittedByQuestion={examSubmitted}
                onSubmittedChange={setExamSubmitted}
              />
            </Suspense>
          )}

          {panel === 'directory' && (
            <>
              <h2 id="dialog-title">事件目录与专题连播</h2>
              <a className="directory-sample-card" href="./?lesson=road">
                <div>
                  <strong>道路与建军 · 90 秒因果精讲样片</strong>
                  <span>秋收起义 → 三湾改编 → 古田会议，含决策冻结与章末复原</span>
                </div>
                <ArrowUpRight size={17} />
              </a>
              <div className="search-field">
                <MagnifyingGlass size={18} />
                <input
                  aria-label="搜索事件或原文考词"
                  placeholder="搜事件、年份、地点，或“第一枪 / 使用权 / 两个务必”等考词"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="清除搜索"
                    className="icon-button"
                    onClick={() => setQuery('')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="content-filters">
                <button type="button" className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>
                  全部
                </button>
                {Object.entries(TYPES).map(([k, v]) => (
                  <button
                    type="button"
                    className={kind === k ? 'active' : ''}
                    onClick={() => setKind(k)}
                    key={k}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="mastery-filters" aria-label="按掌握度筛选">
                {MASTERY_FILTER_LABELS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={masteryFilter === item.id ? 'active' : ''}
                    onClick={() => setMasteryFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="directory-count">
                <span>
                  {directoryResults.length} 条{searchingAllVolumes ? '（全卷命中）' : `（${meta.shortLabel}）`}
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => startPlaylist(kind)}
                >
                  <Play size={13} weight="fill" />
                  {kind === 'all'
                    ? `播完整 ${Math.round(total / 60)} 分钟`
                    : `连播「${TYPES[kind].label}」专题`}
                </button>
              </div>
              <div className="directory-list">
                {directoryResults.map(({ event: e, snippet }) => {
                  const mastery = studyState.mastery[e.id]?.level;
                  const eventVol = volumeIdForEvent(e.id);
                  return (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => {
                        if (playlistKind !== 'all' && e.kind !== playlistKind) setPlaylistKind('all');
                        selectEvent(e.id);
                        setPanel(null);
                      }}
                      className={e.id === scene.id ? 'current' : ''}
                    >
                      <span className="directory-year">{e.year}</span>
                      <span className="directory-title">
                        <span className="directory-title-row">
                          {e.title}
                          {searchingAllVolumes && (
                            <em className={`vol-badge ${eventVol === 'prc' ? 'is-prc' : ''}`}>
                              {eventVol === 'prc' ? '下篇' : '上篇'}
                            </em>
                          )}
                          {mastery && (
                            <i
                              className={`mastery-dot mastery-${mastery}`}
                              title={MASTERY_OPTIONS.find((m) => m.id === mastery)?.label}
                            />
                          )}
                        </span>
                        <small>{snippet || e.headline}</small>
                      </span>
                      <span className="directory-kind" style={{ color: TYPES[e.kind].color }}>
                        {TYPES[e.kind].label}
                      </span>
                      <CaretRight size={16} />
                    </button>
                  );
                })}
                {directoryResults.length === 0 && (
                  <div className="empty-search">没有找到相关内容。试试事件名、年份、地点或核心考词。</div>
                )}
              </div>
            </>
          )}

          {panel === 'detail' && (
            <>
              <h2 id="dialog-title">{detail.title}</h2>
              <div className="detail-date">
                {readableDate(detail)}
                <span>·</span>
                {detail.location}
              </div>
              <nav className="detail-tabs" aria-label="考点详情">
                <button
                  type="button"
                  className={detailTab === 'summary' ? 'active' : ''}
                  onClick={() => setDetailTab('summary')}
                >
                  事件解读
                </button>
                <button
                  type="button"
                  className={detailTab === 'review' ? 'active' : ''}
                  onClick={() => {
                    setDetailTab('review');
                    setClozeMasked(true);
                    setClozeRevealed({});
                  }}
                >
                  考点回忆
                </button>
                <button
                  type="button"
                  className={detailTab === 'original' ? 'active' : ''}
                  onClick={() => setDetailTab('original')}
                >
                  资料原文
                </button>
              </nav>

              {detailTab === 'summary' && (
                <div className="detail-body">
                  <p className="detail-headline">{detail.headline}</p>
                  <p>{detail.summary}</p>
                  {allStories[detail.id] && (
                    <details className="scene-explanation">
                      <summary>分段讲解</summary>
                      {allStories[detail.id].beats.map((beat) => (
                        <div key={beat.at}>
                          <h3>{beat.title}</h3>
                          <p>{beat.text}</p>
                        </div>
                      ))}
                    </details>
                  )}
                  <h3>同期内容</h3>
                  <div className="related-list">
                    {related.map((e) => (
                      <button type="button" key={e.id} onClick={() => openDetails(e.id)}>
                        <span className="related-type">{TYPES[e.kind].label}</span>
                        <span>
                          {e.title}
                          <small>{e.year}年</small>
                        </span>
                        <ArrowUpRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === 'review' && (
                <div className="detail-body review-body">
                  <h3>“{detail.title}”的核心内容和历史意义是什么？</h3>
                  <p className="cloze-tip">
                    已自动遮住核心“帽子词”与定性短语，先尝试口头复述，再点击阴影词块逐个核对。
                  </p>
                  <div className="recalled-answer cloze-card">
                    <span>
                      <Check size={16} />
                      挖空自测
                    </span>
                    <h4>
                      <ClozeText
                        text={detail.headline}
                        masked={clozeMasked}
                        revealed={clozeRevealed}
                        onToggle={(key) =>
                          setClozeRevealed((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        prefix={`rev-h-${detail.id}`}
                      />
                    </h4>
                    <p>
                      <ClozeText
                        text={detail.summary}
                        masked={clozeMasked}
                        revealed={clozeRevealed}
                        onToggle={(key) =>
                          setClozeRevealed((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        prefix={`rev-s-${detail.id}`}
                      />
                    </p>
                    <div className="cloze-actions">
                      <button
                        type="button"
                        className="pill-toggle"
                        onClick={() => {
                          setClozeMasked((v) => !v);
                          setClozeRevealed({});
                        }}
                      >
                        {clozeMasked ? <Eye size={15} /> : <EyeSlash size={15} />}
                        <span>{clozeMasked ? '显示全部关键词' : '重新遮挡自测'}</span>
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setDetailTab('original')}
                      >
                        核对原文 <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mastery-box">
                    <span className="mastery-label">标记掌握度（同步至目录“待巩固”筛选）</span>
                    <div className="mastery-buttons">
                      {MASTERY_OPTIONS.map((opt) => {
                        const active = studyState.mastery[detail.id]?.level === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={`mastery-choice mastery-${opt.id} ${active ? 'is-active' : ''}`}
                            aria-pressed={active}
                            onClick={() => handleSetMastery(detail.id, opt.id)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'original' && (
                <div className="detail-body original-body">
                  {detail.sourceNote && <p className="source-note">{detail.sourceNote}</p>}
                  {detail.original.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                  {storyboardEvidence.length > 0 && (
                    <div className="animation-sources">
                      <h3>分镜依据</h3>
                      {storyboardEvidence.map((e) => (
                        <button
                          type="button"
                          className="text-button"
                          key={e.id}
                          onClick={() => openDetails(e.id, 'original')}
                        >
                          {e.title}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                  )}
                  {allStories[detail.id]?.sources?.length > 0 && (
                    <div className="animation-sources">
                      <h3>动画史料</h3>
                      {allStories[detail.id].sources.map((source) => (
                        <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                          <ArrowUpRight size={14} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {SHOW_SOURCE_METADATA && (
                <>
                  <div className="detail-source">
                    <FileText size={17} />
                    <span>
                      大李子专题总结资料
                      <small>PDF {sourcePages(detail)}</small>
                    </span>
                    <a href={sitePath(detail.sourceUrl)} target="_blank" rel="noreferrer">
                      查看原页
                      <ArrowUpRight size={15} />
                    </a>
                  </div>
                  <details className="scene-explanation">
                    <summary>地图来源</summary>
                    <div>
                      <p>
                        底图：
                        <a href={data.basemapSource} target="_blank" rel="noreferrer">
                          阿里云 DataV
                        </a>
                        。采用现代行政区划，仅作地点定位示意，不表示历史疆域。
                      </p>
                    </div>
                  </details>
                </>
              )}

              <button
                type="button"
                className="jump-button"
                onClick={() => {
                  selectEvent(detail.id);
                  setPanel(null);
                }}
              >
                在地图上查看
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </div>
      </dialog>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')} aria-label="关闭提示">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}

export function App() {
  const params = new URLSearchParams(location.search);
  const isLesson = params.get('lesson') === 'road';
  const initialEvent = params.get('event');
  const initialVol = normalizeVolumeId(
    params.get('vol') || (initialEvent?.startsWith('prc-') ? 'prc' : DEFAULT_VOLUME_ID),
  );

  const [geography, setGeography] = useState(null);
  const [volumeId, setVolumeId] = useState(initialVol);
  const [bundles, setBundles] = useState({});
  const [pendingNav, setPendingNav] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const primaryVol = isLesson ? DEFAULT_VOLUME_ID : initialVol;
    const secondaryVol = primaryVol === 'modern' ? 'prc' : 'modern';

    Promise.all([
      fetch(sitePath('/data/china-d3.json')).then((r) => {
        if (!r.ok) throw new Error(`地图底图载入失败：${r.status}`);
        return r.json();
      }),
      loadVolumeBundle(primaryVol),
    ])
      .then(([geo, primaryBundle]) => {
        if (!alive) return;
        setGeography(geo);
        setBundles((prev) => ({ ...prev, [primaryVol]: primaryBundle }));
        // Prefetch the sibling volume quietly for zero-latency switching and cross-volume exam/compare.
        if (!isLesson) {
          loadVolumeBundle(secondaryVol)
            .then((sibling) => {
              if (alive) setBundles((prev) => ({ ...prev, [secondaryVol]: sibling }));
            })
            .catch(() => {
              // On-demand retry happens when the user switches volumes.
            });
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });

    return () => {
      alive = false;
    };
  }, [isLesson, initialVol]);

  const handleSwitchVolume = useCallback((nextVolId, targetEventId = null, autoPlay = false) => {
    const id = normalizeVolumeId(nextVolId);
    setPendingNav({ volumeId: id, eventId: targetEventId, autoPlay });
    loadVolumeBundle(id)
      .then((bundle) => {
        setBundles((prev) => (prev[id] ? prev : { ...prev, [id]: bundle }));
        setVolumeId(id);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  const consumePendingNav = useCallback(() => setPendingNav(null), []);

  if (error) {
    return (
      <main className="load-screen">
        <Compass size={36} />
        <h1>资料暂时没有载入</h1>
        <p>{error}</p>
        <button type="button" onClick={() => location.reload()}>
          重新载入
        </button>
      </main>
    );
  }

  const activeBundle = bundles[isLesson ? DEFAULT_VOLUME_ID : volumeId];
  if (!geography || !activeBundle) {
    return (
      <main className="load-screen">
        <Compass size={36} weight="light" />
        <span>史序</span>
        <p>正在铺开历史地图…</p>
      </main>
    );
  }

  return isLesson ? (
    <Suspense
      fallback={
        <main className="load-screen">
          <Compass size={36} weight="light" />
          <span>史序</span>
          <p>正在载入 90 秒样片…</p>
        </main>
      }
    >
      <CausalLesson data={activeBundle.data} geography={geography} />
    </Suspense>
  ) : (
    <HistoryExperience
      geography={geography}
      volumeId={volumeId}
      bundle={activeBundle}
      allBundles={bundles}
      onSwitchVolume={handleSwitchVolume}
      pendingNav={pendingNav}
      onConsumePendingNav={consumePendingNav}
    />
  );
}
