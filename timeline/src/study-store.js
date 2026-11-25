/**
 * Unified local-first study state: spaced exam reviews ([1, 3, 7] days),
 * per-node mastery ratings, JSON backup/import, and full-text keyword search.
 */
import { ROAD_STORAGE_KEY } from './road-questions.js';

export const STUDY_STORAGE_KEY = 'shixu-study-v1';
export const REVIEW_DAYS = [1, 3, 7];
export const MASTERY_LEVELS = ['known', 'fuzzy', 'forgot'];
const DAY_MS = 24 * 60 * 60 * 1000;

export const emptyStudyState = () => ({
  version: 1,
  attempts: [],
  schedules: {},
  mastery: {},
});

function sanitizeState(raw, validQuestionIds, validEventIds) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) {
    throw new Error('无法识别该备份文件的记录结构，请确认文件未损坏。');
  }
  const hasQFilter = validQuestionIds && validQuestionIds.size > 0;
  const hasEFilter = validEventIds && validEventIds.size > 0;

  const attempts = Array.isArray(raw.attempts)
    ? raw.attempts.filter(
        (a) =>
          a &&
          typeof a.id === 'string' &&
          typeof a.questionId === 'string' &&
          (!hasQFilter || validQuestionIds.has(a.questionId)) &&
          Number.isFinite(a.at) &&
          typeof a.correct === 'boolean' &&
          typeof a.answer === 'string',
      )
    : [];

  const schedules =
    raw.schedules && typeof raw.schedules === 'object'
      ? Object.fromEntries(
          Object.entries(raw.schedules).filter(
            ([id, s]) =>
              (!hasQFilter || validQuestionIds.has(id)) &&
              s &&
              Number.isFinite(s.dueAt) &&
              Number.isInteger(s.step) &&
              s.step >= 0 &&
              s.step < REVIEW_DAYS.length,
          ),
        )
      : {};

  const mastery =
    raw.mastery && typeof raw.mastery === 'object'
      ? Object.fromEntries(
          Object.entries(raw.mastery).filter(
            ([id, entry]) =>
              typeof id === 'string' &&
              id.length > 0 &&
              (!hasEFilter || validEventIds.has(id)) &&
              entry &&
              MASTERY_LEVELS.includes(entry.level) &&
              Number.isFinite(entry.updatedAt),
          ),
        )
      : {};

  return { version: 1, attempts, schedules, mastery };
}

export function readStudyState(storage = globalThis.localStorage, validQuestionIds = null, validEventIds = null) {
  try {
    const text = storage?.getItem?.(STUDY_STORAGE_KEY);
    if (text) {
      return {
        state: sanitizeState(JSON.parse(text), validQuestionIds, validEventIds),
        error: null,
      };
    }
    // Migrate legacy road-study progress seamlessly if present.
    const legacy = storage?.getItem?.(ROAD_STORAGE_KEY);
    if (legacy) {
      return {
        state: sanitizeState({ ...JSON.parse(legacy), mastery: {} }, validQuestionIds, validEventIds),
        error: null,
      };
    }
    return { state: emptyStudyState(), error: null };
  } catch {
    return {
      state: emptyStudyState(),
      error: '本机旧记录读取失败，已开启全新记录，不影响本次继续练习。',
    };
  }
}

export function writeStudyState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(STUDY_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function recordQuestionAttempt(
  state,
  question,
  answer,
  { now = Date.now(), kind = 'practice', assisted = false, id = globalThis.crypto.randomUUID() } = {},
) {
  if (state.attempts.some((a) => a.id === id)) return state;
  const normalized = [...new Set(String(answer || ''))].sort().join('');
  const validLetters = new Set(question.options.map(([letter]) => letter));
  if (
    !normalized ||
    [...normalized].some((c) => !validLetters.has(c)) ||
    (question.type === 'single' && normalized.length !== 1)
  ) {
    throw new Error('请选择有效答案');
  }

  const correct = normalized === question.answer;
  const previous = state.schedules[question.id];
  const delayed = Boolean(previous) && now >= previous.dueAt && kind === 'review';
  const attempt = {
    id,
    questionId: question.id,
    questionVersion: question.version ?? 1,
    at: now,
    answer: normalized,
    correct,
    kind,
    assisted,
    delayed,
  };

  let schedule = previous;
  // Corrections and early practice never count as delayed retention or postpone a due review.
  if (!previous || delayed) {
    const step = delayed && correct && !assisted ? Math.min(previous.step + 1, REVIEW_DAYS.length - 1) : 0;
    schedule = { step, dueAt: now + REVIEW_DAYS[step] * DAY_MS };
  }

  return {
    ...state,
    attempts: [...state.attempts, attempt],
    schedules: { ...state.schedules, [question.id]: schedule },
  };
}

export function dueQuestionIds(state, questions, now = Date.now()) {
  return questions
    .filter((q) => {
      const s = state.schedules[q.id];
      return s && s.dueAt <= now;
    })
    .sort((a, b) => state.schedules[a.id].dueAt - state.schedules[b.id].dueAt)
    .map((q) => q.id);
}

export function nextDueTimestamp(state, questions, now = Date.now()) {
  let soonest = Infinity;
  for (const q of questions) {
    const s = state.schedules[q.id];
    if (s && s.dueAt > now && s.dueAt < soonest) soonest = s.dueAt;
  }
  return Number.isFinite(soonest) ? soonest : null;
}

export function firstAttemptFor(state, questionId) {
  return state.attempts.find((a) => a.questionId === questionId) || null;
}

export function latestAttemptFor(state, questionId) {
  for (let i = state.attempts.length - 1; i >= 0; i--) {
    if (state.attempts[i].questionId === questionId) return state.attempts[i];
  }
  return null;
}

export function setNodeMastery(state, eventId, level, now = Date.now()) {
  const next = { ...state.mastery };
  if (!level) {
    delete next[eventId];
  } else {
    if (!MASTERY_LEVELS.includes(level)) throw new Error(`无效的掌握度等级：${level}`);
    next[eventId] = { level, updatedAt: now };
  }
  return { ...state, mastery: next };
}

export function exportStudyBackup(state, now = new Date()) {
  return JSON.stringify(
    {
      app: 'shixu',
      version: 1,
      exportedAt: now.toISOString(),
      state,
    },
    null,
    2,
  );
}

export function importStudyBackup(jsonText, currentState, validQuestionIds = null, validEventIds = null) {
  let parsed;
  try {
    parsed = JSON.parse(String(jsonText || ''));
  } catch {
    throw new Error('无法识别该文件，请选择之前从「史序」导出的备份文件。');
  }
  const payload = parsed?.app === 'shixu' && parsed?.state ? parsed.state : parsed;
  const incoming = sanitizeState(payload, validQuestionIds, validEventIds);

  const attemptMap = new Map(currentState.attempts.map((a) => [a.id, a]));
  let addedAttempts = 0;
  for (const a of incoming.attempts) {
    if (!attemptMap.has(a.id)) {
      attemptMap.set(a.id, a);
      addedAttempts += 1;
    }
  }
  const attempts = [...attemptMap.values()].sort((a, b) => a.at - b.at);

  const schedules = { ...currentState.schedules };
  for (const [id, s] of Object.entries(incoming.schedules)) {
    const existing = schedules[id];
    if (!existing || s.step > existing.step || (s.step === existing.step && s.dueAt > existing.dueAt)) {
      schedules[id] = s;
    }
  }

  const mastery = { ...currentState.mastery };
  let updatedMastery = 0;
  for (const [id, m] of Object.entries(incoming.mastery)) {
    if (!mastery[id] || m.updatedAt > mastery[id].updatedAt) {
      mastery[id] = m;
      updatedMastery += 1;
    }
  }

  return {
    state: { version: 1, attempts, schedules, mastery },
    summary: { addedAttempts, updatedMastery, totalAttempts: attempts.length },
  };
}

function makeSnippet(text, term) {
  const index = text.toLowerCase().indexOf(term);
  if (index === -1) return '';
  const start = Math.max(0, index - 12);
  const end = Math.min(text.length, index + term.length + 22);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function searchEvents(
  events,
  stories,
  { query = '', kind = 'all', masteryFilter = 'all', masteryMap = {} } = {},
) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];

  for (const event of events) {
    if (kind !== 'all' && event.kind !== kind) continue;
    const level = masteryMap[event.id]?.level || null;
    if (masteryFilter === 'review' && level !== 'fuzzy' && level !== 'forgot') continue;
    if (masteryFilter === 'unmarked' && level !== null) continue;
    if (masteryFilter === 'known' && level !== 'known') continue;

    if (!terms.length) {
      results.push({ event, snippet: '' });
      continue;
    }

    const base = `${event.title} ${event.year} ${event.headline} ${event.summary} ${event.location}`.toLowerCase();
    if (terms.every((t) => base.includes(t))) {
      results.push({ event, snippet: '' });
      continue;
    }

    const beats = stories?.[event.id]?.beats || [];
    const beatsJoined = beats.map((b) => `${b.title} ${b.text}`).join(' ').toLowerCase();
    const originals = event.original || [];
    const originalsJoined = originals.join(' ').toLowerCase();
    const combined = `${base} ${beatsJoined} ${originalsJoined}`;
    if (!terms.every((t) => combined.includes(t))) continue;

    const beatMatch = beats.find((b) => terms.some((t) => `${b.title} ${b.text}`.toLowerCase().includes(t)));
    if (beatMatch) {
      const matchedTerm = terms.find((t) => `${beatMatch.title} ${beatMatch.text}`.toLowerCase().includes(t)) || terms[0];
      results.push({ event, snippet: makeSnippet(`${beatMatch.title}：${beatMatch.text}`, matchedTerm) });
      continue;
    }

    const originalMatch = originals.find((p) => terms.some((t) => p.toLowerCase().includes(t)));
    if (originalMatch) {
      const matchedTerm = terms.find((t) => originalMatch.toLowerCase().includes(t)) || terms[0];
      results.push({ event, snippet: makeSnippet(originalMatch, matchedTerm) });
      continue;
    }

    results.push({ event, snippet: '' });
  }

  return results;
}
