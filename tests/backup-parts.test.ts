import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, unzipSync, zipSync } from 'fflate';
import { inventoryDigest, planBackupParts, validateBackupSet } from '../src/backup/parts';
import { writeBackupArchive, extractBackupArchive, type BackupSource } from '../src/backup/stream';
import { MAX_BACKUP_PART_BYTES } from '../src/backup/format';
import { database, rows } from './database';
import { saveDiary } from '../src/db/diary';
import { readBackupDatabase, replaceRecords } from '../src/backup/database';

const jpg = new Uint8Array([255, 216, 255, 1]);
async function* chunks(bytes: Uint8Array) {
  yield bytes;
}
async function archive(
  entries: Record<string, Uint8Array>,
  set?: Parameters<typeof writeBackupArchive>[2],
) {
  const output: Uint8Array[] = [];
  async function* sources(): AsyncGenerator<BackupSource> {
    for (const [name, bytes] of Object.entries(entries)) yield { name, chunks: chunks(bytes) };
  }
  await writeBackupArchive(sources(), (bytes) => output.push(bytes.slice()), set);
  return Buffer.concat(output);
}
async function decode(bytes: Uint8Array) {
  const extracted: Record<string, Uint8Array[]> = {};
  const part = await extractBackupArchive(chunks(bytes), (name) => {
    extracted[name] = [];
    return { write: (bytes) => extracted[name].push(bytes.slice()), close: () => {} };
  });
  return {
    ...part,
    extracted: Object.fromEntries(
      Object.entries(extracted).map(([name, parts]) => [name, Buffer.concat(parts)]),
    ),
  };
}
async function fixture() {
  const source = await database();
  await saveDiary(source.db, {
    date: '2024-01-01',
    text: '분할 백업',
    emotion: 1,
    files: ['one.jpg', 'two.jpg'],
  });
  const files = { 'took.db': source.raw.export(), 'media/one.jpg': jpg, 'media/two.jpg': jpg };
  const inventorySha256 = inventoryDigest(
    Object.entries(files).map(([name, bytes]) => ({ name, size: bytes.length })),
  );
  const set = { id: 'test-backup-set-001', count: 2, inventorySha256 };
  const first = await archive({ 'took.db': files['took.db'] }, { ...set, index: 1 });
  const second = await archive(
    { 'media/one.jpg': jpg, 'media/two.jpg': jpg },
    { ...set, index: 2 },
  );
  return { source, first, second };
}

test('small backups remain one v1 ZIP; >1GB backups partition into bounded 512MB files', () => {
  const db = { name: 'took.db', size: 65536 };
  assert.equal(planBackupParts([db, { name: 'media/test.jpg', size: 1024 }]).length, 1);
  const entries = [
    db,
    ...Array.from({ length: 6 }, (_, i) => ({
      name: `media/test-${i}.jpg`,
      size: 200 * 1024 * 1024,
    })),
  ];
  const parts = planBackupParts(entries);
  assert(parts.length > 1);
  assert.deepEqual(parts.flat(), entries);
  assert(
    parts.every(
      (part) => part.reduce((total, entry) => total + entry.size, 0) < MAX_BACKUP_PART_BYTES,
    ),
  );
  assert.throws(
    () => planBackupParts([db, { name: 'media/large.jpg', size: 1024 * 1024 * 1024 }]),
    /크기/,
  );
});
test('ZIP metadata is included in the single-file threshold', () => {
  const entries = [
    { name: 'took.db', size: 2048 },
    { name: 'media/test.jpg', size: 2048 },
  ];
  assert.equal(planBackupParts(entries, 4096, 4096).length, 2);
});
test('complete unordered v2 set restores SQLite diary and all image links atomically', async () => {
  const { source, first, second } = await fixture();
  const decoded = [await decode(second), await decode(first)];
  const headers = validateBackupSet(decoded);
  const snapshot = await database(decoded[1].extracted['took.db']);
  const records = await readBackupDatabase(snapshot.db, headers);
  const target = await database();
  await replaceRecords(
    target.db,
    records,
    new Map([
      ['one.jpg', 'new-one.jpg'],
      ['two.jpg', 'new-two.jpg'],
    ]),
  );
  assert.equal(rows(target.raw, 'SELECT text FROM diaries')[0][0], '분할 백업');
  assert.equal(rows(target.raw, 'SELECT COUNT(*) FROM diary_images')[0][0], 2);
  source.raw.close();
  snapshot.raw.close();
  target.raw.close();
});
test('missing, duplicate and mixed sets fail before record replacement', async () => {
  const { source, first, second } = await fixture();
  const a = await decode(first),
    b = await decode(second);
  assert.throws(() => validateBackupSet([a]), /2번/);
  assert.throws(() => validateBackupSet([a, a, b]), /중복/);
  assert.throws(
    () =>
      validateBackupSet([
        a,
        { ...b, manifest: { ...b.manifest, set: { ...b.manifest.set!, id: 'different-set-002' } } },
      ]),
    /다른 백업/,
  );
  assert.equal(rows(source.raw, 'SELECT text FROM diaries')[0][0], '분할 백업');
  const legacy = await decode(await archive({ 'took.db': source.raw.export() }));
  assert.throws(() => validateBackupSet([legacy, a]), /한 개/);
  assert.throws(() => validateBackupSet([a, legacy]), /다른 백업/);
  source.raw.close();
});
test('corrupt multipart data and invalid set metadata are rejected', async () => {
  const { source, first, second } = await fixture();
  const damaged = unzipSync(second);
  damaged['media/one.jpg'][3] = 9;
  await assert.rejects(decode(zipSync(damaged)), /손상/);
  const invalid = unzipSync(first);
  const manifest = JSON.parse(Buffer.from(invalid['manifest.json']).toString());
  manifest.set.index = 0;
  invalid['manifest.json'] = strToU8(JSON.stringify(manifest));
  await assert.rejects(decode(zipSync(invalid)), /분할/);
  source.raw.close();
});
test('whole-set fingerprint detects inventory omissions beyond part counts', async () => {
  const { source, first, second } = await fixture();
  const a = await decode(first),
    b = await decode(second);
  const altered = {
    ...b,
    manifest: { ...b.manifest, files: { ...b.manifest.files } },
    files: { ...b.files },
  };
  delete altered.manifest.files['media/two.jpg'];
  delete altered.files['media/two.jpg'];
  assert.throws(() => validateBackupSet([a, altered]), /전체 파일/);
  source.raw.close();
});
