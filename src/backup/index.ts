import { withBackupOperation } from './operation';
import { t } from '../i18n/core';
import { Directory, File, Paths } from 'expo-file-system';
import { deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { withMaintenance, withReadLock } from '../db';
import { mediaFile } from '../media';
import { MAX_BACKUP_BYTES } from './format';
import {
  BACKUP_CHUNK_BYTES,
  MAX_DATABASE_BYTES,
  writeBackupArchive,
  extractBackupArchive,
  type BackupSource,
} from './stream';
import { validateBackupSet } from './parts';
import {
  encryptBloo,
  decryptBloo,
  validatePassword,
  validateBlooHeader,
  BLOO_HEADER_BYTES,
  BLOO_MAX_BYTES,
  type BackupCredential,
} from './container';
import { backupCipher, deriveNativeBackupKey } from './crypto';
import { readBackupDatabase, replaceRecords } from './database';

async function* fileChunks(file: File) {
  const handle = file.open();
  try {
    while ((handle.offset ?? 0) < file.size) {
      yield handle.readBytes(BACKUP_CHUNK_BYTES);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  } finally {
    handle.close();
  }
}

// A bounded snapshot is copied under the DB queue; ZIP/encryption/I/O run after releasing it.
export async function createEncryptedBackup(
  db: SQLiteDatabase,
  credential: BackupCredential,
  snapshotAlreadyLocked = false,
) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const staging = new Directory(Paths.cache, `bloo-stage-${id}`);
  const archive = new File(staging, 'records.zip');
  const output = new File(Paths.cache, `bloolog-${id}.bloo`);
  staging.create();
  try {
    const snapshot = async () => {
      const pageCount = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
      const pageSize = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
      if ((pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 0) > MAX_DATABASE_BYTES)
        throw new Error('기록 DB는 최대 64MB까지 지원합니다.');
      const database = await db.serializeAsync();
      if (database.length > MAX_DATABASE_BYTES) throw new Error('BLOO_TOO_LARGE');
      const images = await db.getAllAsync<{ file_name: string }>(
        'SELECT file_name FROM diary_images',
      );
      let total = database.length;
      for (const image of images) {
        const file = mediaFile(image.file_name);
        if (!file.exists) throw new Error('사진 파일이 없어 완전한 백업을 만들 수 없습니다.');
        total += file.size;
      }
      if (total + 8 * 1024 * 1024 > MAX_BACKUP_BYTES) throw new Error('BLOO_TOO_LARGE');
      if (Paths.availableDiskSpace < total * 4 + 16 * 1024 * 1024) throw new Error('BLOO_NO_SPACE');
      new File(staging, 'took.db').write(database);
      for (const image of images)
        await mediaFile(image.file_name).copy(new File(staging, image.file_name));
    };
    await (snapshotAlreadyLocked ? snapshot() : withReadLock(snapshot));
    async function* sources(): AsyncGenerator<BackupSource> {
      for (const file of staging.list()) {
        if (!(file instanceof File) || file.name === 'records.zip') continue;
        yield {
          name: file.name === 'took.db' ? 'took.db' : `media/${file.name}`,
          chunks: fileChunks(file),
        };
      }
    }
    archive.create();
    const zipHandle = archive.open();
    try {
      await writeBackupArchive(sources(), (bytes) => zipHandle.writeBytes(bytes));
    } finally {
      zipHandle.close();
    }
    output.create();
    const handle = output.open();
    try {
      await encryptBloo(fileChunks(archive), credential, backupCipher, (bytes) =>
        handle.writeBytes(bytes),
      );
    } finally {
      handle.close();
    }
    await verifyEncryptedBackup(output, credential);
    return output;
  } catch (error) {
    if (output.exists) output.delete();
    throw error;
  } finally {
    try {
      staging.delete();
    } catch {
      /* Retry disposable snapshot cleanup on launch. */
    }
  }
}
export async function verifyEncryptedBackup(file: File, credential: BackupCredential | string) {
  const handle = file.open();
  try {
    const verified = await extractBackupArchive(
      decryptBloo((size) => handle.readBytes(size), credential, backupCipher),
      () => ({ write: () => {}, close: () => {} }),
    );
    validateBackupSet([verified]);
  } finally {
    handle.close();
  }
}
async function exportBackupInternal(
  db: SQLiteDatabase,
  destination: 'device' | 'share',
  password: string,
) {
  let directory: Directory | null = null;
  if (destination === 'device') {
    try {
      directory = await Directory.pickDirectoryAsync(
        Platform.OS === 'android'
          ? 'content://com.android.externalstorage.documents/document/primary%3ADocuments'
          : undefined,
      );
    } catch (error) {
      if (/cancel|dismiss/i.test(String(error))) return false;
      throw error;
    }
  }
  validatePassword(password);
  const salt = await backupCipher.random(16);
  const credential = { salt, key: await deriveNativeBackupKey(password, salt) };
  let output: File | undefined;
  let target: File | undefined;
  try {
    output = await createEncryptedBackup(db, credential);
    if (directory) {
      target = directory.createFile(output.name, 'application/octet-stream');
      for await (const bytes of fileChunks(output)) target.write(bytes, { append: true });
      await verifyEncryptedBackup(target, credential);
      output.delete();
    } else {
      await Sharing.shareAsync(output.uri, {
        mimeType: 'application/octet-stream',
        UTI: 'com.took.bloo',
        dialogTitle: t('settings.backupShareTitle'),
      });
    }
    return 1;
  } catch (error) {
    if (target?.exists) target.delete();
    if (output?.exists) output.delete();
    throw error;
  } finally {
    credential.key.fill(0);
  }
}

export function discardBackupSelection(uris: string[]) {
  const prefix = new File(Paths.cache, 'took-import-').uri;
  for (const uri of uris) {
    if (!uri.startsWith(prefix)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      /* OS cache cleanup. */
    }
  }
}

export async function chooseBackup(): Promise<string[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    // Android providers generally report unknown extensions as octet-stream.
    // Validate the extension AND magic below; never accept images or renamed ZIPs.
    type:
      Platform.OS === 'ios'
        ? 'application/x-bloolog-backup'
        : ['application/x-bloolog-backup', 'application/octet-stream'],
    copyToCacheDirectory: Platform.OS === 'ios',
    multiple: false,
  });
  if (result.canceled) return null;
  if (result.assets.length !== 1 || !/\.bloo$/i.test(result.assets[0].name))
    throw new Error('BLOO_SELECT_ONE');
  const asset = result.assets[0];
  if ((asset.size ?? 0) > BLOO_MAX_BYTES) throw new Error('BLOO_TOO_LARGE');
  const source = new File(asset.uri);
  if (source.size > BLOO_MAX_BYTES) throw new Error('BLOO_TOO_LARGE');
  const copy = new File(
    Paths.cache,
    `took-import-${Date.now()}-${Math.random().toString(36).slice(2)}.bloo`,
  );
  try {
    await source.copy(copy);
    if (copy.size > BLOO_MAX_BYTES) throw new Error('BLOO_TOO_LARGE');
    const handle = copy.open();
    try {
      validateBlooHeader(handle.readBytes(BLOO_HEADER_BYTES));
    } finally {
      handle.close();
    }
    return [copy.uri];
  } catch (error) {
    discardBackupSelection([copy.uri]);
    throw error;
  }
}

async function restoreEncryptedBackupInternal(
  db: SQLiteDatabase,
  uris: string[],
  password: string,
) {
  if (uris.length !== 1) throw new Error('BLOO_SELECT_ONE');
  const source = new File(uris[0]);
  if (source.size > BLOO_MAX_BYTES) throw new Error('BLOO_TOO_LARGE');
  const plain = new File(
    Paths.cache,
    `took-import-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`,
  );
  const input = source.open();
  let output: ReturnType<File['open']> | undefined;
  try {
    plain.create();
    output = plain.open();
    for await (const bytes of decryptBloo(
      (size) => input.readBytes(size),
      password,
      backupCipher,
    )) {
      if (Paths.availableDiskSpace < bytes.length + 8 * 1024 * 1024)
        throw new Error('BLOO_NO_SPACE');
      output.writeBytes(bytes);
    }
    output.close();
    output = undefined;
    // The restore lock also protects the safety snapshot from intervening user writes.
    await restoreBackup(db, [plain.uri], async () => {
      const salt = await backupCipher.random(16);
      const credential = { salt, key: await deriveNativeBackupKey(password, salt) };
      try {
        const safety = await createEncryptedBackup(db, credential, true);
        const saved = new File(Paths.document, `bloo-safety-pending-${Date.now()}`);
        let committed = false;
        try {
          await safety.copy(saved);
          await verifyEncryptedBackup(saved, credential);
          saved.rename(`bloolog-before-restore-${Date.now()}.bloo`);
          committed = true;
        } finally {
          if (safety.exists) safety.delete();
          if (!committed && saved.exists) saved.delete();
        }
      } finally {
        credential.key.fill(0);
      }
    });
  } finally {
    input.close();
    output?.close();
    discardBackupSelection([plain.uri, ...uris]);
  }
}

export function restoreBackup(
  db: SQLiteDatabase,
  uris: string[],
  beforeReplace?: () => Promise<void>,
) {
  return withMaintenance(async () => {
    const created: string[] = [];
    const staging = new Directory(Paths.cache, `took-restore-${Date.now()}`);
    staging.create();
    let committed = false;
    try {
      const parts = [];
      const seen = new Set<string>();
      for (const uri of uris) {
        const source = new File(uri);
        if (source.size > MAX_BACKUP_BYTES)
          throw new Error('한 백업 파일의 크기 제한을 초과했습니다.');
        parts.push(
          await extractBackupArchive(fileChunks(source), (name) => {
            if (seen.has(name))
              throw new Error(
                '중복된 백업 파일이 있습니다. 같은 세트의 파일만 한 번씩 선택해주세요.',
              );
            seen.add(name);
            const file = new File(staging, name);
            file.create({ intermediates: true });
            const handle = file.open();
            return {
              write: (bytes) => {
                if (Paths.availableDiskSpace < bytes.length + 8 * 1024 * 1024)
                  throw new Error('백업을 복원할 기기 저장 공간이 부족합니다.');
                handle.writeBytes(bytes);
              },
              close: () => handle.close(),
            };
          }),
        );
      }
      const files = validateBackupSet(parts);
      // A serialized WAL database needs rollback-mode header bytes for in-memory deserialization.
      // https://www.sqlite.org/c3ref/deserialize.html
      const databaseBytes = await new File(staging, 'took.db').bytes();
      databaseBytes[18] = 1;
      databaseBytes[19] = 1;
      const snapshot = await deserializeDatabaseAsync(databaseBytes);
      const records = await readBackupDatabase(snapshot, files).finally(() =>
        snapshot.closeAsync(),
      );
      const oldFiles = await db.getAllAsync<{ file_name: string }>(
        'SELECT file_name FROM diary_images',
      );
      const mediaBytes = records.images.reduce(
        (size, image) => size + new File(staging, `media/${image.file_name}`).size,
        0,
      );
      if (Paths.availableDiskSpace < mediaBytes + 8 * 1024 * 1024)
        throw new Error(
          `사진을 복원할 기기 저장 공간이 부족합니다. 약 ${Math.ceil((mediaBytes + 8 * 1024 * 1024) / 1024 / 1024)}MB의 여유 공간이 필요합니다.`,
        );
      const names = new Map<string, string>();
      const prefix = `restore-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      for (const [index, image] of records.images.entries()) {
        const name = `${prefix}-${index}.jpg`;
        const destination = mediaFile(name);
        created.push(name);
        await new File(staging, `media/${image.file_name}`).copy(destination);
        names.set(image.file_name, name);
      }
      await beforeReplace?.();
      await replaceRecords(db, records, names);
      committed = true;
      for (const image of oldFiles) {
        try {
          const file = mediaFile(image.file_name);
          if (file.exists) file.delete();
        } catch {
          /* Retry orphan cleanup on launch. */
        }
      }
    } finally {
      try {
        staging.delete();
      } catch {
        /* Retry cache cleanup on a later backup. */
      }
      if (!committed)
        for (const name of created) {
          try {
            const file = mediaFile(name);
            if (file.exists) file.delete();
          } catch {
            /* Retry on launch. */
          }
        }
      discardBackupSelection(uris);
    }
  });
}

export const exportBackup = (
  db: SQLiteDatabase,
  destination: 'device' | 'share',
  password: string,
) => withBackupOperation(() => exportBackupInternal(db, destination, password));
export const restoreEncryptedBackup = (db: SQLiteDatabase, uris: string[], password: string) =>
  withBackupOperation(() => restoreEncryptedBackupInternal(db, uris, password));

export function latestSafetyBackup() {
  return new Directory(Paths.document)
    .list()
    .filter(
      (file): file is File =>
        file instanceof File && /^bloolog-before-restore-\d+\.bloo$/.test(file.name),
    )
    .sort((a, b) => b.name.localeCompare(a.name))[0];
}
export async function shareSafetyBackup() {
  return withBackupOperation(async () => {
    const file = latestSafetyBackup();
    if (!file) return;
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/octet-stream',
      UTI: 'com.took.bloo',
      dialogTitle: t('settings.backupShareTitle'),
    });
  });
}
