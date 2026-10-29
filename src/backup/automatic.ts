import { requireOptionalNativeModule } from 'expo';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { backupCipher, deriveNativeBackupKey } from './crypto';
import { validatePassword } from './container';
import { createEncryptedBackup } from './index';
import { backupDay, expiredBackups, parseAutomaticBackup } from './policy';
import { backupBusy, withBackupOperation } from './operation';

const KEY = 'bloolog.auto-backup.v1';
const OPTIONS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
interface AutoConfig {
  version: 1;
  enabled: boolean;
  device: string;
  directory: string;
  identity?: string;
  salt: string;
  key: string;
  lastDay?: string;
  lastName?: string;
  lastSuccess?: string;
  lastError?: string;
  pending?: { name: string; day: string; created: string };
  pausedAfterRestore?: boolean;
}
export interface AutoBackupStatus {
  enabled: boolean;
  lastSuccess?: string;
  pending: boolean;
  paused: boolean;
  error?: string;
  configured: boolean;
}
const cloud = requireOptionalNativeModule<{
  location: () => Promise<{ uri: string; identity: string }>;
  publish: (source: string, name: string, identity: string) => Promise<void>;
  uploaded: (name: string, identity: string) => Promise<boolean>;
  names: (identity: string) => Promise<string[]>;
  remove: (name: string, identity: string) => Promise<void>;
}>('BlooCloud');
const local = requireOptionalNativeModule<{
  folder: (uri: string) => Promise<string>;
  names: (uri: string) => Promise<string[]>;
  publish: (source: string, uri: string, name: string) => Promise<void>;
  remove: (uri: string, name: string) => Promise<void>;
}>('BlooLocal');
let status: AutoBackupStatus = { enabled: false, pending: false, paused: false, configured: false };
const listeners = new Set<() => void>();
export const autoBackupStatus = () => status;
export function subscribeAutoBackup(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function publishStatus(config: AutoConfig | null, error?: string) {
  status = {
    enabled: config?.enabled ?? false,
    pending: !!config?.pending,
    paused: !!config?.pausedAfterRestore,
    lastSuccess: config?.lastSuccess,
    configured: !!config,
    error: error ?? config?.lastError,
  };
  listeners.forEach((listener) => listener());
}
let installation: Promise<void> | undefined;
async function ensureInstallation() {
  if (!installation)
    installation = (async () => {
      const marker = new File(Paths.document, 'bloo-installation-v1');
      if (!marker.exists) {
        // iOS Keychain can survive uninstall. Never enable a fresh empty installation from stale keys.
        await SecureStore.deleteItemAsync(KEY, OPTIONS);
        marker.write('1');
      }
    })().catch((error) => {
      installation = undefined;
      throw error;
    });
  await installation;
}
async function readConfig(): Promise<AutoConfig | null> {
  await ensureInstallation();
  const value = await SecureStore.getItemAsync(KEY, OPTIONS);
  if (!value) return null;
  const config = JSON.parse(value) as AutoConfig;
  if (
    config.version !== 1 ||
    !/^[a-f0-9]{64}$/.test(config.key) ||
    !/^[a-f0-9]{32}$/.test(config.salt) ||
    !/^[a-f0-9]{16}$/.test(config.device)
  )
    throw new Error('BLOO_INVALID');
  return config;
}
async function saveConfig(config: AutoConfig) {
  await SecureStore.setItemAsync(KEY, JSON.stringify(config), OPTIONS);
  publishStatus(config);
}
export async function refreshAutoBackupStatus() {
  try {
    publishStatus(await readConfig());
  } catch (error) {
    publishStatus(null, String(error));
  }
}
async function prune(config: AutoConfig) {
  const names = config.identity
    ? await cloud!.names(config.identity)
    : await local!.names(config.directory);
  const entries = names.flatMap((name) => {
    const parsed = parseAutomaticBackup(name, config.device);
    return parsed ? [parsed] : [];
  });
  for (const entry of expiredBackups(entries, config.lastName)) {
    if (config.identity) await cloud!.remove(entry.name, config.identity);
    else await local!.remove(config.directory, entry.name);
  }
}
async function finishRetention(config: AutoConfig) {
  try {
    await prune(config);
    config.lastError = undefined;
  } catch {
    // Publication succeeded; retain the new key and retry cleanup later without deleting more files.
    config.lastError = 'BLOO_RETENTION_FAILED';
  }
  await saveConfig(config);
}
async function performBackup(db: SQLiteDatabase, config: AutoConfig, force: boolean) {
  if (!config.identity) {
    if (!local) throw new Error('BLOO_NATIVE_REQUIRED');
    const names = await local.names(config.directory);
    if (config.lastName && !names.includes(config.lastName)) config.lastDay = undefined;
    for (const name of names) {
      if (!name.endsWith('.pending')) continue;
      const partial = parseAutomaticBackup(name.slice(0, -8), config.device);
      if (partial && Date.now() - partial.created > 24 * 60 * 60 * 1000) {
        try {
          await local.remove(config.directory, name);
        } catch {
          /* Keep valid backups and retry later. */
        }
      }
    }
  }
  if (config.identity) {
    if (!cloud) throw new Error('BLOO_NATIVE_REQUIRED');
    const location = await cloud.location();
    if (location.identity !== config.identity) throw new Error('BLOO_ICLOUD_ACCOUNT_CHANGED');
    config.directory = location.uri;
  }
  if (
    config.pending &&
    config.identity &&
    !(await cloud!.names(config.identity)).includes(config.pending.name)
  ) {
    config.pending = undefined;
    await saveConfig(config);
  }
  if (config.pending) {
    if (!config.identity || !(await cloud!.uploaded(config.pending.name, config.identity))) {
      publishStatus(config);
      return;
    }
    config.lastName = config.pending.name;
    config.lastDay = config.pending.day;
    config.lastSuccess = config.pending.created;
    config.pending = undefined;
    await saveConfig(config);
    await finishRetention(config);
  }
  const day = backupDay();
  if (!force && config.lastDay === day) {
    if (config.lastError === 'BLOO_RETENTION_FAILED') await finishRetention(config);
    return;
  }
  const credential = { salt: hexToBytes(config.salt), key: hexToBytes(config.key) };
  let output: File | undefined;
  try {
    output = await createEncryptedBackup(db, credential);
    const name = `bloolog-${config.device}-${day}-${Date.now()}-${bytesToHex(await backupCipher.random(8))}.bloo`;
    const created = new Date().toISOString();
    if (config.identity) {
      // Persist the pending name before publishing: a process kill cannot lose upload tracking.
      config.lastError = undefined;
      config.pending = { name, day, created };
      await saveConfig(config);
      try {
        await cloud!.publish(output.uri, name, config.identity);
      } catch (error) {
        config.pending = undefined;
        await saveConfig(config);
        throw error;
      }
    } else {
      if (!local) throw new Error('BLOO_NATIVE_REQUIRED');
      await local.publish(output.uri, config.directory, name);
      config.lastName = name;
      config.lastDay = day;
      config.lastSuccess = created;
      config.pausedAfterRestore = false;
      await saveConfig(config);
      await finishRetention(config);
    }
  } finally {
    credential.key.fill(0);
    if (output?.exists) output.delete();
  }
}
export async function runAutomaticBackup(db: SQLiteDatabase, force = false) {
  if (backupBusy()) return;
  return withBackupOperation(async () => {
    const config = await readConfig();
    if (!config?.enabled || (!force && config.pausedAfterRestore)) return;
    try {
      await performBackup(db, config, force);
      publishStatus(config);
      return true;
    } catch (error) {
      config.lastError = error instanceof Error ? error.message : String(error);
      try {
        await saveConfig(config);
      } catch {
        publishStatus(config, config.lastError);
      }
      if (force) throw error;
      return false;
    }
  });
}
export async function configureAutomaticBackup(
  db: SQLiteDatabase,
  password: string,
  oldPassword?: string,
) {
  return withBackupOperation(async () => {
    validatePassword(password);
    const old = await readConfig();
    if (old) {
      const previous = await deriveNativeBackupKey(oldPassword ?? '', hexToBytes(old.salt));
      const matches = bytesToHex(previous) === old.key;
      previous.fill(0);
      if (!matches) throw new Error('BLOO_PASSWORD_OR_DAMAGED');
    }
    let directory = old?.directory;
    let identity = old?.identity;
    if (Platform.OS === 'ios') {
      if (!cloud) throw new Error('BLOO_NATIVE_REQUIRED');
      const location = await cloud.location();
      if (old?.pending && old.identity === location.identity)
        throw new Error('BLOO_UPLOAD_PENDING');
      directory = location.uri;
      identity = location.identity;
    } else {
      const parent = await Directory.pickDirectoryAsync(
        'content://com.android.externalstorage.documents/document/primary%3ADocuments',
      );
      if (!local) throw new Error('BLOO_NATIVE_REQUIRED');
      directory = await local.folder(parent.uri);
    }
    const salt = await backupCipher.random(16);
    const key = await deriveNativeBackupKey(password, salt);
    const config: AutoConfig = {
      version: 1,
      enabled: true,
      device: old?.device ?? bytesToHex(await backupCipher.random(8)),
      lastDay: old?.lastDay,
      lastName: old?.lastName,
      lastSuccess: old?.lastSuccess,
      directory: directory!,
      identity,
      salt: bytesToHex(salt),
      key: bytesToHex(key),
    };
    key.fill(0);
    try {
      await performBackup(db, config, true);
      await saveConfig(config);
    } catch (error) {
      // Keep credentials if iCloud is already uploading a new backup.
      if (config.pending || config.lastName !== old?.lastName) await saveConfig(config);
      else if (old) await saveConfig(old);
      else await SecureStore.deleteItemAsync(KEY, OPTIONS);
      publishStatus(
        config.pending || config.lastName !== old?.lastName ? config : old,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  });
}
export async function disableAutomaticBackup() {
  return withBackupOperation(async () => {
    const config = await readConfig();
    if (!config) return;
    config.enabled = false;
    await saveConfig(config);
  });
}
export async function pauseAutomaticBackupAfterRestore() {
  return withBackupOperation(async () => {
    const config = await readConfig();
    if (config) {
      config.pausedAfterRestore = true;
      await saveConfig(config);
    }
  });
}
export async function resumeAutomaticBackup() {
  return withBackupOperation(async () => {
    const config = await readConfig();
    if (config) {
      config.enabled = true;
      config.pausedAfterRestore = false;
      await saveConfig(config);
    }
  });
}
// Remove only this feature's disposable app-cache files after an interrupted process.
export function cleanBackupCache() {
  if (backupBusy()) return;
  for (const file of new Directory(Paths.document).list()) {
    if (file instanceof File && /^bloo-safety-pending-\d+$/.test(file.name)) {
      try {
        file.delete();
      } catch {
        /* Retry next launch. */
      }
    }
  }
  for (const file of new Directory(Paths.cache).list()) {
    if (/^(bloo-stage-|took-import-|took-restore-)/.test(file.name)) {
      try {
        file.delete();
      } catch {
        /* Retry next launch. */
      }
    } else if (/^bloolog-\d+-[a-z0-9]+\.bloo$/.test(file.name)) {
      const timestamp = Number(file.name.split('-')[1]);
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        try {
          file.delete();
        } catch {
          /* A share target may still own it. */
        }
      }
    }
  }
}

export async function shouldRunBackgroundBackup() {
  const config = await readConfig();
  return !!config?.enabled && !config.pausedAfterRestore;
}
