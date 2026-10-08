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
test('both habits and sober starts stay immutable even without completion or restart records', async () => {
  const { db, raw } = await database();
  const habit = await saveHabit(
    db,
    { name: '독서', priority: 1, icon_key: 'reading', initial_started_at: start },
    now,
  );
  const sober = await saveSober(db, input, now);
  for (const changed of ['2023-12-01T10:20:00.000Z', '2024-01-15T10:20:00.000Z']) {
    await assert.rejects(
      saveHabit(
        db,
        { id: habit, name: '변경', priority: 1, icon_key: 'reading', initial_started_at: changed },
        now,
      ),
      /저장 후 변경/,
    );
    await assert.rejects(
      saveSober(db, { ...input, id: sober, name: '변경', initial_started_at: changed }, now),
      /저장 후 변경/,
    );
  }
  assert.deepEqual(rows(raw, 'SELECT name, initial_started_at FROM habits'), [['독서', start]]);
  assert.equal((await getSoberById(db, sober))?.initial_started_at, start);
  await assert.rejects(
    saveHabit(
      db,
      {
        name: '미래',
        priority: 0,
        icon_key: 'goal',
        initial_started_at: new Date(now + 1).toISOString(),
      },
      now,
    ),
  );
  raw.close();
});
