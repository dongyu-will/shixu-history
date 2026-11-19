import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  REVIEW_DAYS,
  ROAD_QUESTIONS,
  ROAD_STORAGE_KEY,
  dueQuestions,
  emptyProgress,
  readProgress,
  recordAttempt,
} from '../src/road-questions.js';

const history = JSON.parse(readFileSync(new URL('../public/data/history.json', import.meta.url), 'utf8'));
const eventIds = new Set(history.events.map((e) => e.id));

test('ROAD_QUESTIONS reference valid retained events, options, answers, and source metadata', () => {
  assert.equal(ROAD_QUESTIONS.length, 3);
  for (const q of ROAD_QUESTIONS) {
    assert.ok(eventIds.has(q.replay), q.id);
    for (const target of Object.values(q.optionReplay || {})) {
      assert.ok(eventIds.has(target), `${q.id} -> ${target}`);
    }
    const letters = new Set(q.options.map(([letter]) => letter));
    assert.equal(letters.size, q.options.length, q.id);
    for (const c of q.answer) assert.ok(letters.has(c), `${q.id}: ${c}`);
    if (q.type === 'single') assert.equal(q.answer.length, 1, q.id);
    assert.ok(q.source && typeof q.source.label === 'string' && q.source.label.trim().length > 0, `${q.id} source label`);
    assert.ok(Number.isInteger(q.source.page) && q.source.page > 0, `${q.id} source page`);
    assert.match(q.source.file, /^\/sources\/road-\d{4}\.pdf$/, `${q.id} source file metadata`);
  }
});

test('readProgress recovers gracefully from missing or malformed storage', () => {
  const empty = readProgress({ getItem: () => null });
  assert.deepEqual(empty, { progress: emptyProgress(), error: null });

  const malformed = readProgress({ getItem: () => '{bad json' });
  assert.deepEqual(malformed.progress, emptyProgress());
  assert.ok(malformed.error);

  const filtered = readProgress({
    getItem: () =>
      JSON.stringify({
        version: 1,
        attempts: [
          { id: 'ok', questionId: '2022-10', at: 100, correct: true, answer: 'D' },
          { id: 'bad', questionId: 'unknown', at: 100, correct: true, answer: 'A' },
        ],
        schedules: {
          '2022-10': { step: 0, dueAt: 200 },
          '2023-10': { step: 99, dueAt: 200 },
        },
      }),
  });
  assert.equal(filtered.error, null);
  assert.equal(filtered.progress.attempts.length, 1);
  assert.deepEqual(Object.keys(filtered.progress.schedules), ['2022-10']);
});

test('recordAttempt enforces answer rules, deduplication, and spaced-review intervals', () => {
  const single = ROAD_QUESTIONS[0];
  const multi = ROAD_QUESTIONS[2];
  const DAY = 24 * 60 * 60 * 1000;
  const t0 = 1_700_000_000_000;

  assert.throws(() => recordAttempt(emptyProgress(), single, 'AB', { now: t0, id: 'e1' }));
  assert.throws(() => recordAttempt(emptyProgress(), multi, 'Z', { now: t0, id: 'e2' }));

  let p = recordAttempt(emptyProgress(), multi, 'CBA', { now: t0, id: 'a1' });
  assert.equal(p.attempts[0].answer, 'ABC');
  assert.equal(p.attempts[0].correct, true);
  assert.equal(p.schedules[multi.id].step, 0);
  assert.equal(p.schedules[multi.id].dueAt, t0 + REVIEW_DAYS[0] * DAY);

  // Duplicate attempt ID is idempotent.
  assert.equal(recordAttempt(p, multi, 'ABC', { now: t0 + 1000, id: 'a1' }), p);

  // Early practice does not postpone or advance schedule.
  const early = recordAttempt(p, multi, 'ABC', { now: t0 + 1000, kind: 'review', id: 'a2' });
  assert.equal(early.schedules[multi.id].dueAt, p.schedules[multi.id].dueAt);
  assert.deepEqual(dueQuestions(early, t0 + 1000), []);

  // Due unassisted correct review advances step from 0 -> 1.
  const t1 = t0 + REVIEW_DAYS[0] * DAY;
  assert.deepEqual(dueQuestions(early, t1), [multi.id]);
  const reviewed = recordAttempt(early, multi, 'ABC', { now: t1, kind: 'review', id: 'a3' });
  assert.equal(reviewed.attempts.at(-1).delayed, true);
  assert.equal(reviewed.schedules[multi.id].step, 1);
  assert.equal(reviewed.schedules[multi.id].dueAt, t1 + REVIEW_DAYS[1] * DAY);

  // Assisted due review resets to step 0 rather than advancing.
  const t2 = t1 + REVIEW_DAYS[1] * DAY;
  const assisted = recordAttempt(reviewed, multi, 'ABC', {
    now: t2,
    kind: 'review',
    assisted: true,
    id: 'a4',
  });
  assert.equal(assisted.schedules[multi.id].step, 0);
  assert.equal(ROAD_STORAGE_KEY, 'shixu-road-study-v1');
});
