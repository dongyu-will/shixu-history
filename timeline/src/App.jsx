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
  DownloadSimple,
  Exam,
  Eye,
  EyeSlash,
  FileText,
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
  UploadSimple,
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
import { cancelTopLayerClose, closeTopLayer, supportsTopLayerExit } from './top-layer.js';
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
import { buildClozeSegments } from './cloze.js';
import { CONFUSION_SETS } from './confusion-sets.js';
import {
  buildPlaylist,
  chapterBounds,
  nextInPlaylist,
  playlistDuration,
  playlistElapsed,
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
  { id: 'forgot', label: '未掌握' },
];

const MASTERY_FILTER_LABELS = [
  { id: 'all', label: '全部状态' },
  { id: 'review', label: '需巩固' },
  { id: 'unmarked', label: '未标记' },
  { id: 'known', label: '已掌握' },
];

// Temporarily hide attribution controls at the user's request; retain source data.
const SHOW_SOURCE_METADATA = false;
const WALKMAN_KEY = 'shixu-walkman';
const RATE_KEY = 'shixu-rate';
const RATE_OPTIONS = [0.5, 1, 1.5, 2];

function readSavedRate() {
  try {
    const raw = Number(localStorage.getItem(RATE_KEY));
    return RATE_OPTIONS.includes(raw) ? raw : 1;
  } catch {
    return 1;
  }
}
const LAST_POS_KEY = 'shixu-last-pos-v1';

function readVolumePositions() {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeVolumePositions(positions) {
  try {
    localStorage.setItem(LAST_POS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

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
  switchingVolume,
  pendingNav,
  onConsumePendingNav,
  externalNotice,
  onClearExternalNotice,
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

  const initialSearch = new URLSearchParams(location.search);
  const initialId = initialSearch.get('event') || events[0].id;
  const initialPanelParam = initialSearch.get('panel');
  const initialChapterParam = initialSearch.get('chapter');
  const initialPanel =
    initialPanelParam === 'exam' || initialPanelParam === 'compare' || initialPanelParam === 'directory'
      ? initialPanelParam
      : null;
  const initialExamState =
    initialPanel === 'exam' && initialChapterParam
      ? { view: 'chapters', chapter: initialChapterParam }
      : null;
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
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);
  const [rate, setRate] = useState(readSavedRate);
  const [overview, setOverview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panel, setPanel] = useState(initialPanel);
  const [detailId, setDetailId] = useState(events[initialIndex].id);
  const [detailHistory, setDetailHistory] = useState([]);
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
  const [suppressIntertitle, setSuppressIntertitle] = useState(false);
  const intertitleTimerRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(() =>
    Boolean(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches),
  );
  const [isCompactViewport, setIsCompactViewport] = useState(() =>
    Boolean(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 760px)')?.matches),
  );

  useEffect(() => {
    const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : null;
    const compact = typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 760px)') : null;
    const syncMotion = () => media && setReduceMotion(media.matches);
    const syncCompact = () => compact && setIsCompactViewport(compact.matches);
    media?.addEventListener('change', syncMotion);
    compact?.addEventListener('change', syncCompact);
    return () => {
      media?.removeEventListener('change', syncMotion);
      compact?.removeEventListener('change', syncCompact);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      // Ignore storage errors.
    }
  }, [rate]);

  // Study upgrade states: topic/filtered queue, loop, walkman background audio, exam bank, mastery.
  const [playlistMeta, setPlaylistMeta] = useState({ kind: 'all', label: '', ids: null });
  const playlistKind = playlistMeta.kind;
  const [loopMode, setLoopMode] = useState(false);
  const [backgroundAudio, setBackgroundAudio] = useState(() => readBoolPref(WALKMAN_KEY, false));
  const [sfx, setSfx] = useState(() => readSfxPreference());
  const [returnContext, setReturnContext] = useState(null);
  const [compareState, setCompareState] = useState(null);
  const [examState, setExamState] = useState(initialExamState);
  const [examQuestions, setExamQuestions] = useState([]);
  const [analysisQuestions, setAnalysisQuestions] = useState([]);
  const [examLoading, setExamLoading] = useState(true);
  const [examError, setExamError] = useState('');
  const [examSubmitted, setExamSubmitted] = useState({});
  const [studyState, setStudyState] = useState(() => readStudyState(globalThis.localStorage, null, null).state);
  const studyStateRef = useRef(studyState);
  studyStateRef.current = studyState;
  const lastClearedStudyRef = useRef(null);
  const lastPlaylistRef = useRef(null);
  const [undoPlaylistAvailable, setUndoPlaylistAvailable] = useState(false);
  const undoTimerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const [undoResetAvailable, setUndoResetAvailable] = useState(false);
  const wasPlayingBeforePanelRef = useRef(false);
  const jumpedInPanelRef = useRef(false);
  const directoryListRef = useRef(null);
  const prefsBackupInputRef = useRef(null);

  const beatRef = useRef(0);
  const lastFoleyKeyRef = useRef(`${events[initialIndex].id}:0`);
  const lastFoleyAtRef = useRef(0);
  const manualSeekUntilRef = useRef(0);
  const clock = useRef({ time: starts[initialIndex] });
  const indexRef = useRef(index);
  const prevVolumeRef = useRef(volumeId);
  const volumePositionsRef = useRef(readVolumePositions());

  // Resolve target index synchronously on volume transition to avoid a 1-frame stale index/chapter flash.
  const hasPendingForHere = Boolean(pendingNav && pendingNav.volumeId === volumeId);
  const volumeTransitioned = prevVolumeRef.current !== volumeId;
  let resolvedIndex = Math.min(index, events.length - 1);
  if (volumeTransitioned || hasPendingForHere) {
    const targetId = hasPendingForHere ? pendingNav.eventId : null;
    const savedPos = !targetId ? volumePositionsRef.current[volumeId] : null;
    if (targetId) {
      const found = events.findIndex((e) => e.id === targetId);
      resolvedIndex = found >= 0 ? found : 0;
    } else if (savedPos?.eventId) {
      const found = events.findIndex((e) => e.id === savedPos.eventId);
      resolvedIndex = found >= 0 ? found : 0;
    } else {
      resolvedIndex = 0;
    }
  }
  const safeIndex = resolvedIndex;
  indexRef.current = safeIndex;
  const animationRef = useRef(null);
  const storyController = useRef(null);
  const cinemaController = useRef(null);
  const progressRef = useRef(null);
  const sliderRef = useRef(null);
  const elapsedRef = useRef(null);
  const dialogRef = useRef(null);

  const playlist = useMemo(() => {
    if (playlistMeta.kind === 'custom' && Array.isArray(playlistMeta.ids)) {
      const idSet = new Set(playlistMeta.ids);
      const indices = [];
      for (let i = 0; i < events.length; i += 1) {
        if (idSet.has(events[i].id)) indices.push(i);
      }
      return indices;
    }
    return buildPlaylist(events, playlistMeta.kind);
  }, [events, playlistMeta]);
  const playlistSet = useMemo(() => new Set(playlist), [playlist]);
  const playlistTotalSeconds = useMemo(() => playlistDuration(events, playlist), [events, playlist]);
  const playlistPos = useMemo(() => playlistPosition(playlist, safeIndex), [playlist, safeIndex]);
  const isQueued = playlistMeta.kind !== 'all';

  // Auto-dismiss transient notices while keeping undoable alerts visible long enough.
  useEffect(() => {
    if (!notice) return undefined;
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    if (undoResetAvailable) return undefined;
    const ms = undoPlaylistAvailable ? 4500 : 3800;
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('');
      setUndoPlaylistAvailable(false);
    }, ms);
    return () => window.clearTimeout(noticeTimerRef.current);
  }, [notice, undoResetAvailable, undoPlaylistAvailable]);

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
  const isDiagramScene = Boolean(
    authored?.kind === 'process' && !['geography', 'rendezvous'].includes(authored.mode),
  );
  const sceneAtmosphere = useMemo(
    () => getSceneAtmosphere({ volumeId, scene, authored }),
    [volumeId, scene, authored],
  );

  const questionIds = useMemo(() => new Set(examQuestions.map((q) => q.id)), [examQuestions]);
  const dueIds = useMemo(() => dueQuestionIds(studyState, examQuestions), [studyState, examQuestions]);

  // Load curated exam questions & Q36 analysis skeletons once without truncating sibling-volume mastery.
  const loadExamQuestions = useCallback(() => {
    setExamLoading(true);
    setExamError('');
    return fetch(sitePath('/data/exam-questions.json'))
      .then((res) => {
        if (!res.ok) throw new Error('真题库暂时加载失败');
        return res.json();
      })
      .then((payload) => {
        const list = Array.isArray(payload.questions) ? payload.questions : [];
        const analysis = Array.isArray(payload.analysisQuestions) ? payload.analysisQuestions : [];
        setExamQuestions(list);
        setAnalysisQuestions(analysis);
        const validQ = new Set(list.map((q) => q.id));
        const restored = readStudyState(globalThis.localStorage, validQ, null);
        // Merge in case user interacted before fetch completed.
        const current = studyStateRef.current;
        const merged =
          current.attempts.length || Object.keys(current.mastery).length
            ? {
                version: 1,
                attempts: current.attempts.filter((a) => validQ.has(a.questionId)),
                schedules: Object.fromEntries(
                  Object.entries(current.schedules).filter(([id]) => validQ.has(id)),
                ),
                mastery: current.mastery,
              }
            : restored.state;
        studyStateRef.current = merged;
        setStudyState(merged);
        if (restored.error) setNotice(restored.error);
      })
      .catch((err) => {
        setExamError(err.message || '真题库暂时加载失败');
      })
      .finally(() => {
        setExamLoading(false);
      });
  }, []);

  useEffect(() => {
    loadExamQuestions();
  }, [loadExamQuestions]);

  const persistStudy = useCallback((nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(studyStateRef.current) : nextOrUpdater;
    studyStateRef.current = next;
    const saved = writeStudyState(next);
    setStudyState(next);
    if (!saved) {
      setNotice('当前浏览器无法写入本地存储（如隐私模式或空间已满），刷新后进度可能无法保留。');
    }
    return next;
  }, []);

  const handleRecordAttempt = useCallback(
    (question, answer, opts) => {
      const next = recordQuestionAttempt(studyStateRef.current, question, answer, opts);
      persistStudy(next);
      return next.attempts.at(-1) || null;
    },
    [persistStudy],
  );

  const handleSetMastery = useCallback(
    (eventId, level) => {
      const prev = studyStateRef.current;
      const nextLevel = prev.mastery[eventId]?.level === level ? null : level;
      persistStudy(setNodeMastery(prev, eventId, nextLevel));
    },
    [persistStudy],
  );

  const handleExportBackup = useCallback(() => {
    const content = exportStudyBackup(studyStateRef.current);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shixu-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportBackup = useCallback(
    (jsonText) => {
      const validEvents = allBundles.modern && allBundles.prc ? allEventIds : null;
      const result = importStudyBackup(jsonText, studyStateRef.current, questionIds, validEvents);
      persistStudy(result.state);
      return { ...result.summary, state: result.state };
    },
    [persistStudy, questionIds, allBundles, allEventIds],
  );

  const handleResetStudy = useCallback(() => {
    lastClearedStudyRef.current = studyStateRef.current;
    persistStudy(emptyStudyState());
    setExamSubmitted({});
    setUndoResetAvailable(true);
    setNotice('已清空本机学习记录。');
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => {
      lastClearedStudyRef.current = null;
      setUndoResetAvailable(false);
    }, 8000);
  }, [persistStudy]);

  const handleUndoResetStudy = useCallback(() => {
    if (!lastClearedStudyRef.current) return;
    persistStudy(lastClearedStudyRef.current);
    lastClearedStudyRef.current = null;
    setUndoResetAvailable(false);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setNotice('已恢复刚才清空的学习记录。');
  }, [persistStudy]);

  const paintTime = useCallback(() => {
    const time = clock.current.time;
    if (progressRef.current) progressRef.current.style.transform = `scaleX(${time / total})`;
    const displayElapsed = isQueued
      ? playlistElapsed(events, starts, playlist, indexRef.current, time)
      : time;
    const stamp = formatClock(time);
    const displayStamp = formatClock(displayElapsed);
    if (sliderRef.current) {
      const value = time.toFixed(1);
      const label = `${stamp}，当前${events[indexRef.current].title}`;
      if (Number(sliderRef.current.value) !== Number(value)) sliderRef.current.value = value;
      if (sliderRef.current.getAttribute('aria-valuetext') !== label) {
        sliderRef.current.setAttribute('aria-valuetext', label);
      }
    }
    if (elapsedRef.current && elapsedRef.current.textContent !== displayStamp) {
      elapsedRef.current.textContent = displayStamp;
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
    isQueued,
    playlist,
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

  const markManualChapterJump = useCallback(() => {
    setSuppressIntertitle(true);
    if (intertitleTimerRef.current) window.clearTimeout(intertitleTimerRef.current);
    intertitleTimerRef.current = window.setTimeout(() => {
      setSuppressIntertitle(false);
    }, 120);
  }, []);

  const switchVolumeWithMemory = useCallback(
    (nextVolId, targetEventId = null, autoPlay = false) => {
      markManualChapterJump();
      const currentScene = events[indexRef.current];
      if (currentScene) {
        volumePositionsRef.current = {
          ...volumePositionsRef.current,
          [volumeId]: { eventId: currentScene.id, time: clock.current.time },
        };
        writeVolumePositions(volumePositionsRef.current);
      }
      onSwitchVolume(nextVolId, targetEventId, autoPlay);
    },
    [events, volumeId, onSwitchVolume, markManualChapterJump],
  );

  const selectEvent = useCallback(
    (id, pause = true) => {
      markManualChapterJump();
      const targetVol = volumeIdForEvent(id);
      if (targetVol !== volumeId) {
        switchVolumeWithMemory(targetVol, id, !pause);
        return;
      }
      const next = events.findIndex((e) => e.id === id);
      if (next !== -1) seek(starts[next], pause);
    },
    [volumeId, switchVolumeWithMemory, events, starts, seek, markManualChapterJump],
  );

  const step = useCallback(
    (delta) => {
      markManualChapterJump();
      if (isQueued) {
        const target =
          delta > 0
            ? nextInPlaylist(playlist, indexRef.current, { loop: loopMode })
            : prevInPlaylist(playlist, indexRef.current, { loop: loopMode });
        if (target !== null) seek(starts[target]);
        return;
      }
      if (loopMode) {
        const bounds = chapterBounds(events, starts, events[indexRef.current].chapter);
        if (bounds) {
          const i = indexRef.current + delta;
          if (i < bounds.firstIndex) {
            seek(starts[bounds.lastIndex]);
            return;
          }
          if (i > bounds.lastIndex) {
            seek(starts[bounds.firstIndex]);
            return;
          }
        }
      }
      const i = Math.max(0, Math.min(events.length - 1, indexRef.current + delta));
      seek(starts[i]);
    },
    [isQueued, playlist, loopMode, starts, events, seek, markManualChapterJump],
  );

  const toggle = useCallback(() => {
    setHasStartedPlayback(true);
    if (isQueued && playlist.length > 0 && !playlistSet.has(indexRef.current)) {
      const nearest = playlist.find((idx) => idx >= indexRef.current) ?? playlist[0];
      seek(starts[nearest], false);
      setPlaying(true);
      return;
    }
    if (clock.current.time >= total) seek(0);
    setPlaying((v) => !v);
  }, [isQueued, playlistSet, playlist, starts, total, seek]);

  const enforcePlaybackBoundary = useCallback(() => {
    const cur = indexRef.current;
    const sceneEnd = starts[cur] + events[cur].duration;
    if (isQueued) {
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
  }, [events, starts, isQueued, playlist, loopMode, seek]);

  const startPlaylist = useCallback(
    (nextKind, { ids = null, label = '', fromStart = false } = {}) => {
      markManualChapterJump();
      const nextMeta = {
        kind: nextKind,
        label: label || (TYPES[nextKind]?.label ?? ''),
        ids,
      };
      setPlaylistMeta(nextMeta);
      const nextList =
        nextKind === 'custom' && Array.isArray(ids)
          ? events.map((e, i) => (ids.includes(e.id) ? i : -1)).filter((i) => i >= 0)
          : buildPlaylist(events, nextKind);
      if (nextList.length) {
        const startIdx = !fromStart && nextList.includes(indexRef.current) ? indexRef.current : nextList[0];
        seek(starts[startIdx], false);
        setHasStartedPlayback(true);
        setPlaying(true);
      }
      jumpedInPanelRef.current = true;
      setPanel(null);
    },
    [events, starts, seek, markManualChapterJump],
  );

  const exitPlaylist = useCallback(
    (quiet = false) => {
      if (playlistMeta.kind === 'all') return;
      lastPlaylistRef.current = playlistMeta;
      setPlaylistMeta({ kind: 'all', label: '', ids: null });
      if (!quiet) {
        setUndoPlaylistAvailable(true);
        setNotice(`已退出「${playlistMeta.label || '专题'}」连播。`);
      }
    },
    [playlistMeta],
  );

  const restorePlaylist = useCallback(() => {
    if (!lastPlaylistRef.current) return;
    const prev = lastPlaylistRef.current;
    lastPlaylistRef.current = null;
    setUndoPlaylistAvailable(false);
    setNotice('');
    setPlaylistMeta(prev);
  }, []);

  const toggleWalkman = useCallback(() => {
    setBackgroundAudio((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(WALKMAN_KEY, String(next));
      } catch {
        // Keep current session switchable if storage is unavailable.
      }
      if (next && narration.hasAudioTrack && !narration.voice) {
        narration.enableVoice();
      }
      setNotice(
        next
          ? '已开启随身听：切后台或锁屏后将继续播放，可用耳机切换上下幕。'
          : '已关闭随身听：切后台或锁屏时将自动暂停。',
      );
      return next;
    });
  }, [narration]);

  const toggleSfx = useCallback(() => {
    setSfx((prev) => {
      const next = writeSfxPreference(!prev);
      setSfxEnabled(next);
      return next;
    });
  }, []);

  const inspectOnMap = useCallback(
    (eventId, context) => {
      exitPlaylist(true);
      if (context.compareState) setCompareState((prev) => ({ ...(prev || {}), ...context.compareState }));
      if (context.examState) setExamState((prev) => ({ ...(prev || {}), ...context.examState }));
      setReturnContext({ panel: context.panel, label: context.label });
      jumpedInPanelRef.current = true;
      setPanel(null);
      const targetVol = volumeIdForEvent(eventId);
      if (targetVol !== volumeId) {
        switchVolumeWithMemory(targetVol, eventId, true);
        return;
      }
      selectEvent(eventId, false);
      setHasStartedPlayback(true);
      setPlaying(true);
    },
    [volumeId, switchVolumeWithMemory, selectEvent, exitPlaylist],
  );

  // Reset stage view to default per-node presentation whenever moving to another event.
  useEffect(() => {
    setStageView('cinema');
  }, [scene.id]);

  // Auto-scroll active event into view when Directory opens.
  useEffect(() => {
    if (panel !== 'directory') return;
    const timer = window.setTimeout(() => {
      directoryListRef.current?.querySelector('.current')?.scrollIntoView({ block: 'center' });
    }, 30);
    return () => window.clearTimeout(timer);
  }, [panel]);

  // Sync clock, index, URL, and document title when switching volumes or fulfilling a cross-volume jump.
  useEffect(() => {
    const volumeChanged = prevVolumeRef.current !== volumeId;
    const hasPending = pendingNav && pendingNav.volumeId === volumeId;
    if (!volumeChanged && !hasPending) return;
    prevVolumeRef.current = volumeId;

    const targetId = hasPending ? pendingNav.eventId : null;
    const autoPlay = hasPending ? Boolean(pendingNav.autoPlay) : false;
    if (hasPending) onConsumePendingNav();

    const savedPos = !targetId ? volumePositionsRef.current[volumeId] : null;
    let nextIdx = 0;
    let nextStart = 0;
    if (targetId) {
      nextIdx = Math.max(0, events.findIndex((e) => e.id === targetId));
      nextStart = starts[nextIdx] ?? 0;
    } else if (savedPos?.eventId) {
      const foundIdx = events.findIndex((e) => e.id === savedPos.eventId);
      if (foundIdx >= 0) {
        nextIdx = foundIdx;
        nextStart =
          Number.isFinite(savedPos.time) && savedPos.time >= starts[foundIdx] && savedPos.time < total
            ? savedPos.time
            : starts[foundIdx];
      }
    }

    setPlaylistMeta({ kind: 'all', label: '', ids: null });
    setNextVolDismissed(false);
    setOverview(false);
    clock.current.time = nextStart;
    indexRef.current = nextIdx;
    beatRef.current = 0;
    captionRef.current = -1;
    setIndex(nextIdx);
    setDetailId(events[nextIdx].id);
    setDetailHistory([]);
    setBeatIndex(0);
    setCaptionIndex(-1);
    lastFoleyKeyRef.current = `${events[nextIdx].id}:0`;
    manualSeekUntilRef.current = performance.now() + 300;
    narration.syncSeek(nextStart);
    if (autoPlay) setHasStartedPlayback(true);
    setPlaying(autoPlay);
    paintTime();
    if (volumeChanged && !targetId && nextIdx > 0) {
      setNotice(`已回到上次观看的「${events[nextIdx].title}」`);
    }
  }, [volumeId, pendingNav, onConsumePendingNav, events, starts, total, narration.syncSeek, paintTime]);

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
            !isQueued
              ? data.chapters[scene.chapter]?.title || meta.label
              : `专题连播 · ${playlistMeta.label || TYPES[playlistKind]?.label || '精选'}`,
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

  const canFullscreen = Boolean(
    typeof document !== 'undefined' &&
      document.documentElement?.requestFullscreen &&
      !window.matchMedia?.('(max-width: 760px)')?.matches,
  );

  const openPanel = useCallback(
    (nextPanel) => {
      if (!panel) {
        wasPlayingBeforePanelRef.current = playing;
        jumpedInPanelRef.current = false;
      }
      setPlaying(false);
      setPanel(nextPanel);
    },
    [panel, playing],
  );

  const closePanel = useCallback((allowAutoResume = true) => {
    setPanel(null);
    if (allowAutoResume && wasPlayingBeforePanelRef.current && !jumpedInPanelRef.current) {
      setPlaying(true);
    }
    wasPlayingBeforePanelRef.current = false;
    jumpedInPanelRef.current = false;
  }, []);

  const openDetails = (id = scene.id, tab = 'summary', { pushHistory = false } = {}) => {
    if (pushHistory && panel === 'detail' && id !== detailId) {
      setDetailHistory((prev) => [...prev, detailId]);
    } else if (panel !== 'detail') {
      setDetailHistory([]);
    }
    if (id !== detailId) {
      setClozeMasked(true);
      setClozeRevealed({});
    }
    setDetailId(id);
    setDetailTab(tab);
    openPanel('detail');
  };
  const openDirectory = () => openPanel('directory');
  const openCompare = () => {
    setCompareState((prev) => {
      if (prev) return prev;
      const matchedSet = CONFUSION_SETS.find((s) => s.items.some((item) => item.id === scene.id));
      const fallbackId = volumeId === 'prc' ? 'three-transformations' : 'land-evolution';
      return {
        mode: 'preset',
        scope: 'all',
        setId: matchedSet?.id || fallbackId,
        pair: ['land-74', 'land-75'],
        evoSteps: {},
      };
    });
    openPanel('compare');
  };
  const openExam = () => openPanel('exam');
  const full = async () => {
    document.getElementById('player-prefs-popover')?.hidePopover?.();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice('当前浏览器不支持自动全屏，可按 F11（Mac 为 Control+Command+F）手动切换。');
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (
        dialogRef.current?.open ||
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey
      ) {
        return;
      }
      const isInteractiveTarget = /BUTTON|A/.test(e.target.tagName);
      if (e.code === 'Space' && !isInteractiveTarget) {
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
      if ((e.key === 'm' || e.key === 'M') && !isInteractiveTarget) {
        e.preventDefault();
        narration.toggleVoice();
      }
      if ((e.key === 'c' || e.key === 'C') && !isInteractiveTarget) {
        e.preventDefault();
        narration.toggleCaptions();
      }
      if ((e.key === 'f' || e.key === 'F') && !isInteractiveTarget && canFullscreen) {
        e.preventDefault();
        full();
      }
      if (e.key === '/' && !isInteractiveTarget) {
        e.preventDefault();
        openDirectory();
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
  }, [toggle, step, backgroundAudio, playing, narration, total, starts, paintTime, canFullscreen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (panel) {
      cancelTopLayerClose(dialog);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      closeTopLayer(dialog);
    }
  }, [panel]);

  // Animate native Esc / backdrop cancel on browsers lacking top-layer exit support,
  // and provide Safari outside pointerdown+pointerup light dismiss.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const onCancel = (e) => {
      if (!supportsTopLayerExit()) {
        e.preventDefault();
        closeTopLayer(dialog, () => closePanel(true));
      }
    };
    dialog.addEventListener('cancel', onCancel);
    if ('closedBy' in HTMLDialogElement.prototype) {
      return () => dialog.removeEventListener('cancel', onCancel);
    }
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
      if (pressedOutside && dialog.open && isOutside(e)) {
        closeTopLayer(dialog, () => closePanel(true));
      }
      pressedOutside = false;
    };
    dialog.addEventListener('pointerdown', onDown);
    dialog.addEventListener('pointerup', onUp);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('pointerdown', onDown);
      dialog.removeEventListener('pointerup', onUp);
    };
  }, [closePanel]);

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
  const searchingAllVolumes = query.trim().length > 0 || masteryFilter !== 'all';
  const hasDirectoryFilters = Boolean(query.trim() || kind !== 'all' || masteryFilter !== 'all');
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
  const currentVolFilteredIds = useMemo(
    () =>
      directoryResults
        .filter((r) => volumeIdForEvent(r.event.id) === volumeId)
        .map((r) => r.event.id),
    [directoryResults, volumeId],
  );

  const canStepPrev =
    !isQueued
      ? loopMode
        ? true
        : safeIndex > 0
      : prevInPlaylist(playlist, safeIndex, { loop: loopMode }) !== null;
  const canStepNext =
    !isQueued
      ? loopMode
        ? true
        : safeIndex < events.length - 1
      : nextInPlaylist(playlist, safeIndex, { loop: loopMode }) !== null;

  const showNextVolumeBanner =
    Boolean(meta.nextVolumeId) &&
    safeIndex === events.length - 1 &&
    !playing &&
    !nextVolDismissed &&
    !returnContext;

  const isWideDialog = panel === 'compare' || panel === 'exam';

  const detailAllBlankKeys = useMemo(() => {
    if (panel !== 'detail' || detailTab !== 'review') return [];
    const keys = [];
    buildClozeSegments(detail.headline).forEach((s) => {
      if (s.blank) keys.push(`rev-h-${detail.id}-${s.id}`);
    });
    buildClozeSegments(detail.summary).forEach((s) => {
      if (s.blank) keys.push(`rev-s-${detail.id}-${s.id}`);
    });
    return keys;
  }, [panel, detailTab, detail.id, detail.headline, detail.summary]);
  const detailAllRevealed =
    clozeMasked && detailAllBlankKeys.length > 0 && detailAllBlankKeys.every((k) => clozeRevealed[k]);

  return (
    <main
      className="experience narrated-experience"
      onPointerUp={(e) => {
        // Release focus after mouse/touch clicks on toolbar/player buttons so global Space/Arrow shortcuts stay usable.
        if (e.pointerType !== 'keyboard') {
          const btn = e.target.closest?.('button');
          if (btn && !btn.closest('dialog')) btn.blur();
        }
      }}
    >
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
          <div className="volume-switch" role="group" aria-label="切换上下篇">
            {VOLUME_ORDER.map((vid) => {
              const v = VOLUMES[vid];
              const active = vid === volumeId;
              const loadingThis = switchingVolume === vid;
              const volPrefix = vid === 'modern' ? '上篇 · ' : '下篇 · ';
              return (
                <button
                  key={vid}
                  type="button"
                  className={`volume-pill ${active ? 'is-active' : ''} ${loadingThis ? 'is-loading' : ''}`}
                  aria-pressed={active}
                  aria-busy={loadingThis || undefined}
                  disabled={Boolean(switchingVolume)}
                  title={`${volPrefix}${v.label}（${v.range}）`}
                  onClick={() => {
                    if (vid !== volumeId) switchVolumeWithMemory(vid, null, false);
                  }}
                >
                  <span>
                    <em className="vol-prefix">{volPrefix}</em>
                    {loadingThis ? `${v.shortLabel}…` : v.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="header-actions">
          <button type="button" onClick={openCompare} title="高频易混史事同屏对照">
            <Scales size={17} />
            <span className="label-wide">易混对照</span>
            <span className="label-narrow">对照</span>
          </button>
          <button type="button" className="exam-entry" onClick={openExam} title="2017—2026 史纲真题复测">
            <Exam size={17} />
            <span className="label-wide">真题复测</span>
            <span className="label-narrow">真题</span>
            {dueIds.length > 0 && <em className="due-badge" aria-label={`${dueIds.length}题待复习`}>{dueIds.length}</em>}
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
            <span key={theme} className="icon-swap">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
          </button>
        </div>
      </header>

      <section
        className={`stage ${playing ? 'is-playing' : 'is-paused'}`}
        aria-label="历史叙事主画面"
      >
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
            reduceMotion={reduceMotion}
          />

          <EraCanvas
            eraKey={sceneAtmosphere.eraKey}
            theme={theme}
            playing={playing}
            reduce={reduceMotion}
            active={!overview && !cinemaActive && !isDiagramScene && !isCompactViewport}
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
            {cinemaActive ? (
              <button
                type="button"
                className="stage-mode-btn"
                title="切到地图图解视角对比"
                onClick={() => setStageView('map')}
              >
                <Stack size={14} />
                <span>切到地图</span>
              </button>
            ) : (
              <>
                {pilotStage && !overview && (
                  <button
                    type="button"
                    className="stage-mode-btn is-cinema"
                    title="切回本幕视觉特写"
                    onClick={() => setStageView('cinema')}
                  >
                    <Stack size={14} />
                    <span>切回特写</span>
                  </button>
                )}
                <button
                  type="button"
                  className={overview ? 'selected' : ''}
                  onClick={() => setOverview((v) => !v)}
                  title={overview ? '回到当前幕局部视图' : '查看全国总览'}
                >
                  <Compass size={15} />
                  <span>{overview ? '回到本幕' : '查看全图'}</span>
                </button>
                <button
                  type="button"
                  aria-label="放大地图"
                  disabled={zoom >= 1.6}
                  onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.15) * 100) / 100))}
                >
                  <Plus size={14} />
                </button>
                <button
                  type="button"
                  aria-label="缩小地图"
                  disabled={zoom <= 0.7}
                  onClick={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.15) * 100) / 100))}
                >
                  <Minus size={14} />
                </button>
                {Math.abs(zoom - 1) > 0.01 && (
                  <button type="button" aria-label="复原地图比例" onClick={() => setZoom(1)}>
                    <span>复原</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <ChapterIntertitle
          eraKey={sceneAtmosphere.eraKey}
          volumeId={volumeId}
          chapterIndex={scene.chapter}
          chapterTitle={data.chapters[scene.chapter]?.title}
          playing={playing}
          overview={overview}
          reduce={reduceMotion}
          suppress={suppressIntertitle}
        />

        <article className="story" key={scene.id}>
          <div className="story-head-meta">
            <div className="year-line">
              <YearRoll year={scene.year} reduce={reduceMotion} />
              <span className="year-unit">年</span>
              {scene.endYear && <span className="period-end">— {scene.endYear}</span>}
            </div>
            <div className="story-category" style={{ color: type.color }}>
              <type.Icon size={14} />
              {type.label}
              {(() => {
                const beatDateText = currentBeat?.date || readableDate(scene);
                return beatDateText && beatDateText !== `${scene.year}年` ? (
                  <>
                    <span>·</span>
                    <span>{beatDateText}</span>
                  </>
                ) : null;
              })()}
            </div>
          </div>
          <div className="story-title-row">
            <h1 className={scene.title.length > 20 ? 'long-title' : ''}>{scene.title}</h1>
            <button type="button" className="details-trigger details-trigger-compact" onClick={() => openDetails()}>
              详情
            </button>
          </div>
          {currentBeat && (
            <h2 key={`${scene.id}:${beatIndex}`} className="beat-title">
              {currentBeat.title}
            </h2>
          )}
          <KineticCopy
            text={currentBeat?.text || scene.summary}
            beatKey={`${scene.id}:${beatIndex}`}
            playing={playing}
            reduce={reduceMotion}
          />
          {authored && (
            <nav className="beat-navigation" aria-label="本幕阶段">
              {authored.beats.map((beat, i) => (
                <button
                  key={beat.at}
                  type="button"
                  aria-current={i === beatIndex ? 'step' : undefined}
                  onClick={() => seek(starts[safeIndex] + playbackTimeFor(authored, scene, beat.at) + 0.12, false)}
                  title={beat.title}
                >
                  {beat.short}
                </button>
              ))}
            </nav>
          )}
          <div className="story-bottom">
            <button type="button" className="details-trigger" onClick={() => openDetails()}>
              详情与自测
            </button>
            {!hasStartedPlayback && !playing && safeIndex === 0 && (
              <button type="button" className="hero-start-cta" onClick={toggle}>
                <Play size={13} weight="fill" />
                <span>开始播放 · {Math.round(total / 60)} 分钟</span>
              </button>
            )}
          </div>
        </article>

        {returnContext && (
          <div className="return-context-pill" role="region" aria-label={returnContext.label}>
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
              onClick={() => switchVolumeWithMemory(meta.nextVolumeId, null, true)}
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

        {narration.captionsVisible && activeCaption && (hasStartedPlayback || playing || clock.current.time > 0.2) && (
          <div className="narration-subtitles" aria-label="配音字幕">
            <p key={activeCaption.text}>{activeCaption.text}</p>
          </div>
        )}
      </section>

      <footer className="player">
        {(isQueued || loopMode || backgroundAudio) && (
          <div className="playlist-bar" role="status">
            <span className="playlist-status-pills">
              {isQueued && (
                <span>
                  连播队列 · <strong>{playlistMeta.label || TYPES[playlistKind]?.label}</strong>
                  <small>
                    {playlistPos >= 0 ? `${playlistPos + 1} / ${playlist.length}` : `${playlist.length} 幕`} · 约{' '}
                    {formatClock(playlistTotalSeconds)}
                  </small>
                </span>
              )}
              {loopMode && (
                <button
                  type="button"
                  className="status-chip"
                  onClick={() => setLoopMode(false)}
                  title="点击关闭循环"
                >
                  {isQueued ? '专题循环' : '单章循环'} ×
                </button>
              )}
              {backgroundAudio && (
                <button
                  type="button"
                  className="status-chip"
                  onClick={toggleWalkman}
                  title="点击关闭随身听"
                >
                  随身听 ×
                </button>
              )}
            </span>
            {isQueued && (
              <button type="button" onClick={() => exitPlaylist(false)}>
                退出连播 <X size={13} />
              </button>
            )}
          </div>
        )}

        <div className="timeline-track">
          <div ref={progressRef} className="timeline-fill" />
          <div className={`scene-ticks ${isQueued ? 'is-filtered' : ''}`} aria-hidden="true">
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
              markManualChapterJump();
              seek(Number(e.target.value));
            }}
            onPointerUp={() => {
              if (isQueued && playlist.length && !playlistSet.has(indexRef.current)) {
                const nearest = playlist.reduce(
                  (best, idx) =>
                    Math.abs(idx - indexRef.current) < Math.abs(best - indexRef.current) ? idx : best,
                  playlist[0],
                );
                seek(starts[nearest], !playing);
              }
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
              <span key={playing ? 'pause' : 'play'} className="icon-swap">
                {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
              </span>
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
            <span ref={elapsedRef}>
              {formatClock(
                isQueued
                  ? playlistElapsed(events, starts, playlist, safeIndex, clock.current.time)
                  : clock.current.time,
              )}
            </span>
            <span>/</span>
            <span>{formatClock(isQueued ? playlistTotalSeconds : total)}</span>
          </div>
          <div className="transport-secondary">
            <button
              type="button"
              className={`narration-toggle ${narration.voice ? 'is-active' : ''}`}
              aria-label={narration.voice ? '关闭配音' : '开启配音'}
              aria-pressed={narration.voice}
              aria-description={narration.manifest?.disclosure}
              title={
                !narration.hasAudioTrack
                  ? '本篇暂未提供配音，可开启字幕配合观看'
                  : narration.loading
                    ? '配音载入中'
                    : `${narration.voice ? '关闭' : '开启'}配音${
                        narration.manifest?.engine === 'GPT-SoVITS' ? '（AI合成）' : ''
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
              title="配音字幕（C）"
              onClick={narration.toggleCaptions}
            >
              <ClosedCaptioning size={18} />
              <span>字幕</span>
            </button>
            <button
              type="button"
              className={`narration-toggle rate-cycle-btn ${rate !== 1 ? 'is-active' : ''}`}
              aria-label={`当前倍速 ${rate}×，点击切换倍速`}
              title="切换播放倍速"
              onClick={() =>
                setRate((r) => RATE_OPTIONS[(RATE_OPTIONS.indexOf(r) + 1) % RATE_OPTIONS.length])
              }
            >
              <span key={rate} className="icon-swap">
                {rate}×
              </span>
            </button>
            <button
              type="button"
              className={`narration-toggle prefs-trigger ${
                rate !== 1 || loopMode || backgroundAudio ? 'has-active-pref' : ''
              }`}
              popoverTarget="player-prefs-popover"
              aria-label="播放设置与更多工具"
              title="倍速、循环、音效、随身听与备份"
            >
              <SlidersHorizontal size={18} />
              <span>设置</span>
              {(loopMode || backgroundAudio) && <i className="pref-dot" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div id="player-prefs-popover" popover="auto" className="prefs-popover" aria-label="播放设置">
          <div className="prefs-section">
            <span className="prefs-label">播放速度</span>
            <div className="prefs-rate-row" role="group" aria-label="选择播放速度">
              {RATE_OPTIONS.map((v) => (
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
              className={`prefs-row sfx-toggle ${sfx && !reduceMotion ? 'is-active' : ''}`}
              aria-pressed={sfx}
              disabled={reduceMotion}
              title={reduceMotion ? '系统已开启减弱动态效果，音效已自动静音' : undefined}
              onClick={toggleSfx}
            >
              <Waveform size={17} />
              <span>音效</span>
              <em>{reduceMotion ? '减动效已静音' : sfx ? '已开' : '已关'}</em>
            </button>
            <button
              type="button"
              className={`prefs-row ${loopMode ? 'is-active' : ''}`}
              aria-pressed={loopMode}
              onClick={() => setLoopMode((v) => !v)}
            >
              <Repeat size={17} />
              <span>{isQueued ? '专题循环' : '单章循环'}</span>
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
                document.getElementById('player-prefs-popover')?.hidePopover?.();
                setPlaylistMeta({ kind: 'all', label: '', ids: null });
                setHasStartedPlayback(true);
                seek(0, false);
                setPlaying(true);
              }}
            >
              <ArrowCounterClockwise size={15} />
              <span>从头播放本篇</span>
            </button>
            {canFullscreen && (
              <button type="button" onClick={full}>
                <ArrowsOut size={15} />
                <span>{fullScreen ? '退出全屏' : '全屏'}</span>
              </button>
            )}
          </div>
          <div className="prefs-footer">
            <button
              type="button"
              onClick={() => {
                handleExportBackup();
                setNotice('已保存记录备份文件，可在其他设备导入恢复。');
              }}
            >
              <DownloadSimple size={14} />
              <span>导出备份</span>
            </button>
            <button type="button" onClick={() => prefsBackupInputRef.current?.click()}>
              <UploadSimple size={14} />
              <span>导入备份</span>
            </button>
            <input
              ref={prefsBackupInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  const summary = handleImportBackup(await file.text());
                  setNotice(
                    `已合并记录：新增 ${summary.addedAttempts} 次作答、更新 ${summary.updatedMastery} 条掌握度。`,
                  );
                } catch (err) {
                  setNotice(err.message || '无法识别该文件，请选择之前从「史序」导出的备份文件。');
                }
              }}
            />
          </div>
          <div className="prefs-footer prefs-footer-links">
            <a href={`./?lesson=road&fromVol=${volumeId}&fromEvent=${scene.id}`}>
              <span>打开 90 秒互动精讲</span>
              <ArrowUpRight size={14} />
            </a>
            {REPO.url && (
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
            )}
          </div>
        </div>

        {narration.voice && playing && narration.waiting && (
          <span className="narration-waiting" role="status">
            配音载入中…
          </span>
        )}

        <div className="chapter-track">
          {chapterStarts.map((c, i) => {
            const firstInQueue = isQueued ? playlist.find((idx) => events[idx].chapter === i) : null;
            const disabledInQueue = isQueued && firstInQueue === undefined;
            return (
              <button
                key={c.title}
                type="button"
                className={scene.chapter === i ? 'active' : ''}
                disabled={disabledInQueue}
                style={{ width: `${(((chapterStarts[i + 1]?.time || total) - c.time) / total) * 100}%` }}
                onClick={() => {
                  markManualChapterJump();
                  if (isQueued) {
                    if (firstInQueue !== undefined) seek(starts[firstInQueue]);
                    return;
                  }
                  seek(c.time);
                }}
              >
                <span>{c.range}</span>
                <strong>{c.title}</strong>
              </button>
            );
          })}
        </div>
      </footer>

      <dialog
        ref={dialogRef}
        closedby="any"
        className={`reading-dialog ${panel === 'directory' ? 'directory-dialog' : ''} ${isWideDialog ? 'wide-dialog' : ''}`}
        onClose={() => {
          if (!dialogRef.current?.open) closePanel(true);
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-content">
          <div className="dialog-top">
            <button type="button" className="icon-button" aria-label="关闭弹窗" onClick={() => closePanel(true)}>
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
                compareState={compareState}
                onCompareStateChange={setCompareState}
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
                onRetryExam={loadExamQuestions}
                examState={examState}
                onExamStateChange={setExamState}
                submittedByQuestion={examSubmitted}
                onSubmittedChange={setExamSubmitted}
              />
            </Suspense>
          )}

          {panel === 'directory' && (
            <>
              <h2 id="dialog-title">史事目录与导览</h2>
              <div className="directory-featured">
                <a className="directory-sample-card" href={`./?lesson=road&fromVol=${volumeId}&fromEvent=${scene.id}`}>
                  <div>
                    <strong>道路与建军 · 90 秒互动精讲</strong>
                    <span>秋收起义 → 三湾改编 → 古田会议，含决策判断与章末复原</span>
                  </div>
                  <ArrowUpRight size={17} />
                </a>
                <div className="directory-spotlight-row" aria-label="精选视觉特写与演化">
                  {PILOT_STAGE_LIST.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`spotlight-chip ${scene.id === item.id && cinemaActive ? 'is-active' : ''}`}
                      onClick={() =>
                        inspectOnMap(item.id, {
                          panel: 'directory',
                          label: '返回目录',
                        })
                      }
                    >
                      <strong>{item.title}</strong>
                      <span>{item.shortLabel}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="spotlight-chip"
                    onClick={() => {
                      setCompareState({
                        mode: 'preset',
                        scope: 'cross',
                        setId: 'land-evolution',
                        pair: ['land-74', 'land-75'],
                        evoSteps: {},
                      });
                      setPanel('compare');
                    }}
                  >
                    <strong>土地政策演进</strong>
                    <span>12 步演化</span>
                  </button>
                </div>
              </div>
              <div className="search-field">
                <MagnifyingGlass size={18} />
                <input
                  aria-label="搜索史事、年份、地点或关键词"
                  placeholder="搜索史事、年份、地点或关键词"
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
                {hasDirectoryFilters && (
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={() => {
                      setQuery('');
                      setKind('all');
                      setMasteryFilter('all');
                    }}
                  >
                    清除筛选
                  </button>
                )}
              </div>
              <div className="directory-count">
                <span>
                  {directoryResults.length} 条{searchingAllVolumes ? '（全部两篇）' : `（${meta.shortLabel}）`}
                </span>
                {currentVolFilteredIds.length > 0 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      if (query.trim() || masteryFilter !== 'all') {
                        startPlaylist('custom', {
                          ids: currentVolFilteredIds,
                          label: masteryFilter === 'review' ? '需巩固史事' : '筛选结果',
                        });
                      } else {
                        startPlaylist(kind, { fromStart: kind === 'all' });
                      }
                    }}
                  >
                    <Play size={13} weight="fill" />
                    {query.trim() || masteryFilter !== 'all'
                      ? `连播当前 ${currentVolFilteredIds.length} 幕`
                      : kind === 'all'
                        ? `从头连播本篇（约 ${Math.round(total / 60)} 分钟）`
                        : `连播「${TYPES[kind].label}」专题`}
                  </button>
                )}
              </div>
              <div ref={directoryListRef} className="directory-list">
                {directoryResults.map(({ event: e, snippet }) => {
                  const mastery = studyState.mastery[e.id]?.level;
                  const masteryLabel = MASTERY_OPTIONS.find((m) => m.id === mastery)?.label;
                  const eventVol = volumeIdForEvent(e.id);
                  return (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => {
                        if (isQueued && !playlistSet.has(events.findIndex((item) => item.id === e.id))) {
                          exitPlaylist(true);
                        }
                        jumpedInPanelRef.current = true;
                        selectEvent(e.id);
                        closePanel(false);
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
                            <span
                              className={`mastery-pill mastery-${mastery}`}
                              aria-label={`掌握度：${masteryLabel}`}
                            >
                              {masteryLabel}
                            </span>
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
                  <div className="empty-search">
                    {hasDirectoryFilters ? (
                      <>
                        <p>当前筛选下没有匹配史事。</p>
                        <button
                          type="button"
                          className="pill-toggle"
                          onClick={() => {
                            setQuery('');
                            setKind('all');
                            setMasteryFilter('all');
                          }}
                        >
                          清除筛选
                        </button>
                      </>
                    ) : (
                      <p>未找到相关史事，可换年份、地点或简称试试。</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {panel === 'detail' && (
            <>
              {detailHistory.length > 0 && (() => {
                const prevDetailId = detailHistory.at(-1);
                const prevDetail = allEvents.find((e) => e.id === prevDetailId);
                return (
                  <button
                    type="button"
                    className="detail-back-link"
                    onClick={() => {
                      setDetailHistory((prev) => prev.slice(0, -1));
                      setDetailId(prevDetailId);
                      setClozeMasked(true);
                      setClozeRevealed({});
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>返回「{prevDetail?.title || '上一史事'}」</span>
                  </button>
                );
              })()}
              <h2 id="dialog-title">{detail.title}</h2>
              <div className="detail-date">
                {readableDate(detail)}
                <span>·</span>
                {detail.location}
              </div>
              <nav className="detail-tabs" role="tablist" aria-label="史事详情">
                {[
                  { id: 'summary', label: '史事解读' },
                  { id: 'review', label: '遮词自测' },
                  { id: 'original', label: '资料原文' },
                ].map((tabItem) => {
                  const selected = detailTab === tabItem.id;
                  const tabIds = ['summary', 'review', 'original'];
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      className={selected ? 'active' : ''}
                      onKeyDown={(e) => {
                        const idx = tabIds.indexOf(detailTab);
                        let nextIdx = -1;
                        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabIds.length;
                        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabIds.length) % tabIds.length;
                        if (nextIdx >= 0) {
                          e.preventDefault();
                          setDetailTab(tabIds[nextIdx]);
                        }
                      }}
                      onClick={() => setDetailTab(tabItem.id)}
                    >
                      {tabItem.label}
                    </button>
                  );
                })}
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
                      <button
                        type="button"
                        key={e.id}
                        onClick={() => openDetails(e.id, 'summary', { pushHistory: true })}
                      >
                        <span className="related-type">{TYPES[e.kind].label}</span>
                        <span>
                          {e.title}
                          <small>{e.year}年</small>
                        </span>
                        <CaretRight size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {detailTab === 'review' && (
                <div className="detail-body review-body">
                  <h3>“{detail.title}”的核心内容和历史意义是什么？</h3>
                  <p className="cloze-tip">
                    已遮挡核心关键词，先尝试回忆，点击遮挡块即可核对。
                  </p>
                  <div className="recalled-answer cloze-card">
                    <span>
                      <Check size={16} />
                      遮词自测
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
                        className={`pill-toggle ${clozeMasked && !detailAllRevealed ? 'is-active' : ''}`}
                        aria-pressed={clozeMasked && !detailAllRevealed}
                        onClick={() => {
                          if (detailAllRevealed) {
                            setClozeMasked(true);
                            setClozeRevealed({});
                          } else {
                            setClozeMasked((v) => !v);
                            setClozeRevealed({});
                          }
                        }}
                      >
                        {clozeMasked && !detailAllRevealed ? <Eye size={15} /> : <EyeSlash size={15} />}
                        <span>{clozeMasked && !detailAllRevealed ? '显示全部关键词' : '重新遮挡自测'}</span>
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setDetailTab('original')}
                      >
                        核对原文
                      </button>
                    </div>
                  </div>

                  <div className="mastery-box">
                    <span className="mastery-label">本幕掌握度</span>
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
                          onClick={() => openDetails(e.id, 'original', { pushHistory: true })}
                        >
                          {e.title}
                          <CaretRight size={14} />
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
                  if (detail.id === scene.id) {
                    closePanel(true);
                    return;
                  }
                  jumpedInPanelRef.current = true;
                  selectEvent(detail.id);
                  closePanel(false);
                }}
              >
                {detail.id === scene.id ? '返回继续观看' : '切到此幕'}
                <ArrowRight size={17} />
              </button>
            </>
          )}
        </div>
      </dialog>

      {(externalNotice || notice) && (
        <div className="notice" role="status">
          <span>{externalNotice || notice}</span>
          {undoResetAvailable && (
            <button type="button" className="notice-action" onClick={handleUndoResetStudy}>
              撤销清空
            </button>
          )}
          {undoPlaylistAvailable && (
            <button type="button" className="notice-action" onClick={restorePlaylist}>
              恢复连播
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setUndoPlaylistAvailable(false);
              onClearExternalNotice?.();
            }}
            aria-label="关闭提示"
          >
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
  const [switchingVolume, setSwitchingVolume] = useState(null);
  const [switchNotice, setSwitchNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    const primaryVol = isLesson ? DEFAULT_VOLUME_ID : initialVol;
    const secondaryVol = primaryVol === 'modern' ? 'prc' : 'modern';

    Promise.all([
      fetch(sitePath('/data/china-d3.json')).then((r) => {
        if (!r.ok) throw new Error('地图底图暂时加载失败，请检查网络后重试。');
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
      .catch(() => {
        if (alive) setError('网络波动或资源加载中断，请稍后重试。');
      });

    return () => {
      alive = false;
    };
  }, [isLesson, initialVol]);

  const handleSwitchVolume = useCallback((nextVolId, targetEventId = null, autoPlay = false) => {
    const id = normalizeVolumeId(nextVolId);
    setSwitchNotice('');
    setSwitchingVolume(id);
    setPendingNav({ volumeId: id, eventId: targetEventId, autoPlay });
    loadVolumeBundle(id)
      .then((bundle) => {
        setBundles((prev) => (prev[id] ? prev : { ...prev, [id]: bundle }));
        setVolumeId(id);
      })
      .catch(() => {
        setPendingNav(null);
        setSwitchNotice(`网络波动，「${VOLUMES[id].label}」暂时无法载入，请重试。`);
      })
      .finally(() => {
        setSwitchingVolume((cur) => (cur === id ? null : cur));
      });
  }, []);

  const consumePendingNav = useCallback(() => setPendingNav(null), []);
  const clearSwitchNotice = useCallback(() => setSwitchNotice(''), []);

  if (error) {
    return (
      <main className="load-screen">
        <Compass size={36} />
        <h1>页面暂时加载失败</h1>
        <p>{error}</p>
        <button type="button" onClick={() => location.reload()}>
          重新加载
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
          <p>正在载入 90 秒互动精讲…</p>
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
      switchingVolume={switchingVolume}
      pendingNav={pendingNav}
      onConsumePendingNav={consumePendingNav}
      externalNotice={switchNotice}
      onClearExternalNotice={clearSwitchNotice}
    />
  );
}
