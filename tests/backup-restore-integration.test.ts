import { nodeBackupCipher } from './helpers/backup-cipher';
import { encryptBloo, decryptBloo } from '../src/backup/container';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import type { SQLiteDatabase } from 'expo-sqlite';
import { database, rows } from './database';
import { createArchive } from './backup-format';
import { saveDiary } from '../src/db/diary';
import { saveHabit } from '../src/db/habit';
import { saveSober, saveSoberRestart } from '../src/db/sober';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import { inventoryDigest } from '../src/backup/parts';
import { writeBackupArchive, type BackupSource } from '../src/backup/stream';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const photo = new Uint8Array([255, 216, 255, 7]);
const tables = ['diaries', 'habits', 'habit_completions', 'sobers', 'sober_restarts', 'settings'];

// Run the real restore coordinator with disk files and SQL; only native APIs are adapted.
function restoreHarness(root: string, failCopyAt = 0) {
  const cache = join(root, 'cache');
  const media = join(root, 'media');
  mkdirSync(cache);
  mkdirSync(media);
  let copies = 0;
  let openHandles = 0;
  let closedSnapshots = 0;
  class File {
    uri: string;
    constructor(...parts: (string | File | Directory)[]) {
      this.uri = join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
    }
    get name() {
      return basename(this.uri);
    }
    write(bytes: Uint8Array) {
      writeFileSync(this.uri, bytes);
    }
    rename(name: string) {
      const destination = join(dirname(this.uri), name);
      renameSync(this.uri, destination);
      this.uri = destination;
    }
    get size() {
      return statSync(this.uri).size;
    }
    get exists() {
      return existsSync(this.uri);
    }
    create() {
      mkdirSync(dirname(this.uri), { recursive: true });
      writeFileSync(this.uri, new Uint8Array());
    }
    open() {
      const fd = openSync(this.uri, 'r+');
      let offset = 0;
      openHandles++;
      return {
        get offset() {
          return offset;
        },
        readBytes(count: number) {
          const bytes = Buffer.alloc(count);
          const read = readSync(fd, bytes, 0, count, offset);
          offset += read;
          return bytes.subarray(0, read);
        },
        writeBytes(bytes: Uint8Array) {
          offset += writeSync(fd, bytes, 0, bytes.length, offset);
        },
        close() {
          closeSync(fd);
          openHandles--;
        },
      };
    }
    async bytes() {
      return new Uint8Array(readFileSync(this.uri));
    }
    async copy(destination: File) {
      copyFileSync(this.uri, destination.uri);
      if (++copies === failCopyAt) throw new Error('injected photo copy failure');
    }
    delete() {
      unlinkSync(this.uri);
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: (string | Directory)[]) {
      this.uri = join(...parts.map((part) => (typeof part === 'string' ? part : part.uri)));
    }
    create() {
      mkdirSync(this.uri, { recursive: true });
    }
    list() {
      return readdirSync(this.uri).map((name) =>
        statSync(join(this.uri, name)).isDirectory()
          ? new Directory(this.uri, name)
          : new File(this.uri, name),
      );
    }
    delete() {
      rmSync(this.uri, { recursive: true });
    }
  }
  const exports: {
    restoreBackup?: (db: SQLiteDatabase, uris: string[]) => Promise<void>;
    restoreEncryptedBackup?: (
      db: SQLiteDatabase,
      uris: string[],
      password: string,
    ) => Promise<void>;
  } = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/backup/index.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      setTimeout,
      require: (name: string) => {
        if (name === 'expo-file-system')
          return {
            File,
            Directory,
            Paths: { cache, document: root, availableDiskSpace: 1024 ** 3 },
          };
        if (name === 'expo-sqlite')
          return {
            deserializeDatabaseAsync: async (bytes: Uint8Array) => {
              const snapshot = await database(bytes);
              return {
                ...snapshot.db,
                closeAsync: async () => {
                  snapshot.raw.close();
                  closedSnapshots++;
                },
              };
            },
          };
        if (name === '../db')
          return {
            withMaintenance: (work: () => Promise<void>) => work(),
            withReadLock: (work: () => Promise<void>) => work(),
          };
        if (name === './crypto')
          return { backupCipher: nodeBackupCipher, deriveNativeBackupKey: nodeBackupCipher.derive };
        if (name === '../media') return { mediaFile: (name: string) => new File(media, name) };
        if (name === 'react-native') return { Platform: { OS: 'ios' } };
        if (name === 'expo-sharing' || name === 'expo-document-picker' || name === './share')
          return {};
        return require(name.startsWith('.') ? `../src/backup/${name}` : name);
      },
    },
  );
  return {
    cache,
    media,
    restore: exports.restoreBackup!,
    restoreEncrypted: exports.restoreEncryptedBackup!,
    handles: () => openHandles,
    snapshots: () => closedSnapshots,
  };
}

async function fixture(language?: 'ko' | 'en', split = false, failCopyAt = 0) {
  const root = mkdtempSync(join(tmpdir(), 'bloolog-restore-'));
  const source = await database();
  const target = await database();
  const h = restoreHarness(root, failCopyAt);
  await saveDiary(source.db, {
    date: '2024-02-29',
    emotion: 2,
    text: '내 기록 · My day · 日本語',
    files: ['one.jpg', 'two.jpg'],
  });
  await saveHabit(source.db, {
    name: '물 마시기',
    priority: 2,
    icon_key: 'water',
    initial_started_at: '2024-01-01T00:00:00.000Z',
  });
  source.raw.run(
    "INSERT INTO habit_completions VALUES (1, '2024-02-29', '2024-02-29T00:00:00.000Z')",
  );
  const soberId = await saveSober(source.db, {
    name: '줄일 항목',
    description: '나의 다짐',
    icon_key: 'coffee',
    icon_color: 'theme',
    is_priority: 1,
    initial_started_at: '2024-01-01T00:00:00.000Z',
    goal_mode: 'MANUAL',
    goal_days: 14,
  });
  await saveSoberRestart(source.db, {
    sober_id: soberId,
    restarted_at: '2024-02-01T00:00:00.000Z',
    memo: '그대로 보존할 메모',
  });
  const preferences: Record<string, unknown> = {
    ...DEFAULT_SETTINGS,
    language,
    themeAccent: 'pink',
    habitSort: 'CUSTOM',
    habitOrder: [1],
    diaryReminderTime: '21:00',
  };
  if (!language) delete preferences.language;
  source.raw.run('INSERT INTO settings VALUES (?, ?)', [
    'preferences',
    JSON.stringify(preferences),
  ]);
  await saveDiary(target.db, {
    date: '2023-01-01',
    emotion: 1,
    text: '기존 일기',
    files: ['old.jpg'],
  });
  writeFileSync(join(h.media, 'old.jpg'), photo);
  const files = { 'took.db': source.raw.export(), 'media/one.jpg': photo, 'media/two.jpg': photo };
  const archives: Uint8Array[] = [];
  if (split) {
    const set = {
      id: 'restore-integration-set',
      count: 2,
      inventorySha256: inventoryDigest(
        Object.entries(files).map(([name, bytes]) => ({ name, size: bytes.length })),
      ),
    };
    for (const [index, entries] of [
      { 'took.db': files['took.db'] },
      { 'media/one.jpg': photo, 'media/two.jpg': photo },
    ].entries()) {
      const chunks: Uint8Array[] = [];
      async function* sources(): AsyncGenerator<BackupSource> {
        for (const [name, bytes] of Object.entries(entries))
          yield {
            name,
            chunks: (async function* () {
              yield bytes!;
            })(),
          };
      }
      await writeBackupArchive(sources(), (bytes) => chunks.push(bytes.slice()), {
        ...set,
        index: index + 1,
      });
      archives.push(Buffer.concat(chunks));
    }
    archives.reverse();
  } else archives.push(createArchive(files));
  const uris = archives.map((bytes, index) => {
    writeFileSync(join(root, `original-${index}.zip`), bytes);
    const uri = join(h.cache, `took-import-fixture-${index}.zip`);
    writeFileSync(uri, bytes);
    return uri;
  });
  return {
    root,
    source,
    target,
    h,
    uris,
    close() {
      source.raw.close();
      target.raw.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

for (const language of ['en', 'ko', undefined] as const) {
  test(`full restore preserves records, photos and ${language ?? 'legacy System'} settings${language === 'ko' ? ' from an unordered split set' : ''}`, async () => {
    const f = await fixture(language, language === 'ko');
    try {
      await f.h.restore(f.target.db, f.uris);
      for (const table of tables.filter((name) => name !== 'settings')) {
        assert.deepEqual(
          rows(f.target.raw, `SELECT * FROM ${table}`),
          rows(f.source.raw, `SELECT * FROM ${table}`),
          table,
        );
      }
      const settings = JSON.parse(String(rows(f.target.raw, 'SELECT value FROM settings')[0][0]));
      assert.equal(settings.language, language ?? 'system');
      assert.equal(settings.themeAccent, 'pink');
      assert.equal(settings.diaryReminderTime, '21:00');
      assert.deepEqual(settings.habitOrder, [1]);
      const images = rows(
        f.target.raw,
        'SELECT id, diary_id, file_name, position FROM diary_images ORDER BY position',
      );
      assert.deepEqual(
        images.map(([id, diary, , position]) => [id, diary, position]),
        rows(f.source.raw, 'SELECT id, diary_id, position FROM diary_images ORDER BY position'),
      );
      for (const [, , name] of images)
        assert.deepEqual(new Uint8Array(readFileSync(join(f.h.media, String(name)))), photo);
      assert.equal(existsSync(join(f.h.media, 'old.jpg')), false);
      assert.equal(readdirSync(f.h.media).length, 2);
      assert.deepEqual(rows(f.target.raw, 'PRAGMA foreign_key_check'), []);
      assert.equal(f.h.handles(), 0);
      assert.equal(f.h.snapshots(), 1);
      assert.deepEqual(readdirSync(f.h.cache), []);
      assert(f.uris.every((_, index) => existsSync(join(f.root, `original-${index}.zip`))));
    } finally {
      f.close();
    }
  });
}

for (const failure of ['copy', 'database', 'missing-part', 'corrupt'] as const) {
  test(`full restore ${failure} failure preserves existing data and photos and cleans temporary files`, async () => {
    const f = await fixture('en', failure === 'missing-part', failure === 'copy' ? 2 : 0);
    try {
      const h = f.h;
      // Copy failures occur after writing bytes, exercising partial-file cleanup.
      if (failure === 'database')
        f.target.raw.run(
          "CREATE TRIGGER injected_failure BEFORE INSERT ON habits BEGIN SELECT RAISE(ABORT, 'injected DB failure'); END",
        );
      if (failure === 'corrupt') writeFileSync(f.uris[0], new Uint8Array([1, 2, 3]));
      const before = Object.fromEntries(
        tables.map((name) => [name, rows(f.target.raw, `SELECT * FROM ${name}`)]),
      );
      await assert.rejects(
        h.restore(f.target.db, failure === 'missing-part' ? f.uris.slice(0, 1) : f.uris),
      );
      for (const name of tables)
        assert.deepEqual(rows(f.target.raw, `SELECT * FROM ${name}`), before[name], name);
      assert.deepEqual(rows(f.target.raw, 'SELECT * FROM diary_images'), [[1, 1, 'old.jpg', 0]]);
      assert.deepEqual(new Uint8Array(readFileSync(join(h.media, 'old.jpg'))), photo);
      assert.deepEqual(readdirSync(h.media), ['old.jpg']);
      assert.equal(h.handles(), 0);
      assert.equal(h.snapshots(), failure === 'copy' || failure === 'database' ? 1 : 0);
      assert(!readdirSync(h.cache).some((name) => name.startsWith('took-restore-')));
      const selected = failure === 'missing-part' ? f.uris.slice(0, 1) : f.uris;
      assert(selected.every((uri) => !existsSync(uri)));
      assert(f.uris.every((_, index) => existsSync(join(f.root, `original-${index}.zip`))));
    } finally {
      f.close();
    }
  });
}

for (const failure of [null, 'password', 'truncated', 'tampered'] as const) {
  test(`encrypted .bloo restore ${failure ?? 'roundtrip with a protected safety backup'}`, async () => {
    const f = await fixture('ko');
    try {
      const before = rows(f.target.raw, 'SELECT * FROM diaries');
      const password = '비밀번호 backup 123';
      const salt = await nodeBackupCipher.random(16);
      const key = await nodeBackupCipher.derive!(password, salt);
      const chunks: Uint8Array[] = [];
      await encryptBloo(
        (async function* () {
          yield readFileSync(f.uris[0]);
        })(),
        { salt, key },
        nodeBackupCipher,
        (bytes) => chunks.push(bytes),
      );
      let encrypted = Buffer.concat(chunks);
      if (failure === 'truncated') encrypted = encrypted.subarray(0, -32);
      if (failure === 'tampered') encrypted[100] ^= 1;
      const selected = join(f.h.cache, 'took-import-encrypted.bloo');
      writeFileSync(selected, encrypted);
      // Adapt the real DB serializer, used only for the pre-restore safety snapshot.
      f.target.db.serializeAsync = async () => new Uint8Array(f.target.raw.export());
      const restore = f.h.restoreEncrypted(
        f.target.db,
        [selected],
        failure === 'password' ? 'wrong' : password,
      );
      if (failure) {
        await assert.rejects(restore);
        assert.deepEqual(rows(f.target.raw, 'SELECT * FROM diaries'), before);
        assert(!readdirSync(f.root).some((name) => name.startsWith('bloolog-before-restore-')));
      } else {
        await restore;
        assert.deepEqual(
          rows(f.target.raw, 'SELECT * FROM diaries'),
          rows(f.source.raw, 'SELECT * FROM diaries'),
        );
        const safety = readdirSync(f.root).find((name) =>
          name.startsWith('bloolog-before-restore-'),
        );
        assert(safety);
        const saved = readFileSync(join(f.root, safety));
        let offset = 0;
        const plain: Uint8Array[] = [];
        for await (const chunk of decryptBloo(
          (size) => {
            const part = saved.subarray(offset, offset + size);
            offset += part.length;
            return part;
          },
          password,
          nodeBackupCipher,
        ))
          plain.push(chunk);
        assert(Buffer.concat(plain).length > 0);
      }
      assert.equal(f.h.handles(), 0);
      assert(!existsSync(selected));
      assert(!readdirSync(f.h.cache).some((name) => name.startsWith('bloo-stage-')));
    } finally {
      f.close();
    }
  });
}
