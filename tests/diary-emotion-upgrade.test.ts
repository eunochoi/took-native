import assert from 'node:assert/strict';
import test from 'node:test';
import type { SQLiteDatabase } from 'expo-sqlite';
import { database, rows } from './database';
import { initializeDatabase, SCHEMA_VERSION } from '../src/db/schema';
import { getDiaryById, getDiaryList, saveDiary, validateDiary } from '../src/db/diary';
import { getDiaryStats } from '../src/db/stats';
import { readBackupDatabase, replaceRecords } from '../src/backup/database';
import { createArchive, readArchive } from './backup-format';
import { EMOTIONS } from '../src/domain/constants';

async function legacyDatabase(version: 5 | 6) {
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
            .replace('emotion BETWEEN 0 AND 11', 'emotion BETWEEN 0 AND 9')
            .replace('priority BETWEEN 0 AND 3', `priority BETWEEN 0 AND ${version === 5 ? 2 : 3}`),
        )
        .join(';') + `; PRAGMA user_version = ${version}; PRAGMA foreign_keys = ON;`,
    );
    await legacy.db.execAsync(`
      INSERT INTO diaries VALUES (3, '2024-01-01', 9, '예전 무심 기록', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO diary_images VALUES (5, 3, 'kept.jpg', 0);
      INSERT INTO diaries VALUES (41, '2024-01-02', 0, '삭제한 일기', '2024-01-02T00:00:00.000Z', '2024-01-02T00:00:00.000Z');
      DELETE FROM diaries WHERE id = 41;
      INSERT INTO habits VALUES (2, '유지할 습관', 2, 'goal', 'theme', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z');
      INSERT INTO habit_completions VALUES (2, '2024-01-01', '2024-01-01T00:00:00.000Z');
      INSERT INTO settings VALUES ('preferences', '{}');
    `);
    return legacy;
  } finally {
    current.raw.close();
  }
}

for (const version of [5, 6] as const) {
  test(`v${version} upgrade preserves diary ids, photos, habits and sequence before accepting new emotions`, async () => {
    const { db, raw } = await legacyDatabase(version);
    try {
      await assert.rejects(
        saveDiary(db, { date: '2024-02-01', emotion: 10, text: '아직 불가', files: [] }),
        /CHECK/,
      );
      const tables = ['diaries', 'diary_images', 'habits', 'habit_completions', 'settings'];
      const before = tables.map((table) => rows(raw, `SELECT * FROM ${table}`));
      await initializeDatabase(db);
      assert.deepEqual(
        tables.map((table) => rows(raw, `SELECT * FROM ${table}`)),
        before,
      );
      assert.equal(rows(raw, 'PRAGMA user_version')[0][0], SCHEMA_VERSION);
      assert.equal(rows(raw, 'PRAGMA foreign_keys')[0][0], 1);
      assert.deepEqual(rows(raw, 'PRAGMA foreign_key_check'), []);
      await initializeDatabase(db);
      const { id } = await saveDiary(db, {
        date: '2024-02-01',
        emotion: 10,
        text: '피곤함',
        files: [],
      });
      assert.equal(id, 42);
      await saveDiary(db, { id, date: '2024-02-01', emotion: 11, text: '싱숭생숭', files: [] });
      assert.equal((await getDiaryById(db, id))?.emotion, 11);
      await db.runAsync('DELETE FROM diaries WHERE id = 3');
      assert.equal(rows(raw, 'SELECT count(*) FROM diary_images')[0][0], 0);
    } finally {
      raw.close();
    }
  });

  test(`v${version} backup remains read-only and restores the original emotion and photo into v7`, async () => {
    const source = await legacyDatabase(version);
    const target = await database();
    try {
      const media = { 'media/kept.jpg': new Uint8Array([255, 216, 255]) };
      const records = await readBackupDatabase(source.db, media);
      await replaceRecords(target.db, records, new Map([['kept.jpg', 'restored.jpg']]));
      assert.deepEqual(rows(target.raw, 'SELECT id, emotion FROM diaries'), [[3, 9]]);
      assert.deepEqual(rows(target.raw, 'SELECT diary_id, file_name FROM diary_images'), [
        [3, 'restored.jpg'],
      ]);
      assert.equal(rows(source.raw, 'PRAGMA user_version')[0][0], version);
      await assert.rejects(source.db.runAsync('DELETE FROM diaries'), /readonly/);
    } finally {
      source.raw.close();
      target.raw.close();
    }
  });
}

test('failed v6 upgrade rolls back the old constraint, sequence and photos, then allows retry', async () => {
  const { db, raw } = await legacyDatabase(6);
  try {
    const wrapped = {
      ...db,
      execAsync: async (sql: string) => {
        if (sql.includes(`PRAGMA user_version = ${SCHEMA_VERSION}`))
          throw new Error('injected migration failure');
        await db.execAsync(sql);
      },
    } as SQLiteDatabase;
    await assert.rejects(initializeDatabase(wrapped), /injected migration failure/);
    assert.equal(rows(raw, 'PRAGMA user_version')[0][0], 6);
    assert.equal(rows(raw, 'PRAGMA foreign_keys')[0][0], 1);
    assert.equal(rows(raw, 'SELECT count(*) FROM diary_images')[0][0], 1);
    assert.equal(rows(raw, "SELECT seq FROM sqlite_sequence WHERE name = 'diaries'")[0][0], 41);
    assert(
      rows(raw, "SELECT sql FROM sqlite_master WHERE name = 'diaries'")[0][0]
        ?.toString()
        .includes('BETWEEN 0 AND 9'),
    );
    await initializeDatabase(db);
    assert.equal(
      (await saveDiary(db, { date: '2024-02-01', emotion: 11, text: '재시도', files: [] })).id,
      42,
    );
  } finally {
    raw.close();
  }
});

test('an empty v6 diary table retains its autoincrement high-water mark', async () => {
  const { db, raw } = await legacyDatabase(6);
  try {
    await db.execAsync('DELETE FROM diaries;');
    await initializeDatabase(db);
    assert.equal(
      (await saveDiary(db, { date: '2024-02-01', emotion: 10, text: '첫 새 기록', files: [] })).id,
      42,
    );
  } finally {
    raw.close();
  }
});

test('a broken photo link aborts the upgrade and restores the old schema and foreign key enforcement', async () => {
  const { db, raw } = await legacyDatabase(6);
  try {
    await db.execAsync('PRAGMA foreign_keys = OFF; UPDATE diary_images SET diary_id = 999;');
    await assert.rejects(initializeDatabase(db), /연결/);
    assert.equal(rows(raw, 'PRAGMA user_version')[0][0], 6);
    assert.equal(rows(raw, 'PRAGMA foreign_keys')[0][0], 1);
    assert.deepEqual(rows(raw, 'SELECT diary_id FROM diary_images'), [[999]]);
    assert.equal(
      rows(raw, "SELECT count(*) FROM sqlite_master WHERE name = 'diaries_next'")[0][0],
      0,
    );
  } finally {
    raw.close();
  }
});

test('new emotions save, filter, aggregate both half-years and roundtrip with photos through a ZIP backup', async () => {
  const source = await database();
  const target = await database();
  let snapshot: Awaited<ReturnType<typeof database>> | undefined;
  try {
    for (const [date, emotion, files] of [
      ['2024-01-01', 9, ['old.jpg']],
      ['2024-02-01', 10, []],
      ['2024-07-01', 11, []],
      ['2024-08-01', 0, []],
    ] as [string, number, string[]][]) {
      await saveDiary(source.db, { date, emotion, text: EMOTIONS[emotion].name, files });
    }
    const stats = await getDiaryStats(source.db, 2024);
    assert.equal(stats.emotions.length, EMOTIONS.length);
    assert.deepEqual(stats.emotions.slice(9), [1, 1, 1]);
    assert.deepEqual(stats.halves[0].slice(9), [1, 1, 0]);
    assert.deepEqual(stats.halves[1].slice(9), [0, 0, 1]);
    const filtered = await getDiaryList(
      source.db,
      { year: 2024, seasons: [], emotionGroups: ['neutral'], sort: 'ASC' },
      0,
    );
    assert.deepEqual(
      filtered.map(({ emotion }) => emotion),
      [9, 10, 11],
    );
    const archive = createArchive({
      'took.db': source.raw.export(),
      'media/old.jpg': new Uint8Array([255, 216, 255]),
    });
    const decoded = readArchive(archive);
    snapshot = await database(decoded.files['took.db']);
    const records = await readBackupDatabase(snapshot.db, decoded.files);
    await replaceRecords(target.db, records, new Map([['old.jpg', 'restored.jpg']]));
    assert.deepEqual(
      rows(target.raw, 'SELECT id, emotion, text FROM diaries ORDER BY id'),
      rows(source.raw, 'SELECT id, emotion, text FROM diaries ORDER BY id'),
    );
    assert.deepEqual(rows(target.raw, 'SELECT diary_id, file_name FROM diary_images'), [
      [1, 'restored.jpg'],
    ]);
    assert.deepEqual(rows(target.raw, 'PRAGMA foreign_key_check'), []);
    assert.deepEqual(await getDiaryStats(target.db, 2024), stats);
    for (const emotion of [-1, 1.5, EMOTIONS.length, NaN]) {
      assert.throws(() =>
        validateDiary({ date: '2024-01-01', emotion, text: '유효성', files: [] }),
      );
      if (emotion !== 1.5) {
        assert.throws(
          () => target.raw.run('UPDATE diaries SET emotion = ? WHERE id = 1', [emotion]),
          /CHECK|NOT NULL/,
        );
      }
    }
  } finally {
    source.raw.close();
    snapshot?.raw.close();
    target.raw.close();
  }
});
