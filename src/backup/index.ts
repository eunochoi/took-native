import { Directory, File, Paths } from 'expo-file-system';
import { deserializeDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { withMaintenance } from '../db';
import { mediaFile } from '../media';
import { MAX_BACKUP_BYTES, MAX_BACKUP_FILES } from './format';
import {
  BACKUP_CHUNK_BYTES,
  MAX_DATABASE_BYTES,
  writeBackupArchive,
  extractBackupArchive,
  type BackupSource,
} from './stream';
import { inventoryDigest, planBackupParts, validateBackupSet } from './parts';
import { shareBackupSet } from './share';
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

export async function exportBackup(db: SQLiteDatabase, destination: 'device' | 'share') {
  let directory: Directory | null = null;
  if (destination === 'device') {
    try {
      directory = await Directory.pickDirectoryAsync(
        'content://com.android.externalstorage.documents/document/primary%3ADocuments',
      );
    } catch (error) {
      if (String(error).includes('cancel') || String(error).includes('dismiss')) return false;
      throw error;
    }
  }
  if (destination === 'share' && !(await Sharing.isAvailableAsync()))
    throw new Error('이 기기에서는 파일 공유를 사용할 수 없습니다.');
  for (const item of new Directory(Paths.cache).list()) {
    const match =
      item instanceof File
        ? /^took-backup-(\d+)(?:-[a-z0-9]+-\d{3,5})?\.zip$/.exec(item.name)
        : /^took-restore-(\d+)$/.exec(item.name);
    if (match && Date.now() - Number(match[1]) > 24 * 60 * 60 * 1000) {
      try {
        item.delete();
      } catch {
        /* OS cache cleanup. */
      }
    }
  }
  const outputs: File[] = [];
  const targets: File[] = [];
  try {
    await withMaintenance(async () => {
      const pageCount = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
      const pageSize = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
      if ((pageCount?.page_count ?? 0) * (pageSize?.page_size ?? 0) > MAX_DATABASE_BYTES)
        throw new Error('기록 DB는 최대 64MB까지 지원합니다.');
      const database = await db.serializeAsync();
      if (database.length > MAX_DATABASE_BYTES)
        throw new Error('기록 DB는 최대 64MB까지 지원합니다.');
      const images = await db.getAllAsync<{ file_name: string }>(
        'SELECT file_name FROM diary_images',
      );
      const entries = [
        { name: 'took.db', size: database.length },
        ...images.map((image) => {
          const file = mediaFile(image.file_name);
          if (!file.exists) throw new Error('사진 파일이 없어 완전한 백업을 만들 수 없습니다.');
          return { name: `media/${image.file_name}`, size: file.size };
        }),
      ];
      const parts = planBackupParts(entries);
      const total = entries.reduce((size, entry) => size + entry.size, 0);
      const required = total * (directory ? 2 : 1) + (parts.length * 4 + 8) * 1024 * 1024;
      if (Paths.availableDiskSpace < required)
        throw new Error(
          `백업할 기기 저장 공간이 부족합니다. 약 ${Math.ceil(required / 1024 / 1024)}MB의 여유 공간이 필요합니다.`,
        );
      const timestamp = Date.now();
      const id = `${timestamp}-${Math.random().toString(36).slice(2)}`;
      const inventorySha256 = inventoryDigest(entries);
      for (const [index, part] of parts.entries()) {
        const set =
          parts.length === 1
            ? undefined
            : { id, index: index + 1, count: parts.length, inventorySha256 };
        const name = set
          ? `took-backup-${id}-${String(index + 1).padStart(3, '0')}.zip`
          : `took-backup-${timestamp}.zip`;
        const output = new File(Paths.cache, name);
        outputs.push(output);
        async function* sources(): AsyncGenerator<BackupSource> {
          for (const entry of part) {
            if (entry.name === 'took.db')
              yield {
                name: entry.name,
                chunks: (async function* () {
                  for (let i = 0; i < database.length; i += BACKUP_CHUNK_BYTES)
                    yield database.subarray(i, i + BACKUP_CHUNK_BYTES);
                })(),
              };
            else yield { name: entry.name, chunks: fileChunks(mediaFile(entry.name.slice(6))) };
          }
        }
        output.create();
        const handle = output.open();
        try {
          await writeBackupArchive(sources(), (bytes) => handle.writeBytes(bytes), set);
        } finally {
          handle.close();
        }
      }
    });
    const verified = [];
    for (const output of outputs)
      verified.push(
        await extractBackupArchive(fileChunks(output), () => ({
          write: () => {},
          close: () => {},
        })),
      );
    validateBackupSet(verified);
    if (directory) {
      for (const output of outputs) {
        const target = directory.createFile(output.name, 'application/zip');
        targets.push(target);
        for await (const bytes of fileChunks(output)) target.write(bytes, { append: true });
        if (target.size !== output.size) throw new Error('백업 파일이 완전히 저장되지 않았습니다.');
      }
      for (const output of outputs) output.delete();
    } else if (outputs.length > 1) await shareBackupSet(outputs.map((file) => file.uri));
    else
      await Sharing.shareAsync(outputs[0].uri, {
        mimeType: 'application/zip',
        UTI: 'public.zip-archive',
        dialogTitle: 'Google Drive 등으로 백업 공유',
      });
    // Share targets may still be reading the files. Retain recent cache archives for 24 hours.
    return outputs.length;
  } catch (error) {
    for (const file of [...outputs, ...targets]) {
      try {
        if (file.exists) file.delete();
      } catch {
        /* OS cache / provider cleanup. */
      }
    }
    throw error;
  }
}

export function discardBackupSelection(uris: string[]) {
  for (const uri of uris) {
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
    type: ['application/zip', 'application/octet-stream', 'application/x-zip-compressed'],
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled) return null;
  const uris = result.assets.map((asset) => asset.uri);
  if (uris.length > MAX_BACKUP_FILES || uris.some((uri) => new File(uri).size > MAX_BACKUP_BYTES)) {
    discardBackupSelection(uris);
    throw new Error('선택한 백업의 파일 수나 크기 제한을 초과했습니다.');
  }
  return uris;
}

export function restoreBackup(db: SQLiteDatabase, uris: string[]) {
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
