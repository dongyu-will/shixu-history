import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildClozeSegments } from '../src/cloze.js';
import { CONFUSION_SETS, resolveConfusionSet } from '../src/confusion-sets.js';
import {
  buildPlaylist,
  chapterBounds,
  nextInPlaylist,
  playlistDuration,
  playlistElapsed,
  prevInPlaylist,
} from '../src/playlist.js';
import { ROAD_STORAGE_KEY } from '../src/road-questions.js';
import { AUTHORED_STORIES, storyboardEvents } from '../src/stories.js';
import {
  STUDY_STORAGE_KEY,
  dueQuestionIds,
  emptyStudyState,
  exportStudyBackup,
  firstAttemptFor,
  importStudyBackup,
  nextDueTimestamp,
  readStudyState,
  recordQuestionAttempt,
  searchEvents,
  setNodeMastery,
} from '../src/study-store.js';

const history = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const historyPrc = JSON.parse(readFileSync(new URL('../public/data/history-prc.json', import.meta.url), 'utf8'));
const examBank = JSON.parse(readFileSync(new URL('../public/data/exam-questions.json', import.meta.url), 'utf8'));
const events = storyboardEvents(history.events);
const allEvents = [...events, ...historyPrc.events];
const eventById = Object.fromEntries(allEvents.map((e) => [e.id, e]));
const eventIds = new Set(allEvents.map((e) => e.id));

test('exam-questions.json covers all 9 chapters cleanly with valid cross-volume map links and no PDF paths', () => {
  assert.equal(examBank.version, 2);
  assert.equal(examBank.questions.length, 72);
  assert.equal(examBank.count, examBank.questions.length);
  assert.equal(examBank.analysisQuestions.length, 9);

  const ids = new Set();
  const byChapter = Array.from({ length: 9 }, () => 0);
  for (const q of examBank.questions) {
    assert.ok(!ids.has(q.id), `Duplicate question ID ${q.id}`);
    ids.add(q.id);
    assert.notEqual(q.id, '2026-26', 'Disputed question 2026-26 must remain excluded');
    assert.notEqual(q.id, '2026-22', 'Disputed question 2026-22 must remain excluded');
    assert.ok(q.chapter >= 0 && q.chapter <= 8, q.id);
    byChapter[q.chapter] += 1;
    assert.ok(q.stem && q.explanation, q.id);
    assert.equal(q.options.length, 4, q.id);
    const letters = new Set(q.options.map(([l]) => l));
    for (const c of q.answer) assert.ok(letters.has(c), `${q.id}: invalid answer ${c}`);
    if (q.type === 'single') assert.equal(q.answer.length, 1, q.id);
    else assert.ok(q.answer.length >= 2, q.id);
    for (const [letter] of q.options) assert.ok(q.notes?.[letter], `${q.id}: missing note for ${letter}`);
    assert.ok(eventIds.has(q.replay), `${q.id}: invalid replay ${q.replay}`);
    for (const target of Object.values(q.optionReplay || {})) {
      assert.ok(eventIds.has(target), `${q.id}: invalid optionReplay ${target}`);
    }
    assert.doesNotMatch(JSON.stringify(q), /\.pdf/i, `${q.id}: must not expose PDF links`);
  }
  for (const [ch, count] of byChapter.entries()) {
    assert.ok(count >= 3, `Chapter ${ch} has only ${count} questions`);
  }
  for (const aq of examBank.analysisQuestions) {
    assert.ok(aq.prompts.length >= 2, aq.id);
    assert.ok(aq.chain.length >= 3, aq.id);
    assert.ok(aq.skeleton.length >= 2, aq.id);
    for (const step of aq.chain) {
      assert.ok(eventIds.has(step.eventId), `${aq.id}: invalid chain eventId ${step.eventId}`);
    }
    assert.doesNotMatch(JSON.stringify(aq), /\.pdf/i, `${aq.id}: must not expose PDF links`);
  }
});

test('playlist helpers navigate topic slices and chapter bounds accurately', () => {
  let cursor = 0;
  const starts = events.map((e) => {
    const s = cursor;
    cursor += e.duration;
    return s;
  });

  const land = buildPlaylist(events, 'land');
  assert.equal(land.length, 10);
  assert.equal(nextInPlaylist(land, land[0]), land[1]);
  assert.equal(nextInPlaylist(land, land.at(-1), { loop: false }), null);
  assert.equal(nextInPlaylist(land, land.at(-1), { loop: true }), land[0]);
  assert.equal(prevInPlaylist(land, land[0], { loop: false }), null);
  assert.equal(prevInPlaylist(land, land[0], { loop: true }), land.at(-1));

  const totalLand = playlistDuration(events, land);
  assert.ok(totalLand > 50 && totalLand < 120);
  assert.equal(playlistElapsed(events, starts, land, land[0], starts[land[0]] + 2), 2);

  const ch2 = chapterBounds(events, starts, 2);
  assert.ok(ch2 && ch2.endTime > ch2.startTime);
  assert.equal(events[ch2.firstIndex].chapter, 2);
  assert.equal(events[ch2.lastIndex].chapter, 2);
});

test('all 13 confusion sets resolve cleanly across both volumes and every keyTerm matches its diff text', () => {
  assert.equal(CONFUSION_SETS.length, 13);
  for (const set of CONFUSION_SETS) {
    const resolved = resolveConfusionSet(set, eventById);
    assert.equal(resolved.items.length, set.items.length, `${set.id} should resolve all items`);
    assert.ok(resolved.items.length >= 2, set.id);
    for (const item of resolved.items) {
      assert.ok(item.keyTerms.length >= 1, `${set.id}:${item.id}`);
      for (const term of item.keyTerms) {
        assert.ok(item.diff.includes(term), `${set.id}:${item.id} diff missing keyTerm "${term}"`);
      }
      const segments = buildClozeSegments(item.diff, item.keyTerms);
      assert.equal(segments.map((s) => s.text).join(''), item.diff);
      assert.ok(segments.some((s) => s.blank), `${set.id}:${item.id} should blank keyTerms`);
    }
  }
});

test('cloze extractor preserves exact source text and creates meaningful blanks across all 100 events', () => {
  for (const event of events) {
    const headlineSegs = buildClozeSegments(event.headline);
    const summarySegs = buildClozeSegments(event.summary);
    assert.equal(headlineSegs.map((s) => s.text).join(''), event.headline, event.id);
    assert.equal(summarySegs.map((s) => s.text).join(''), event.summary, event.id);
    assert.ok(
      headlineSegs.some((s) => s.blank) || summarySegs.some((s) => s.blank),
      `${event.id}: expected at least one cloze blank`,
    );
  }
});

test('study store handles migration, spaced review, mastery, backup import/export, and full-text search', () => {
  const questionIds = new Set(examBank.questions.map((q) => q.id));
  const DAY = 24 * 60 * 60 * 1000;
  const t0 = 1_700_000_000_000;

  // Migrate legacy road-study storage
  const legacyStore = {
    getItem: (key) =>
      key === ROAD_STORAGE_KEY
        ? JSON.stringify({
            version: 1,
            attempts: [{ id: 'leg-1', questionId: '2022-10', at: t0, correct: true, answer: 'D' }],
            schedules: { '2022-10': { step: 0, dueAt: t0 + DAY } },
          })
        : null,
  };
  const migrated = readStudyState(legacyStore, questionIds, eventIds);
  assert.equal(migrated.error, null);
  assert.equal(migrated.state.attempts.length, 1);

  // Record question attempts & delayed schedule progression
  const q = examBank.questions.find((item) => item.id === '2022-10');
  let state = emptyStudyState();
  state = recordQuestionAttempt(state, q, 'A', { now: t0, id: 'a1' });
  assert.equal(firstAttemptFor(state, q.id).correct, false);
  // Immediate correction does not overwrite first attempt or advance schedule
  state = recordQuestionAttempt(state, q, 'D', { now: t0 + 5000, id: 'a2' });
  assert.equal(firstAttemptFor(state, q.id).correct, false);
  assert.equal(state.schedules[q.id].step, 0);
  assert.equal(nextDueTimestamp(state, examBank.questions, t0 + 5000), t0 + DAY);

  // Due review advances step 0 -> 1
  assert.deepEqual(dueQuestionIds(state, examBank.questions, t0 + DAY), [q.id]);
  state = recordQuestionAttempt(state, q, 'D', { now: t0 + DAY, kind: 'review', id: 'a3' });
  assert.equal(state.schedules[q.id].step, 1);
  assert.equal(state.schedules[q.id].dueAt, t0 + DAY + 3 * DAY);

  // Mastery tracking + export/import merge
  state = setNodeMastery(state, 'e-27', 'known', t0 + 10);
  state = setNodeMastery(state, 'land-75', 'fuzzy', t0 + 20);
  const backup = exportStudyBackup(state, new Date(t0 + 30));
  const imported = importStudyBackup(backup, emptyStudyState(), questionIds, eventIds);
  assert.equal(imported.summary.addedAttempts, 3);
  assert.equal(imported.summary.updatedMastery, 2);
  assert.equal(imported.state.mastery['land-75'].level, 'fuzzy');
  assert.throws(() => importStudyBackup('not-json', state, questionIds, eventIds));
  assert.equal(STUDY_STORAGE_KEY, 'shixu-study-v1');

  // Full-text search matches beats/original exam phrases and filters by mastery
  const twoMusts = searchEvents(events, AUTHORED_STORIES, { query: '两个务必' });
  assert.ok(twoMusts.some((r) => r.event.id === 'meeting-68'));
  const useRight = searchEvents(events, AUTHORED_STORIES, { query: '使用权' });
  assert.ok(useRight.some((r) => r.event.id === 'land-75'));
  const reviewOnly = searchEvents(events, AUTHORED_STORIES, {
    masteryFilter: 'review',
    masteryMap: state.mastery,
  });
  assert.deepEqual(reviewOnly.map((r) => r.event.id), ['land-75']);
});

test('cross-volume mastery persists when validEventIds is null, AND search splits spaces, and cloze skips orphan quotes', () => {
  const mixedState = {
    version: 1,
    attempts: [],
    schedules: {},
    mastery: {
      'e-27': { level: 'known', updatedAt: 1000 },
      'prc-m-8': { level: 'fuzzy', updatedAt: 2000 },
    },
  };
  const crossStore = {
    getItem: (key) => (key === STUDY_STORAGE_KEY ? JSON.stringify(mixedState) : null),
  };
  const loaded = readStudyState(crossStore, null, null);
  assert.equal(loaded.error, null);
  assert.equal(loaded.state.mastery['e-27'].level, 'known');
  assert.equal(loaded.state.mastery['prc-m-8'].level, 'fuzzy');

  // Space-separated multi-word AND search
  const onlyYear = searchEvents(allEvents, AUTHORED_STORIES, { query: '1927' });
  const multiMatches = searchEvents(allEvents, AUTHORED_STORIES, { query: '1927 会议' });
  assert.ok(multiMatches.length >= 1);
  assert.ok(multiMatches.length <= onlyYear.length);
  assert.ok(
    multiMatches.every((r) => {
      const beatsText = (AUTHORED_STORIES[r.event.id]?.beats || [])
        .map((b) => `${b.title || ''} ${b.text || ''}`)
        .join(' ');
      const originalsText = (r.event.original || []).join(' ');
      const hay = `${r.event.title} ${r.event.year} ${r.event.headline} ${r.event.summary} ${r.event.location || ''} ${beatsText} ${originalsText}`.toLowerCase();
      return hay.includes('1927') && hay.includes('会议');
    }),
  );

  // Cloze across all 36 PRC events + land-70 preserves verbatim text and avoids orphan closing punctuation
  const checkEvents = [...historyPrc.events, eventById['land-70']].filter(Boolean);
  assert.equal(checkEvents.length, 37);
  for (const ev of checkEvents) {
    for (const field of [ev.headline, ev.summary]) {
      const segs = buildClozeSegments(field);
      assert.equal(segs.map((s) => s.text).join(''), field, `${ev.id} cloze verbatim mismatch`);
      for (const seg of segs) {
        if (!seg.blank) continue;
        const opens = (seg.text.match(/[“「《]/g) || []).length;
        const closes = (seg.text.match(/[”」》]/g) || []).length;
        assert.ok(opens >= closes, `${ev.id} trapped orphan closing quote in blank "${seg.text}"`);
      }
    }
    const hSegs = buildClozeSegments(ev.headline);
    const sSegs = buildClozeSegments(ev.summary);
    assert.ok(
      hSegs.some((s) => s.blank) || sSegs.some((s) => s.blank),
      `${ev.id}: expected at least one cloze blank`,
    );
  }
});
