import test from 'node:test';
import assert from 'node:assert/strict';
import type { SQLiteDatabase } from 'expo-sqlite';
import { database, rows } from './database';
import { initializeDatabase, SCHEMA_VERSION } from '../src/db/schema';
import { getHabitList, saveHabit, setHabitCompletion, deleteHabit } from '../src/db/habit';
import { saveDiary } from '../src/db/diary';
import { readBackupDatabase, replaceRecords } from '../src/backup/database';
import { todayString } from '../src/domain/date';

async function legacyDatabase() {
  const current = await database();
  const legacy = await database(new Uint8Array());
  try {
    const schema = await current.db.getAllAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND type IN ('table', 'index') ORDER BY type DESC",
    );
    await legacy.db.execAsync(
      schema
        .map(({ sql }) =>
          sql
            .replace('priority BETWEEN 0 AND 3', 'priority BETWEEN 0 AND 2')
            .replace('emotion BETWEEN 0 AND 11', 'emotion BETWEEN 0 AND 9'),
        )
        .join(';') + '; PRAGMA user_version = 5; PRAGMA foreign_keys = ON;',
    );
    for (const priority of [0, 1, 2]) {
      const id = await saveHabit(legacy.db, {
        name: `습관 ${priority}`,
        priority,
        icon_key: 'goal',
      });
      await setHabitCompletion(legacy.db, id, todayString(), true);
    }
    await saveDiary(legacy.db, { date: todayString(), emotion: 1, text: '남길 일기', files: [] });
    legacy.raw.run("INSERT INTO settings VALUES ('preferences', '{}')");
    // Retain the AUTOINCREMENT high-water mark even after deleting the highest id.
    const removed = await saveHabit(legacy.db, {
      name: '삭제한 습관',
      priority: 1,
      icon_key: 'goal',
    });
    await deleteHabit(legacy.db, removed);
    return legacy;
  } finally {
    current.raw.close();
  }
}

test('v5 constraint upgrade preserves values, ids, completions and unrelated data, then accepts three stars', async () => {
  const { db, raw } = await legacyDatabase();
  try {
    await assert.rejects(
      saveHabit(db, { name: '업그레이드 전', priority: 3, icon_key: 'goal' }),
      /CHECK/,
    );
    const before = rows(raw, 'SELECT * FROM habits ORDER BY id');
    const completions = rows(raw, 'SELECT * FROM habit_completions ORDER BY habit_id');
    const diary = rows(raw, 'SELECT * FROM diaries');
    const settings = rows(raw, 'SELECT * FROM settings');
    await initializeDatabase(db);
    assert.deepEqual(rows(raw, 'SELECT * FROM habits ORDER BY id'), before);
    assert.deepEqual(rows(raw, 'SELECT * FROM habit_completions ORDER BY habit_id'), completions);
    assert.deepEqual(rows(raw, 'SELECT * FROM diaries'), diary);
    assert.deepEqual(rows(raw, 'SELECT * FROM settings'), settings);
    assert.equal(rows(raw, 'PRAGMA user_version')[0][0], SCHEMA_VERSION);
    assert.equal(rows(raw, 'PRAGMA foreign_keys')[0][0], 1);
    assert.deepEqual(rows(raw, 'PRAGMA foreign_key_check'), []);
    await initializeDatabase(db);
    const id = await saveHabit(db, { name: '별 세개', priority: 3, icon_key: 'goal' });
    assert.equal(id, 5);
    await deleteHabit(db, 1);
    assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions WHERE habit_id = 1')[0][0], 0);
  } finally {
    raw.close();
  }
});

test('failed v5 upgrade rolls back original tables, records and version and re-enables foreign keys', async () => {
  const { db, raw } = await legacyDatabase();
  try {
    const before = rows(raw, 'SELECT * FROM habits');
    const wrapped = {
      ...db,
      execAsync: async (sql: string) => {
        if (sql.includes(`PRAGMA user_version = ${SCHEMA_VERSION}`))
          throw new Error('injected write failure');
        await db.execAsync(sql);
      },
    } as SQLiteDatabase;
    await assert.rejects(initializeDatabase(wrapped), /injected write failure/);
    assert.deepEqual(rows(raw, 'SELECT * FROM habits'), before);
    assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 3);
    assert.equal(rows(raw, 'PRAGMA user_version')[0][0], 5);
    assert.equal(rows(raw, 'PRAGMA foreign_keys')[0][0], 1);
    await initializeDatabase(db);
    assert.equal((await getHabitList(db)).length, 3);
  } finally {
    raw.close();
  }
});

test('v5 backup is read without modification and restored with unchanged priorities and records', async () => {
  const source = await legacyDatabase();
  const target = await database();
  try {
    const records = await readBackupDatabase(source.db, {});
    assert.deepEqual(
      records.habits.map((habit) => habit.priority),
      [0, 1, 2],
    );
    await replaceRecords(target.db, records, new Map());
    assert.deepEqual(rows(target.raw, 'SELECT priority FROM habits ORDER BY id'), [[0], [1], [2]]);
    assert.equal(rows(target.raw, 'SELECT count(*) FROM habit_completions')[0][0], 3);
    assert.equal(rows(target.raw, 'SELECT text FROM diaries')[0][0], '남길 일기');
    assert.equal(rows(source.raw, 'PRAGMA user_version')[0][0], 5);
    await assert.rejects(source.db.runAsync('DELETE FROM habits'), /readonly/);
    await saveHabit(target.db, { id: 1, name: '복원 후 수정', priority: 3, icon_key: 'goal' });
  } finally {
    source.raw.close();
    target.raw.close();
  }
});

test('v5 upgrade preserves the sequence even when no habits remain', async () => {
  const { db, raw } = await legacyDatabase();
  try {
    await db.execAsync('DELETE FROM habits;');
    await initializeDatabase(db);
    assert.equal(await saveHabit(db, { name: '새 습관', priority: 3, icon_key: 'goal' }), 5);
  } finally {
    raw.close();
  }
});
