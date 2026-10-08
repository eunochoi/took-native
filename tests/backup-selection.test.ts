import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function selection(
  options: {
    canceled?: boolean;
    sizes?: number[];
    reportedSizes?: number[];
    wait?: Promise<void>;
    failAt?: number;
  } = {},
) {
  const originals = (options.sizes ?? [100, 200]).map((size, index) => ({
    uri: `content://downloads/${index}`,
    size,
  }));
  const files = new Map(originals.map((file) => [file.uri, file.size]));
  const copies: string[] = [];
  const deleted: string[] = [];
  let pickerOptions: any;
  class File {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri) ?? 0;
    }
    async copy(destination: File) {
      copies.push(destination.uri);
      await options.wait;
      files.set(destination.uri, this.size);
      if (copies.length - 1 === options.failAt) throw new Error('copy failed');
    }
    delete() {
      deleted.push(this.uri);
      files.delete(this.uri);
    }
  }
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/backup/index.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'expo-file-system') return { File, Paths: { cache: 'file://project/cache' } };
        if (name === 'expo-document-picker')
          return {
            getDocumentAsync: async (value: any) => {
              pickerOptions = value;
              return {
                canceled: options.canceled ?? false,
                assets: originals.map((file, index) => ({
                  uri: file.uri,
                  size: options.reportedSizes?.[index] ?? file.size,
                })),
              };
            },
          };
        if (name === './format') return { MAX_BACKUP_BYTES: 1000, MAX_BACKUP_FILES: 3 };
        return {};
      },
    },
  );
  return { exports, originals, files, copies, deleted, pickerOptions: () => pickerOptions };
}

test('backup selection waits for all copies in the project cache and preserves original ZIPs', async () => {
  let finish!: () => void;
  const value = selection({
    wait: new Promise<void>((resolve) => {
      finish = resolve;
    }),
  });
  let settled = false;
  const pending = value.exports.chooseBackup().then((uris: string[]) => {
    settled = true;
    return uris;
  });
  await new Promise(setImmediate);
  assert.equal(settled, false);
  assert.equal(value.pickerOptions().copyToCacheDirectory, false);
  assert.equal(value.pickerOptions().multiple, true);
  finish();
  const uris = await pending;
  assert.equal(uris.length, 2);
  for (const uri of uris) assert.match(uri, /^file:\/\/project\/cache\/took-import-.*\.zip$/);
  value.exports.discardBackupSelection([...uris, ...value.originals.map((file) => file.uri)]);
  assert.deepEqual(value.deleted, Array.from(uris));
  assert(value.originals.every((file) => value.files.has(file.uri)));
});

test('failed selection removes completed and partial copies while preserving originals', async () => {
  const value = selection({ failAt: 1 });
  await assert.rejects(value.exports.chooseBackup(), /copy failed/);
  assert.deepEqual(value.deleted, value.copies);
  assert(value.originals.every((file) => value.files.has(file.uri)));
});

test('backup selection rejects excessive counts and sizes without deleting originals', async () => {
  for (const options of [
    { sizes: [1, 2, 3, 4] },
    { sizes: [1001] },
    { sizes: [1001], reportedSizes: [0] },
  ]) {
    const value = selection(options);
    await assert.rejects(value.exports.chooseBackup(), /제한을 초과/);
    assert.equal(value.copies.length, 0);
    assert.equal(value.deleted.length, 0);
  }
});

test('canceled backup selection does not copy or delete files', async () => {
  const value = selection({ canceled: true });
  assert.equal(await value.exports.chooseBackup(), null);
  assert.equal(value.copies.length, 0);
  assert.equal(value.deleted.length, 0);
});
