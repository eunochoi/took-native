import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { i18n, t } from '../src/i18n/core';

const require = createRequire(import.meta.url);
const ts = require('typescript');

test('single ZIP backup share reads the active language for each export and keeps file options and cache retention', async () => {
  const shares: any[] = [];
  const files: any[] = [];
  let validations = 0;
  class File {
    uri: string;
    size = 8;
    exists = true;
    constructor(...parts: string[]) {
      this.uri = parts.join('/');
      files.push(this);
    }
    create() {}
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
        if (name === '../db') return { withMaintenance: (callback: () => unknown) => callback() };
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
      ['en', 'Share backup to Google Drive or another app'],
    ]) {
      i18n.locale = language;
      assert.equal(await exports.exportBackup(db, 'share'), 1);
      const share = shares.at(-1);
      assert.equal(share.options.dialogTitle, title);
      assert.equal(share.options.mimeType, 'application/zip');
      assert.equal(share.options.UTI, 'public.zip-archive');
      assert.match(share.uri, /^file:\/\/cache\/took-backup-\d+\.zip$/);
    }
  } finally {
    i18n.locale = initial;
  }
  assert.equal(validations, 2);
  assert(files.every((file) => file.exists));
});
