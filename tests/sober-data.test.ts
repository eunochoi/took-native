import test from 'node:test';
import assert from 'node:assert/strict';
import { database, rows } from './database';
import {
  getSoberList,
  getSoberById,
  saveSober,
  deleteSober,
  getSoberRestarts,
  saveSoberRestart,
  deleteSoberRestart,
} from '../src/db/sober';
import { migrateDatabase } from '../src/db/migrations';
import { saveHabit } from '../src/db/habit';
import { MAX_SOBER_COUNT } from '../src/domain/limits';
import type { SoberInput } from '../src/domain/sober';
const start = '2024-01-01T10:20:00.000Z';
const now = Date.parse('2024-02-01T10:20:00.000Z');
const input: SoberInput = {
  name: '야식 절제',
  description: null,
  icon_key: 'moon',
  icon_color: 'theme',
  is_priority: 0,
  initial_started_at: start,
  goal_mode: 'AUTO',
  goal_days: null,
};

test('Sober create/read/edit/restart CRUD and cascade preserve independent Habit records', async () => {
  const { db, raw } = await database();
  const habitId = await saveHabit(db, { name: '독서', priority: 1, icon_key: 'reading' });
  const id = await saveSober(db, input, now);
  assert.equal((await getSoberList(db)).length, 1);
  assert.equal((await getSoberById(db, id))?.description, null);
  assert.equal((await getSoberById(db, id))?.icon_color, 'theme');
  await saveSober(
    db,
    {
      ...input,
      id,
      description: '다짐',
      icon_color: 'blue',
      goal_mode: 'MANUAL',
      goal_days: 7,
      is_priority: 1,
    },
    now,
  );
  assert.equal((await getSoberById(db, id))?.goal_days, 7);
  const one = await saveSoberRestart(
    db,
    { sober_id: id, restarted_at: '2024-01-10T10:20:00.000Z', memo: '처음' },
    now,
  );
  const two = await saveSoberRestart(
    db,
    { sober_id: id, restarted_at: '2024-01-10T10:20:00.000Z', memo: null },
    now,
  );
  assert.equal((await getSoberRestarts(db, id)).length, 2);
  await saveSoberRestart(
    db,
    { id: one, sober_id: id, restarted_at: '2024-01-05T10:20:00.000Z', memo: '변경' },
    now,
  );
  assert.equal((await getSoberRestarts(db, id))[0].memo, '변경');
  await deleteSoberRestart(db, two, id);
  assert.equal((await getSoberRestarts(db, id)).length, 1);
  await deleteSober(db, id);
  assert.equal((await getSoberList(db)).length, 0);
  assert.equal((await getSoberRestarts(db)).length, 0);
  assert.equal(rows(raw, `SELECT id FROM habits WHERE id = ${habitId}`).length, 1);
  raw.close();
});
test('duplicate names, item limit, future times, missing FK and cross-item edits are rejected', async () => {
  const { db, raw } = await database();
  const id = await saveSober(db, input, now);
  await assert.rejects(saveSober(db, { ...input, name: ' 야식 절제 ' }, now));
  await assert.rejects(
    saveSober(db, { ...input, initial_started_at: new Date(now + 1).toISOString() }, now),
  );
  await assert.rejects(
    saveSoberRestart(db, { sober_id: 999, restarted_at: start, memo: null }, now),
  );
  await assert.rejects(
    saveSoberRestart(
      db,
      { sober_id: id, restarted_at: new Date(now + 1).toISOString(), memo: null },
      now,
    ),
  );
  await assert.rejects(
    saveSoberRestart(
      db,
      { sober_id: id, restarted_at: '2023-12-31T10:20:00.000Z', memo: null },
      now,
    ),
  );
  const event = await saveSoberRestart(
    db,
    { sober_id: id, restarted_at: '2024-01-10T10:20:00.000Z', memo: null },
    now,
  );
  await assert.rejects(
    saveSober(db, { ...input, id, initial_started_at: '2024-01-11T10:20:00.000Z' }, now),
  );
  assert.equal((await getSoberById(db, id))?.initial_started_at, start);
  const other = await saveSober(db, { ...input, name: '게임 절제' }, now);
  await assert.rejects(
    saveSoberRestart(db, { id: event, sober_id: other, restarted_at: start, memo: null }, now),
  );
  await deleteSoberRestart(db, event, other);
  assert.equal((await getSoberRestarts(db, id)).length, 1);
  for (let i = 2; i < MAX_SOBER_COUNT; i++)
    await saveSober(db, { ...input, name: `절제 ${i}` }, now);
  await assert.rejects(saveSober(db, { ...input, name: '제한 초과' }, now));
  await assert.rejects(saveSober(db, { ...input, id: 999, name: '없는 항목' }, now));
  raw.close();
});
test('schema 2 upgrades in place, is repeatable, and keeps all Habit rows', async () => {
  const { db, raw } = await database();
  await saveHabit(db, { name: '남길 습관', priority: 2, icon_key: 'reading', icon_color: 'theme' });
  raw.exec('DROP TABLE sober_restarts; DROP TABLE sobers; PRAGMA user_version = 2;');
  await migrateDatabase(db);
  await migrateDatabase(db);
  assert.equal(rows(raw, 'PRAGMA user_version')[0][0], 4);
  assert.deepEqual(rows(raw, 'SELECT name, icon_color FROM habits'), [['남길 습관', 'theme']]);
  assert.equal((await getSoberList(db)).length, 0);
  raw.close();
});

test('schema 3 migrates existing Sober and restart records to theme color without data loss', async () => {
  const { db, raw } = await database();
  const id = await saveSober(db, input, now);
  await saveSoberRestart(
    db,
    { sober_id: id, restarted_at: '2024-01-10T10:20:00.000Z', memo: '남길 메모' },
    now,
  );
  raw.exec('ALTER TABLE sobers DROP COLUMN icon_color; PRAGMA user_version = 3;');
  await migrateDatabase(db);
  await migrateDatabase(db);
  assert.equal(rows(raw, 'PRAGMA user_version')[0][0], 4);
  const record = await getSoberById(db, id);
  assert.equal(record?.name, input.name);
  assert.equal(record?.icon_color, 'theme');
  assert.equal((await getSoberRestarts(db, id))[0].memo, '남길 메모');
  await saveSober(db, { ...input, id, icon_color: 'pink' }, now);
  assert.equal((await getSoberById(db, id))?.icon_color, 'pink');
  await assert.rejects(saveSober(db, { ...input, id, icon_color: 'invalid' as never }, now));
  assert.equal((await getSoberById(db, id))?.icon_color, 'pink');
  raw.close();
});
