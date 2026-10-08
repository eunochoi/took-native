import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Execute the real save/restore orchestration with a pending SDK 57 file copy.
function copying(kind: 'diary' | 'backup') {
  const events: string[] = [];
  let resolveCopy!: () => void;
  let rejectCopy!: (error: Error) => void;
  const copy = new Promise<void>((resolve, reject) => {
    resolveCopy = resolve;
    rejectCopy = reject;
  });
  class Directory {
    uri: string;
    constructor(...parts: (string | Directory)[]) {
      this.uri = parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
    }
    create() {}
    delete() {
      events.push('staging removed');
    }
  }
  class File extends Directory {
    exists = true;
    size = 1;
    async bytes() {
      return new Uint8Array(100);
    }
    async copy() {
      events.push('copy started');
      await copy;
      events.push('copy completed');
    }
    delete() {
      events.push(`delete:${this.uri}`);
    }
  }
  const exports: Record<string, Function> = {};
  const db = {
    getAllAsync: async () => [{ file_name: 'old.jpg' }],
    getFirstAsync: async () => null,
  };
  const path = kind === 'diary' ? '../src/media/index.ts' : '../src/backup/index.ts';
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'expo-file-system')
          return {
            File,
            Directory,
            Paths: { document: 'document', cache: 'cache', availableDiskSpace: 1e12 },
          };
        if (name === 'expo-sqlite')
          return { deserializeDatabaseAsync: async () => ({ closeAsync: async () => undefined }) };
        if (name === '../db')
          return {
            withWriteLock: async (run: Function) => run(),
            withMaintenance: async (run: Function) => run(),
          };
        if (name === '../db/diary')
          return {
            saveDiary: async () => {
              events.push('database saved');
              return { id: 1, removed: [] };
            },
          };
        if (name === '../media') return { mediaFile: (name: string) => new File('media', name) };
        if (name === './format') return { MAX_BACKUP_BYTES: 1e9 };
        if (name === './stream') return { extractBackupArchive: async () => ({}) };
        if (name === './parts') return { validateBackupSet: () => [] };
        if (name === './database')
          return {
            readBackupDatabase: async () => ({ images: [{ file_name: 'new.jpg' }] }),
            replaceRecords: async () => {
              events.push('database replaced');
            },
          };
        return {};
      },
    },
  );
  return {
    events,
    resolveCopy,
    rejectCopy,
    start: () =>
      kind === 'diary'
        ? exports.saveDiaryImages(db, { date: '2026-10-05', emotion: 1, content: 'test' }, [
            { file: 'new.jpg', uri: 'draft.jpg', temporary: true },
          ])
        : exports.restoreBackup(db, ['cache/took-import-1-test-0.zip']),
  };
}

for (const kind of ['diary', 'backup'] as const) {
  test(`${kind} waits for async file copy before saving records or removing old files`, async () => {
    const operation = copying(kind);
    const pending = operation.start();
    await new Promise(setImmediate);
    assert.deepEqual(operation.events, ['copy started']);
    operation.resolveCopy();
    await pending;
    assert.deepEqual(operation.events.slice(0, 3), [
      'copy started',
      'copy completed',
      kind === 'diary' ? 'database saved' : 'database replaced',
    ]);
    if (kind === 'backup') assert(operation.events.includes('delete:media/old.jpg'));
  });
  test(`${kind} aborts on a rejected file copy without changing existing records`, async () => {
    const operation = copying(kind);
    const pending = operation.start();
    const failure = assert.rejects(pending, /copy failed/);
    await new Promise(setImmediate);
    operation.rejectCopy(new Error('copy failed'));
    await failure;
    assert(!operation.events.some((event) => event.startsWith('database')));
    assert(!operation.events.includes('delete:media/old.jpg'));
    if (kind === 'backup') {
      assert(operation.events.includes('staging removed'));
      assert(operation.events.includes('delete:cache/took-import-1-test-0.zip'));
    }
  });
}
