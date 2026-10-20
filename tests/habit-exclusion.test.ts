import test from 'node:test';
import assert from 'node:assert/strict';
import { database, rows } from './database';
import { initializeDatabase, SCHEMA_VERSION } from '../src/db/schema';
import { getHabitById, getHabitList, saveHabit, setHabitCompletion } from '../src/db/habit';
import { getHabitStats } from '../src/db/stats';
import { getHabitDaySummary, getHabitFlowStats } from '../src/domain/habitStats';
import { calendarHabitProgressCounts } from '../src/domain/calendar';
import { readBackupDatabase, replaceRecords } from '../src/backup/database';
import { shiftDate, todayString } from '../src/domain/date';

const today = todayString();
const input = {
  name: '빨래',
  priority: 0,
  icon_key: 'laundry' as const,
  initial_started_at: new Date(`${shiftDate(today, -30)}T00:00:00`).toISOString(),
};

test('new schema accepts priorities 0–3 without extra columns', async () => {
  const { db, raw } = await database();
  try {
    for (let priority = 0; priority <= 3; priority++)
      await saveHabit(db, { ...input, name: `습관 ${priority}`, priority });
    assert.equal(rows(raw, 'PRAGMA user_version')[0][0], SCHEMA_VERSION);
    assert(!rows(raw, 'PRAGMA table_info(habits)').some((row) => row[1] === 'record_mode'));
    for (const priority of [-1, 4, 0.5])
      await assert.rejects(saveHabit(db, { ...input, priority }), /습관 설정/);
    await initializeDatabase(db);
    assert.equal((await getHabitList(db)).length, 4);
  } finally {
    raw.close();
  }
});

test('excluded habits retain the recent-four-day editing window and one record per day', async () => {
  const { db, raw } = await database();
  try {
    const id = await saveHabit(db, input);
    for (let i = 0; i < 4; i++) {
      await setHabitCompletion(db, id, shiftDate(today, -i), true);
      await setHabitCompletion(db, id, shiftDate(today, -i), true);
    }
    assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 4);
    for (const date of [shiftDate(today, -4), shiftDate(today, 1)]) {
      await assert.rejects(setHabitCompletion(db, id, date, true), /최근 4일/);
      await assert.rejects(setHabitCompletion(db, id, date, false), /최근 4일/);
    }
    await setHabitCompletion(db, id, shiftDate(today, -3), false);
    assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 3);
  } finally {
    raw.close();
  }
});

test('changing priority preserves dates and updates the ranking and denominator', async () => {
  const { db, raw } = await database();
  try {
    const id = await saveHabit(db, { ...input, priority: 1 });
    await setHabitCompletion(db, id, today, true);
    const records = [{ habit_id: id, date: today }];
    const year = Number(today.slice(0, 4));
    assert.equal((await getHabitStats(db, year)).top[0].id, id);
    await saveHabit(db, { ...input, id });
    assert.equal((await getHabitStats(db, year)).all.length, 0);
    assert.deepEqual(getHabitDaySummary(today, await getHabitList(db), records), {
      total: 0,
      completed: 0,
      percent: null,
      excludedCompleted: 1,
    });
    await saveHabit(db, { ...input, id, priority: 3 });
    assert.equal((await getHabitStats(db, year)).top[0].count, 1);
    assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 1);
  } finally {
    raw.close();
  }
});

test('summary and bands ignore excluded, duplicate, unknown, future and pre-start records', () => {
  const habits = [
    { id: 1, priority: 1, initial_started_at: '2026-10-01T00:00:00' },
    { id: 2, priority: 3, initial_started_at: '2026-10-01T00:00:00' },
    { id: 3, priority: 0, initial_started_at: '2026-10-01T00:00:00' },
    { id: 4, priority: 2, initial_started_at: '2026-10-22T00:00:00' },
  ];
  const records = [1, 1, 3, 4, 99].map((habit_id) => ({ habit_id, date: '2026-10-21' }));
  assert.deepEqual(getHabitDaySummary('2026-10-21', habits, records), {
    total: 2,
    completed: 1,
    percent: 50,
    excludedCompleted: 1,
  });
  assert.deepEqual(calendarHabitProgressCounts(habits, records, '2026-10', '2026-10-21'), {
    low: 0,
    medium: 1,
    high: 0,
  });
  assert.deepEqual(calendarHabitProgressCounts(habits, records, '2026-10', '2026-10-20'), {
    low: 0,
    medium: 0,
    high: 0,
  });
  const excluded = habits.filter((habit) => habit.priority === 0);
  assert.equal(getHabitFlowStats('2026-10-21', excluded, records).recent.average, null);
  assert.deepEqual(calendarHabitProgressCounts(excluded, records, '2026-10', '2026-10-21'), {
    low: 0,
    medium: 0,
    high: 0,
  });
});

test('current backup preserves excluded habits and recorded dates', async () => {
  const source = await database();
  const target = await database();
  try {
    const id = await saveHabit(source.db, input);
    await setHabitCompletion(source.db, id, today, true);
    const records = await readBackupDatabase(source.db, {});
    await replaceRecords(target.db, records, new Map());
    assert.equal((await getHabitById(target.db, id))?.priority, 0);
    assert.equal(rows(target.raw, 'SELECT date FROM habit_completions')[0][0], today);
  } finally {
    source.raw.close();
    target.raw.close();
  }
});
