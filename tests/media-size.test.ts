import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const fiveMB = 5 * 1024 * 1024;

function media(
  assets: { uri: string; fileSize?: number; width: number; height: number }[],
  sizes: Record<string, number> = {},
) {
  const exports: Record<string, Function> = {};
  const deleted: string[] = [];
  let converted = 0;
  class File {
    uri: string;
    exists = true;
    constructor(uri: string) {
      this.uri = uri;
    }
    get size() {
      return sizes[this.uri];
    }
    delete() {
      deleted.push(this.uri);
    }
  }
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/media/index.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === '../domain/limits') return require('../src/domain/limits');
        if (name === 'expo-file-system')
          return { Directory: class {}, File, Paths: { document: 'document' } };
        if (name === 'expo-image-picker')
          return { launchImageLibraryAsync: async () => ({ canceled: false, assets }) };
        if (name === 'expo-image-manipulator')
          return {
            SaveFormat: { JPEG: 'jpeg' },
            ImageManipulator: {
              manipulate: () => ({
                resize: () => undefined,
                release: () => undefined,
                renderAsync: async () => {
                  const uri = `cache-${++converted}`;
                  return { saveAsync: async () => ({ uri }), release: () => undefined };
                },
              }),
            },
          };
        return {};
      },
    },
  );
  return { pick: () => exports.pickImages(5), deleted, count: () => converted };
}
const asset = (size?: number) => ({ uri: 'photo', fileSize: size, width: 500, height: 500 });

test('image selection accepts exactly 5MB and rejects a larger source before conversion', async () => {
  const allowed = media([asset(fiveMB)]);
  assert.equal((await allowed.pick()).length, 1);
  const oversized = media([asset(fiveMB + 1)]);
  await assert.rejects(oversized.pick(), /한 장당 5MB/);
  assert.equal(oversized.count(), 0);
});

test('image selection checks file size when picker metadata is absent and cleans a partially processed batch', async () => {
  const fallback = media([asset()], { photo: fiveMB + 1 });
  await assert.rejects(fallback.pick(), /한 장당 5MB/);
  const batch = media([asset(1000), asset(fiveMB + 1)]);
  await assert.rejects(batch.pick(), /한 장당 5MB/);
  assert.deepEqual(batch.deleted, ['cache-1']);
});
