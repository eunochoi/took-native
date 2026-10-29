import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { i18n, t } from '../src/i18n/core';

const require = createRequire(import.meta.url);
const ts = require('typescript');

test('single encrypted backup share reads the active language for each export and keeps file options and cache retention', async () => {
  const shares: any[] = [];
  const files: any[] = [];
  let validations = 0;
  class File {
    uri: string;
    size = 8;
    exists = true;
    constructor(...parts: any[]) {
      this.uri = parts.map((part) => part.uri ?? part).join('/');
      files.push(this);
    }
    create() {}
    write() {}
    open() {
      let offset = 0;
      return {
        get offset() {
          return offset;
        },
        readBytes: (length: number) => {
          offset += length;
          return new Uint8Array(length);
        },
        writeBytes: () => {},
        close: () => {},
      };
    }
    delete() {
      this.exists = false;
    }
  }
  class Directory {
    uri: string;
    constructor(...parts: string[]) {
      this.uri = parts.join('/');
    }
    create() {}
    delete() {}
    list() {
      return [];
    }
  }
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/backup/index.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      setTimeout,
      require: (name: string) => {
        if (name.endsWith('/i18n/core')) return { t };
        if (name === 'react-native') return { Platform: { OS: 'android' } };
        if (name === 'expo-file-system')
          return { File, Directory, Paths: { cache: 'file://cache', availableDiskSpace: 1e9 } };
        if (name === 'expo-sharing')
          return {
            isAvailableAsync: async () => true,
            shareAsync: async (uri: string, options: unknown) => shares.push({ uri, options }),
          };
        if (name === '../db') return { withReadLock: (callback: () => unknown) => callback() };
        if (name === './operation')
          return { withBackupOperation: (callback: () => unknown) => callback() };
        if (name === './crypto')
          return {
            backupCipher: { random: async () => new Uint8Array(16) },
            deriveNativeBackupKey: async () => new Uint8Array(32),
          };
        if (name === './container')
          return {
            validatePassword: () => {},
            deriveBackupKey: async () => new Uint8Array(32),
            encryptBloo: async () => {},
            decryptBloo: async function* () {},
          };
        if (name === './stream')
          return {
            MAX_DATABASE_BYTES: 1024,
            BACKUP_CHUNK_BYTES: 4,
            writeBackupArchive: async (sources: AsyncIterable<any>, write: Function) => {
              for await (const source of sources)
                for await (const bytes of source.chunks) write(bytes);
            },
            extractBackupArchive: async () => ({}),
          };
        if (name === './parts')
          return {
            planBackupParts: (entries: any[]) => [entries],
            inventoryDigest: () => 'digest',
            validateBackupSet: () => {
              validations++;
            },
          };
        return {};
      },
    },
  );
  const db = {
    getFirstAsync: async () => ({}),
    serializeAsync: async () => new Uint8Array(8),
    getAllAsync: async () => [],
  };
  const initial = i18n.locale;
  try {
    for (const [language, title] of [
      ['ko', 'Google Drive 등으로 백업 공유'],
      ['en', 'Share backup'],
    ]) {
      i18n.locale = language;
      assert.equal(await exports.exportBackup(db, 'share', 'password123'), 1);
      const share = shares.at(-1);
      assert.equal(share.options.dialogTitle, title);
      assert.equal(share.options.mimeType, 'application/octet-stream');
      assert.equal(share.options.UTI, 'com.took.bloo');
      assert.match(share.uri, /^file:\/\/cache\/bloolog-\d+-[a-z0-9]+\.bloo$/);
    }
  } finally {
    i18n.locale = initial;
  }
  assert.equal(validations, 2);
  assert(files.every((file) => file.exists));
});
