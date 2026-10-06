import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, openSync, closeSync, writeSync, readSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strToU8, zipSync, unzipSync } from 'fflate';
import { writeBackupArchive, extractBackupArchive, type BackupSource } from '../src/backup/stream';
import { createArchive } from './backup-format';

async function* chunks(bytes: Uint8Array) {
  for (let i = 0; i < bytes.length; i += 7) yield bytes.subarray(i, i + 7);
}
const db = strToU8('SQLite format 3\0test');
const jpg = new Uint8Array([255, 216, 255, 1, 2, 3]);
async function decode(bytes: Uint8Array) {
  const extracted: Record<string, number[]> = {};
  const prefixes = await extractBackupArchive(chunks(bytes), (name) => {
    extracted[name] = [];
    return { write: (part) => extracted[name].push(...part), close: () => {} };
  });
  return { extracted, prefixes: prefixes.files };
}
test('streaming writer produces a v1 archive readable by existing ZIP tools', async () => {
  const output: Uint8Array[] = [];
  async function* sources(): AsyncGenerator<BackupSource> {
    yield { name: 'took.db', chunks: chunks(db) };
    yield { name: 'media/test.jpg', chunks: chunks(jpg) };
  }
  await writeBackupArchive(sources(), (bytes) => output.push(bytes.slice()));
  const archive = Buffer.concat(output);
  assert.deepEqual(unzipSync(archive)['media/test.jpg'], jpg);
  const decoded = await decode(archive);
  assert.deepEqual(decoded.extracted['took.db'], [...db]);
  assert.deepEqual(decoded.extracted['media/test.jpg'], [...jpg]);
});
test('streaming restore accepts compressed single ZIPs with the current schema', async () => {
  const decoded = await decode(createArchive({ 'took.db': db, 'media/test.jpg': jpg }));
  assert.deepEqual(decoded.extracted['media/test.jpg'], [...jpg]);
});
test('streaming restore rejects corruption, traversal, duplicate entries and unfinished data', async () => {
  const original = createArchive({ 'took.db': db, 'media/test.jpg': jpg });
  const files = unzipSync(original);
  files['media/test.jpg'][3] = 9;
  await assert.rejects(decode(zipSync(files)), /손상/);
  await assert.rejects(decode(zipSync({ '../escape.jpg': jpg })), /경로/);
  await assert.rejects(decode(original.subarray(0, 30)), /백업|invalid|unexpected/i);
  async function* duplicate(): AsyncGenerator<BackupSource> {
    yield { name: 'took.db', chunks: chunks(db) };
    yield { name: 'took.db', chunks: chunks(db) };
  }
  await assert.rejects(
    writeBackupArchive(duplicate(), () => {}),
    /중복/,
  );
});
test('129MB of photos roundtrips in bounded chunks without the old 128MB limit', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'took-stream-'));
  const path = join(directory, 'backup.zip');
  const handle = openSync(path, 'w+');
  const size = 129 * 1024 * 1024;
  let largestWrite = 0;
  try {
    async function* photos() {
      const part = new Uint8Array(256 * 1024);
      part.set([255, 216, 255]);
      for (let i = 0; i < size; i += part.length) yield part;
    }
    async function* sources(): AsyncGenerator<BackupSource> {
      yield { name: 'took.db', chunks: chunks(db) };
      yield { name: 'media/large.jpg', chunks: photos() };
    }
    await writeBackupArchive(sources(), (bytes) => writeSync(handle, bytes));
    async function* archiveChunks() {
      const buffer = Buffer.alloc(256 * 1024);
      let position = 0;
      while (true) {
        const count = readSync(handle, buffer, 0, buffer.length, position);
        if (!count) break;
        position += count;
        yield buffer.subarray(0, count);
      }
    }
    let restored = 0;
    await extractBackupArchive(archiveChunks(), (name) => ({
      write: (bytes) => {
        largestWrite = Math.max(largestWrite, bytes.length);
        if (name === 'media/large.jpg') restored += bytes.length;
      },
      close: () => {},
    }));
    assert.equal(restored, size);
    assert(largestWrite <= 256 * 1024);
  } finally {
    closeSync(handle);
    rmSync(directory, { recursive: true, force: true });
  }
});

test('streaming restore refuses a previous backup schema', async () => {
  const files = unzipSync(createArchive({ 'took.db': db }));
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  manifest.schemaVersion = 1;
  files['manifest.json'] = strToU8(JSON.stringify(manifest));
  await assert.rejects(decode(zipSync(files)), /백업 버전/);
});
