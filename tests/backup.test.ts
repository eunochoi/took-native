import test from 'node:test';
import assert from 'node:assert/strict';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { database, rows } from './database';
import { createArchive, readArchive } from './backup-format';
import { readBackupDatabase, replaceRecords, validateBackupRecords } from '../src/backup/database';
import { saveDiary } from '../src/db/diary';
import { saveHabit } from '../src/db/habit';
import { DEFAULT_SETTINGS } from '../src/settings/model';

async function fixture() {
  const value = await database();
  await saveDiary(value.db, {
    date: '2024-02-29',
    text: '사진과 기억',
    emotion: 3,
    files: ['test.jpg'],
  });
  await saveHabit(value.db, {
    name: '보관할 습관',
    priority: 1,
    icon_key: 'goal',
    icon_color: 'lavender',
  });
  value.raw.run("UPDATE habits SET initial_started_at = '2024-02-01T00:00:00.000Z' WHERE id = 1");
  value.raw.run('INSERT INTO habit_completions VALUES (?, ?, ?)', [
    1,
    '2024-02-29',
    '2024-02-29T00:00:00.000Z',
  ]);
  value.raw.run('INSERT INTO habit_completions VALUES (?, ?, ?)', [
    1,
    '2024-03-01',
    '2024-03-01T00:00:00.000Z',
  ]);
  value.raw.run('INSERT INTO settings VALUES (?, ?)', [
    'preferences',
    JSON.stringify({
      ...DEFAULT_SETTINGS,
      emotionStyle: 'emoji',
      diarySort: 'ASC',
      habitSort: 'CUSTOM',
      habitOrder: [1],
      habitPriorityFirst: true,
      themeMode: 'system',
      themeAccent: 'green',
      fontSize: 'large',
      diaryReminderTime: '21:00',
      habitReminderTime: '08:30',
      soberReminderTime: null,
    }),
  ]);
  const files = {
    'took.db': value.raw.export(),
    'media/test.jpg': new Uint8Array([255, 216, 255, 0]),
  };
  return { ...value, files };
}

test('DB + images + settings survive backup roundtrip and atomic restore', async () => {
  const source = await fixture();
  const decoded = readArchive(createArchive(source.files));
  const snapshot = await database(decoded.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, decoded.files);
  const target = await database();
  await saveDiary(target.db, { date: '2024-01-01', text: '교체 전', emotion: 1, files: [] });
  await replaceRecords(target.db, records, new Map([['test.jpg', 'new-name.jpg']]));
  assert.equal(rows(target.raw, 'SELECT text FROM diaries')[0][0], '사진과 기억');
  assert.equal(rows(target.raw, 'SELECT icon_color FROM habits')[0][0], 'lavender');
  assert.equal(rows(target.raw, 'SELECT file_name FROM diary_images')[0][0], 'new-name.jpg');
  const restoredSettings = JSON.parse(String(rows(target.raw, 'SELECT value FROM settings')[0][0]));
  assert.equal(restoredSettings.emotionStyle, 'emoji');
  assert.equal(restoredSettings.diaryReminderTime, '21:00');
  assert.equal(restoredSettings.habitReminderTime, '08:30');
  assert.equal(restoredSettings.soberReminderTime, null);
  assert.equal(restoredSettings.themeMode, 'system');
  assert.equal(restoredSettings.themeAccent, 'green');
  assert.equal(restoredSettings.fontSize, 'large');
  assert.equal(restoredSettings.diarySort, 'ASC');
  assert.equal(restoredSettings.habitSort, 'CUSTOM');
  assert.equal(restoredSettings.habitPriorityFirst, true);
  assert.deepEqual(restoredSettings.habitOrder, [1]);
  assert.deepEqual(rows(target.raw, 'SELECT date FROM habit_completions ORDER BY date'), [
    ['2024-02-29'],
    ['2024-03-01'],
  ]);

  assert.deepEqual(Object.keys(restoredSettings).sort(), Object.keys(DEFAULT_SETTINGS).sort());
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
});
test('failed restore transaction preserves current diary, habit and settings', async () => {
  const source = await fixture();
  const snapshot = await database(source.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, source.files);
  const target = await database();
  await saveDiary(target.db, { date: '2023-01-01', text: '원래 일기', emotion: 2, files: [] });
  await saveHabit(target.db, { name: '원래 습관', priority: 0, icon_key: 'goal' });
  target.raw.run('INSERT INTO settings VALUES (?, ?)', [
    'preferences',
    JSON.stringify(DEFAULT_SETTINGS),
  ]);
  target.raw.exec(
    "CREATE TRIGGER fail_restore BEFORE INSERT ON habits WHEN NEW.name = '보관할 습관' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;",
  );
  await assert.rejects(replaceRecords(target.db, records, new Map([['test.jpg', 'new.jpg']])));
  assert.equal(rows(target.raw, 'SELECT text FROM diaries')[0][0], '원래 일기');
  assert.equal(rows(target.raw, 'SELECT name FROM habits')[0][0], '원래 습관');
  assert.equal(
    JSON.parse(String(rows(target.raw, 'SELECT value FROM settings')[0][0])).emotionStyle,
    'basic',
  );
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
});
test('corrupted bytes, missing manifest, unsupported versions and path traversal are rejected', async () => {
  const source = await fixture();
  const archive = createArchive(source.files);
  const files = unzipSync(archive);
  files['media/test.jpg'][3] = 1;
  assert.throws(() => readArchive(zipSync(files)), /손상/);
  assert.throws(() => readArchive(zipSync({ 'took.db': source.files['took.db'] })), /백업/);
  const versionFiles = unzipSync(archive);
  const manifest = JSON.parse(strFromU8(versionFiles['manifest.json']));
  manifest.version = 2;
  versionFiles['manifest.json'] = strToU8(JSON.stringify(manifest));
  assert.throws(() => readArchive(zipSync(versionFiles)), /버전/);
  assert.throws(
    () => readArchive(zipSync({ ...unzipSync(archive), '../escape.jpg': new Uint8Array([1]) })),
    /경로/,
  );
  source.raw.close();
});
test('missing image and invalid restored settings are rejected before replacement', async () => {
  const source = await fixture();
  const snapshot = await database(source.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, source.files);
  assert.throws(
    () => validateBackupRecords(records, { 'took.db': source.files['took.db'] }),
    /사진/,
  );
  assert.throws(
    () =>
      validateBackupRecords(
        { ...records, preferences: JSON.stringify({ emotionStyle: 'wrong' }) },
        source.files,
      ),
    /설정/,
  );
  source.raw.close();
  snapshot.raw.close();
});
test('foreign schema and executable schema objects are rejected', async () => {
  const source = await fixture();
  source.raw.exec('CREATE VIEW unexpected AS SELECT * FROM diaries;');
  const snapshot = await database(source.raw.export());
  await assert.rejects(readBackupDatabase(snapshot.db, source.files), /구조/);
  source.raw.close();
  snapshot.raw.close();
});

test('backup refuses older DB schemas and invalid habit colors', async () => {
  const source = await fixture();
  const snapshot = await database(source.files['took.db']);
  const records = await readBackupDatabase(snapshot.db, source.files);
  records.habits[0].icon_color = 'invalid' as never;
  assert.throws(() => validateBackupRecords(records, source.files), /습관/);
  source.raw.exec('PRAGMA user_version = 1;');
  const old = await database(source.raw.export());
  await assert.rejects(readBackupDatabase(old.db, source.files), /DB 버전/);
  old.raw.close();
  snapshot.raw.close();
  source.raw.close();
});

test('theme-following color survives backup record replacement', async () => {
  const source = await fixture();
  source.raw.run("UPDATE habits SET icon_color = 'theme'");
  const files = { ...source.files, 'took.db': source.raw.export() };
  const snapshot = await database(files['took.db']);
  const records = await readBackupDatabase(snapshot.db, files);
  const target = await database();
  await replaceRecords(target.db, records, new Map([['test.jpg', 'restored.jpg']]));
  assert.equal(rows(target.raw, 'SELECT icon_color FROM habits')[0][0], 'theme');
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
});
