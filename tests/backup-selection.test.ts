import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import * as container from '../src/backup/container';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function selection(
  options: {
    canceled?: boolean;
    sizes?: number[];
    reportedSizes?: number[];
    wait?: Promise<void>;
    failAt?: number;
    platform?: 'android' | 'ios';
    name?: string;
    header?: Uint8Array;
  } = {},
) {
  const originals = (options.sizes ?? [100]).map((size, index) => ({
    uri: `content://downloads/${index}`,
    size,
  }));
  const files = new Map(originals.map((file) => [file.uri, file.size]));
  const copies: string[] = [];
  const deleted: string[] = [];
  let pickerOptions: any;
  let initialDirectory: string | undefined;
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
    open() {
      return {
        readBytes: () =>
          options.header ?? new Uint8Array([...container.BLOO_MAGIC, ...new Uint8Array(48)]),
        close: () => {},
      };
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
        if (name === './operation') return { withBackupOperation: (work: () => unknown) => work() };
        if (name === './container') return { ...container, BLOO_MAX_BYTES: 1000 };
        if (name === 'react-native') return { Platform: { OS: options.platform ?? 'android' } };
        if (name === 'expo-file-system')
          return {
            File,
            Paths: { cache: 'file://project/cache' },
            Directory: {
              pickDirectoryAsync: async (uri?: string) => {
                initialDirectory = uri;
                throw new Error('cancel');
              },
            },
          };
        if (name === 'expo-document-picker')
          return {
            getDocumentAsync: async (value: any) => {
              pickerOptions = value;
              return {
                canceled: options.canceled ?? false,
                assets: originals.map((file, index) => ({
                  uri: file.uri,
                  name: options.name ?? 'backup.bloo',
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
  return {
    exports,
    originals,
    files,
    copies,
    deleted,
    pickerOptions: () => pickerOptions,
    initialDirectory: () => initialDirectory,
  };
}

test('backup export preserves the Android Documents hint and lets iOS choose its own folder', async () => {
  for (const platform of ['android', 'ios'] as const) {
    const value = selection({ platform });
    assert.equal(await value.exports.exportBackup({}, 'device'), false);
    assert.equal(
      value.initialDirectory(),
      platform === 'android'
        ? 'content://com.android.externalstorage.documents/document/primary%3ADocuments'
        : undefined,
    );
    assert.deepEqual(value.deleted, []);
  }
});

test('backup selection waits for its cache copy and preserves the original encrypted backup', async () => {
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
  assert.equal(value.pickerOptions().multiple, false);
  finish();
  const uris = await pending;
  assert.equal(uris.length, 1);
  for (const uri of uris) assert.match(uri, /^file:\/\/project\/cache\/took-import-.*\.bloo$/);
  value.exports.discardBackupSelection([...uris, ...value.originals.map((file) => file.uri)]);
  assert.deepEqual(value.deleted, Array.from(uris));
  assert(value.originals.every((file) => value.files.has(file.uri)));
});

test('failed selection removes completed and partial copies while preserving originals', async () => {
  const value = selection({ failAt: 0 });
  await assert.rejects(value.exports.chooseBackup(), /copy failed/);
  assert.deepEqual(value.deleted, value.copies);
  assert(value.originals.every((file) => value.files.has(file.uri)));
});

test('iOS backup selection downloads provider documents before reading and copying', async () => {
  const value = selection({ platform: 'ios' });
  const uris = await value.exports.chooseBackup();
  assert.equal(value.pickerOptions().copyToCacheDirectory, true);
  assert.equal(value.pickerOptions().multiple, false);
  assert.equal(uris.length, 1);
  assert.equal(value.copies.length, 1);
});

test('backup selection rejects excessive counts and sizes without deleting originals', async () => {
  for (const options of [
    { sizes: [1, 2, 3, 4] },
    { sizes: [1001] },
    { sizes: [1001], reportedSizes: [0] },
  ]) {
    const value = selection(options);
    await assert.rejects(value.exports.chooseBackup(), /BLOO_SELECT_ONE|BLOO_TOO_LARGE/);
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

test('selection rejects images, ZIPs and renamed files with invalid magic', async () => {
  for (const name of ['photo.jpg', 'backup.zip']) {
    const value = selection({ name });
    await assert.rejects(value.exports.chooseBackup(), /BLOO_SELECT_ONE/);
    assert.equal(value.copies.length, 0);
  }
  const value = selection({ header: new Uint8Array(56) });
  await assert.rejects(value.exports.chooseBackup(), /BLOO_INVALID/);
  assert.deepEqual(value.deleted, value.copies);
});
