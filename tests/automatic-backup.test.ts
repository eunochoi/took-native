import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import * as policy from '../src/backup/policy';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const device = 'a'.repeat(16);
const filename = (day: string, time: number) =>
  `bloolog-${device}-${day}-${time}-${'b'.repeat(16)}.bloo`;
function harness(platform: 'android' | 'ios' = 'android', secureStoreAvailable = true) {
  const now = new Date(2026, 9, 28, 12);
  class Clock extends Date {
    constructor(...args: any[]) {
      super(args.length ? args[0] : now.getTime());
    }
    static now() {
      return now.getTime();
    }
  }
  let config: any = {
    version: 1,
    enabled: true,
    device,
    directory: 'folder',
    ...(platform === 'ios' ? { identity: 'account-one' } : {}),
    salt: 'c'.repeat(32),
    key: 'd'.repeat(64),
    lastDay: '2026-10-27',
    lastSuccess: '2026-10-27T12:00:00Z',
  };
  let uploaded = false;
  let identity = 'account-one';
  let failPublish = false;
  let failRemove = false;
  let creates = 0;
  let random = 0;
  let busy = false;
  const files = new Set([
    filename('2026-10-25', 1),
    filename('2026-10-26', 2),
    filename('2026-10-27', 3),
    'manual.bloo',
  ]);
  const removed: string[] = [];
  const events: string[] = [];
  const exports: any = {};
  const publish = async (_source: string, name: string) => {
    events.push('publish');
    if (failPublish) throw new Error('disk full');
    files.add(name);
  };
  const remove = async (name: string) => {
    if (failRemove) throw new Error('cannot delete');
    removed.push(name);
    files.delete(name);
  };
  class File {
    exists = true;
    constructor(..._parts: any[]) {}
    delete() {
      this.exists = false;
    }
    write() {}
  }
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/backup/automatic.ts', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      },
    ).outputText,
    {
      exports,
      Date: Clock,
      Error,
      setTimeout,
      require: (name: string) => {
        if (name === 'expo')
          return {
            requireOptionalNativeModule: (name: string) =>
              name === 'ExpoSecureStore'
                ? secureStoreAvailable
                  ? {}
                  : null
                : name === 'BlooCloud'
                  ? {
                      location: async () => ({ uri: 'folder', identity }),
                      names: async () => [...files],
                      publish,
                      uploaded: async () => uploaded,
                      remove,
                    }
                  : {
                      names: async () => [...files],
                      publish: async (source: string, _folder: string, name: string) =>
                        publish(source, name),
                      remove: async (_folder: string, name: string) => remove(name),
                    },
          };
        if (name === 'expo-secure-store') {
          assert(secureStoreAvailable, 'unavailable SecureStore must not be imported');
          return {
            getItemAsync: async () => (config ? JSON.stringify(config) : null),
            setItemAsync: async (_key: string, value: string) => {
              config = JSON.parse(value);
              events.push('save');
            },
            deleteItemAsync: async () => {
              config = null;
            },
          };
        }
        if (name === 'expo-file-system') return { File, Paths: { document: 'document' } };
        if (name === 'react-native') return { Platform: { OS: platform } };
        if (name === '@noble/hashes/utils.js') return { bytesToHex, hexToBytes };
        if (name === './policy') return { ...policy, backupDay: () => policy.backupDay(now) };
        if (name === './operation')
          return {
            backupBusy: () => busy,
            withBackupOperation: async (work: () => unknown) => {
              assert(!busy);
              busy = true;
              try {
                return await work();
              } finally {
                busy = false;
              }
            },
          };
        if (name === './crypto')
          return {
            backupCipher: { random: async (size: number) => new Uint8Array(size).fill(++random) },
          };
        if (name === './index')
          return {
            createEncryptedBackup: async () => {
              creates++;
              events.push('create');
              return { uri: 'cache/backup.bloo', exists: true, delete: () => {} };
            },
          };
        if (name === './container') return {};
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return {
    exports,
    files,
    removed,
    events,
    config: () => config,
    creates: () => creates,
    update: (patch: any) => {
      config = { ...config, ...patch };
    },
    setUploaded: () => {
      uploaded = true;
    },
    setIdentity: (value: string) => {
      identity = value;
    },
    failPublish: () => {
      failPublish = true;
    },
    failRemove: () => {
      failRemove = true;
    },
  };
}
test('daily automatic backup publishes before pruning, keeps three dates and skips a second run today', async () => {
  const h = harness();
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 1);
  assert.equal(h.config().lastDay, '2026-10-28');
  assert.equal(h.files.size, 4); // Three automatic backups plus an untouched manual backup.
  assert.deepEqual(h.removed, [filename('2026-10-25', 1)]);
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 1);
  await h.exports.runAutomaticBackup({}, true);
  assert.equal(h.creates(), 2);
  assert.equal(h.files.size, 4);
});
test('failed publication preserves every previous backup and the last success date', async () => {
  const h = harness();
  const before = [...h.files];
  h.failPublish();
  assert.equal(await h.exports.runAutomaticBackup({}), false);
  assert.deepEqual([...h.files], before);
  assert.deepEqual(h.removed, []);
  assert.equal(h.config().lastDay, '2026-10-27');
  assert.equal(h.exports.autoBackupStatus().error, 'disk full');
});
test('iCloud upload pending does not advance success or delete old backups; confirmed upload does', async () => {
  const h = harness('ios');
  await h.exports.runAutomaticBackup({});
  assert(h.config().pending);
  assert.equal(h.config().lastDay, '2026-10-27');
  assert.deepEqual(h.removed, []);
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 1);
  assert.deepEqual(h.removed, []);
  h.setUploaded();
  await h.exports.runAutomaticBackup({});
  assert.equal(h.config().pending, undefined);
  assert.equal(h.config().lastDay, '2026-10-28');
  assert.equal(h.files.size, 4);
  assert.equal(h.creates(), 1);
});
test('account change never writes to or prunes the new iCloud account', async () => {
  const h = harness('ios');
  h.setIdentity('account-two');
  assert.equal(await h.exports.runAutomaticBackup({}), false);
  assert.equal(h.creates(), 0);
  assert.deepEqual(h.removed, []);
  assert.match(h.exports.autoBackupStatus().error, /ACCOUNT_CHANGED/);
});
test('disabled and post-restore paused backups do not create new files', async () => {
  for (const patch of [{ enabled: false }, { pausedAfterRestore: true }]) {
    const h = harness();
    h.update(patch);
    await h.exports.runAutomaticBackup({});
    assert.equal(h.creates(), 0);
    assert.deepEqual(h.removed, []);
  }
});
test('interrupted upload intent with no published file is retried rather than stuck forever', async () => {
  const h = harness('ios');
  h.update({
    pending: {
      name: filename('2026-10-28', 7),
      day: '2026-10-28',
      created: '2026-10-28T00:00:00Z',
    },
  });
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 1);
  assert(h.files.has(h.config().pending.name));
  assert.deepEqual(h.removed, []);
});

test('cleanup failure keeps the newly published backup and its success status', async () => {
  const h = harness();
  h.failRemove();
  assert.equal(await h.exports.runAutomaticBackup({}), true);
  assert.equal(h.config().lastDay, '2026-10-28');
  assert.equal(h.files.size, 5);
  assert.equal(h.exports.autoBackupStatus().error, 'BLOO_RETENTION_FAILED');
  await h.exports.refreshAutoBackupStatus();
  assert.equal(h.exports.autoBackupStatus().error, 'BLOO_RETENTION_FAILED');
});

test('a manually removed current backup is recreated, and stale partial files never count toward retention', async () => {
  const h = harness();
  await h.exports.runAutomaticBackup({});
  h.files.delete(h.config().lastName);
  const partial = `${filename('2026-10-20', 1)}.pending`;
  h.files.add(partial);
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 2);
  assert(h.files.has(h.config().lastName));
  assert(!h.files.has(partial));
});

test('startup and foreground checks tolerate a build without SecureStore', async () => {
  const h = harness('android', false);
  await h.exports.refreshAutoBackupStatus();
  assert.equal(h.exports.autoBackupStatus().enabled, false);
  assert.equal(h.exports.autoBackupStatus().error, undefined);
  await h.exports.runAutomaticBackup({});
  assert.equal(h.creates(), 0);
  await assert.rejects(
    h.exports.configureAutomaticBackup({}, 'password123'),
    /BLOO_NATIVE_REQUIRED/,
  );
});
