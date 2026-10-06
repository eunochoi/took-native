import test from 'node:test';
import assert from 'node:assert/strict';
import { database, rows } from './database';
import { readBackupDatabase, replaceRecords, validateBackupRecords } from '../src/backup/database';
import { saveSober, saveSoberRestart } from '../src/db/sober';
import { createArchive, readArchive } from './backup-format';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import { SOBER_MEMO_MAX_LENGTH } from '../src/domain/limits';

async function fixture() {
  const source = await database();
  const id = await saveSober(source.db, {
    name: '야식 절제',
    description: '수면을 위해',
    icon_key: 'moon',
    icon_color: 'coral',
    is_priority: 1,
    initial_started_at: '2024-01-01T10:20:00.000Z',
    goal_mode: 'MANUAL',
    goal_days: 14,
  });
  await saveSoberRestart(source.db, {
    sober_id: id,
    restarted_at: '2024-01-10T22:35:00.000Z',
    memo: '생각 기록',
  });
  source.raw.run('INSERT INTO settings (key, value) VALUES (?, ?)', [
    'preferences',
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      habitPriorityFirst: true,
      soberSort: 'ASC',
      soberPriorityFirst: true,
    }),
  ]);
  const files = { 'took.db': source.raw.export() };
  return { ...source, files };
}
test('Sober and restart with memo survive ZIP backup and atomic record replacement', async () => {
  const source = await fixture();
  const decoded = readArchive(createArchive(source.files));
  assert.equal(decoded.manifest.schemaVersion, 4);
  const snapshot = await database(decoded.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, decoded.files);
  const target = await database();
  await replaceRecords(target.db, records, new Map());
  assert.deepEqual(
    rows(
      target.raw,
      'SELECT name, description, icon_color, is_priority, goal_mode, goal_days FROM sobers',
    ),
    [['야식 절제', '수면을 위해', 'coral', 1, 'MANUAL', 14]],
  );
  assert.deepEqual(rows(target.raw, 'SELECT restarted_at, memo FROM sober_restarts'), [
    ['2024-01-10T22:35:00.000Z', '생각 기록'],
  ]);
  assert.equal(rows(target.raw, 'PRAGMA foreign_key_check').length, 0);
  const settings = JSON.parse(String(rows(target.raw, 'SELECT value FROM settings')[0][0]));
  assert.equal(settings.habitPriorityFirst, true);
  assert.equal(settings.soberSort, 'ASC');
  assert.equal(settings.soberPriorityFirst, true);
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
});
test('backup validates duplicate ids/names, FK, icons, goals, dates and optional text', async () => {
  const source = await fixture();
  const snapshot = await database(source.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, source.files);
  for (const patch of [
    { id: 0 },
    { icon_key: 'unknown' },
    { icon_color: 'unknown' },
    { goal_mode: 'MANUAL', goal_days: null },
    { goal_mode: 'AUTO', goal_days: 7 },
    { initial_started_at: 'bad' },
    { initial_started_at: new Date(Date.now() + 86400000).toISOString() },
  ]) {
    const bad = structuredClone(records);
    Object.assign(bad.sobers[0], patch);
    assert.throws(() => validateBackupRecords(bad, source.files));
  }
  for (const patch of [
    { sober_id: 999 },
    { id: 0 },
    { restarted_at: 'bad' },
    { restarted_at: '2023-12-31T00:00:00.000Z' },
    { memo: 'x'.repeat(SOBER_MEMO_MAX_LENGTH + 1) },
  ]) {
    const bad = structuredClone(records);
    Object.assign(bad.soberRestarts[0], patch);
    assert.throws(() => validateBackupRecords(bad, source.files));
  }
  const duplicate = structuredClone(records);
  duplicate.sobers.push(duplicate.sobers[0]);
  assert.throws(() => validateBackupRecords(duplicate, source.files));
  const duplicateRestart = structuredClone(records);
  duplicateRestart.soberRestarts.push(duplicateRestart.soberRestarts[0]);
  assert.throws(() => validateBackupRecords(duplicateRestart, source.files));
  source.raw.close();
  snapshot.raw.close();
});
test('invalid FK and old DB schema are rejected before restore; failed inserts roll back', async () => {
  const source = await fixture();
  const snapshot = await database(source.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, source.files);
  const target = await database();
  const targetId = await saveSober(target.db, {
    ...records.sobers[0],
    id: undefined,
    name: '원래 기록',
  });
  target.raw.exec(
    "CREATE TRIGGER fail_restart BEFORE INSERT ON sober_restarts BEGIN SELECT RAISE(ABORT, 'simulated'); END;",
  );
  await assert.rejects(replaceRecords(target.db, records, new Map()));
  assert.equal(rows(target.raw, 'SELECT name FROM sobers')[0][0], '원래 기록');
  assert.equal(rows(target.raw, 'SELECT id FROM sobers')[0][0], targetId);
  const broken = await database(source.files['took.db']);
  broken.raw.exec('PRAGMA foreign_keys = OFF; UPDATE sober_restarts SET sober_id = 999;');
  await assert.rejects(readBackupDatabase(broken.db, source.files), /연결/);
  const old = await database(source.files['took.db']);
  old.raw.exec('PRAGMA user_version = 2;');
  await assert.rejects(readBackupDatabase(old.db, source.files), /DB 버전/);
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
  broken.raw.close();
  old.raw.close();
});
