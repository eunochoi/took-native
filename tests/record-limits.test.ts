import test from 'node:test';
import assert from 'node:assert/strict';
import { database, rows } from './database';
import { saveHabit } from '../src/db/habit';
import { saveSober } from '../src/db/sober';
import { validateBackupRecords } from '../src/backup/database';
import {
  HABIT_NAME_MAX_LENGTH,
  SOBER_NAME_MAX_LENGTH,
  MAX_HABIT_COUNT,
  MAX_SOBER_COUNT,
} from '../src/domain/limits';

const soberInput = {
  description: null,
  icon_key: 'favorite' as const,
  icon_color: 'theme' as const,
  is_priority: 0 as const,
  initial_started_at: '2024-01-01T00:00:00.000Z',
  goal_mode: 'AUTO' as const,
  goal_days: null,
};

test('habit and sober saves accept maximum name length and reject one extra character without writing records', async () => {
  const { db, raw } = await database();
  await saveHabit(db, { name: '가'.repeat(HABIT_NAME_MAX_LENGTH), priority: 0, icon_key: 'goal' });
  await assert.rejects(
    saveHabit(db, { name: '나'.repeat(HABIT_NAME_MAX_LENGTH + 1), priority: 0, icon_key: 'goal' }),
  );
  await saveSober(db, { ...soberInput, name: '가'.repeat(SOBER_NAME_MAX_LENGTH) });
  await assert.rejects(
    saveSober(db, { ...soberInput, name: '나'.repeat(SOBER_NAME_MAX_LENGTH + 1) }),
  );
  assert.equal(rows(raw, 'SELECT count(*) FROM habits')[0][0], 1);
  assert.equal(rows(raw, 'SELECT count(*) FROM sobers')[0][0], 1);
  raw.close();
});

test('habit and sober item limits still allow editing existing items when full', async () => {
  const { db, raw } = await database();
  for (let i = 0; i < MAX_HABIT_COUNT; i++)
    await saveHabit(db, { name: `습관${i}`, priority: 0, icon_key: 'goal' });
  for (let i = 0; i < MAX_SOBER_COUNT; i++)
    await saveSober(db, { ...soberInput, name: `거리두기${i}` });
  await assert.rejects(saveHabit(db, { name: '초과', priority: 0, icon_key: 'goal' }));
  await assert.rejects(saveSober(db, { ...soberInput, name: '초과' }));
  await saveHabit(db, { id: 1, name: '이름 수정', priority: 1, icon_key: 'goal' });
  await saveSober(db, { ...soberInput, id: 1, name: '이름 수정' });
  assert.equal(rows(raw, 'SELECT count(*) FROM habits')[0][0], MAX_HABIT_COUNT);
  assert.equal(rows(raw, 'SELECT count(*) FROM sobers')[0][0], MAX_SOBER_COUNT);
  raw.close();
});

test('backup validation uses the same habit and sober count and name limits', async () => {
  const { db, raw } = await database();
  await saveHabit(db, { name: '습관', priority: 0, icon_key: 'goal' });
  await saveSober(db, { ...soberInput, name: '거리두기' });
  const habits = await db.getAllAsync<any>('SELECT * FROM habits');
  const sobers = await db.getAllAsync<any>('SELECT * FROM sobers');
  const records = {
    diaries: [],
    habits,
    sobers,
    soberRestarts: [],
    completions: [],
    images: [],
    preferences: null,
  };
  validateBackupRecords(records, {});
  for (const [key, limit] of [
    ['habits', MAX_HABIT_COUNT],
    ['sobers', MAX_SOBER_COUNT],
  ] as const) {
    const base = records[key][0];
    const full = Array.from({ length: limit }, (_, i) => ({
      ...base,
      id: i + 1,
      name: `항목${i}`,
    }));
    validateBackupRecords({ ...records, [key]: full }, {});
    assert.throws(() =>
      validateBackupRecords(
        { ...records, [key]: [...full, { ...base, id: limit + 1, name: '초과' }] },
        {},
      ),
    );
  }
  assert.throws(() =>
    validateBackupRecords(
      { ...records, habits: [{ ...habits[0], name: '가'.repeat(HABIT_NAME_MAX_LENGTH + 1) }] },
      {},
    ),
  );
  assert.throws(() =>
    validateBackupRecords(
      { ...records, sobers: [{ ...sobers[0], name: '가'.repeat(SOBER_NAME_MAX_LENGTH + 1) }] },
      {},
    ),
  );
  raw.close();
});
