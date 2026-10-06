import { SCHEMA_VERSION } from '../db/migrations';
import { strFromU8, strToU8, Unzip, UnzipInflate, Zip, ZipPassThrough } from 'fflate';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  MAX_BACKUP_BYTES,
  MAX_BACKUP_FILES,
  MAX_BACKUP_PART_BYTES,
  validName,
  type BackupManifest,
  type BackupSetPart,
} from './format';

import { MAX_DATABASE_BYTES, MAX_MANIFEST_BYTES } from '../domain/limits';
export { BACKUP_CHUNK_BYTES, MAX_DATABASE_BYTES } from '../domain/limits';
export interface BackupSource {
  name: string;
  chunks: AsyncIterable<Uint8Array>;
}
interface BackupSink {
  write: (bytes: Uint8Array) => void;
  close: () => void;
}

export async function writeBackupArchive(
  sources: AsyncIterable<BackupSource>,
  write: (bytes: Uint8Array) => void,
  set?: BackupSetPart,
) {
  const manifest: BackupManifest = {
    format: 'took-backup',
    version: set ? 2 : 1,
    ...(set ? { set } : {}),
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    files: {},
  };
  const limit = set ? MAX_BACKUP_PART_BYTES : MAX_BACKUP_BYTES;
  let total = 0;
  let archiveSize = 0;
  const zip = new Zip((error, bytes) => {
    if (error) throw error;
    archiveSize += bytes.length;
    if (archiveSize > limit) throw new Error('백업 파일 크기 제한을 초과했습니다.');
    write(bytes);
  });
  try {
    for await (const source of sources) {
      if (!validName(source.name) || source.name === 'manifest.json' || manifest.files[source.name])
        throw new Error('잘못된 경로나 중복 파일이 포함된 백업입니다.');
      if (Object.keys(manifest.files).length >= MAX_BACKUP_FILES - 1)
        throw new Error('백업에 포함된 파일이 너무 많습니다.');
      const entry = new ZipPassThrough(source.name);
      const hash = sha256.create();
      let size = 0;
      zip.add(entry);
      for await (const bytes of source.chunks) {
        size += bytes.length;
        total += bytes.length;
        if (total > limit || (source.name === 'took.db' && size > MAX_DATABASE_BYTES))
          throw new Error('백업 크기 제한을 초과했습니다. (전체 1GB, DB 64MB)');
        hash.update(bytes);
        entry.push(bytes);
      }
      entry.push(new Uint8Array(), true);
      manifest.files[source.name] = { size, sha256: bytesToHex(hash.digest()) };
    }
    if ((!set || set.index === 1) && !manifest.files['took.db'])
      throw new Error('백업할 DB를 찾을 수 없습니다.');
    const bytes = strToU8(JSON.stringify(manifest));
    if (bytes.length > MAX_MANIFEST_BYTES || total + bytes.length > limit)
      throw new Error('백업 크기 제한을 초과했습니다.');
    const entry = new ZipPassThrough('manifest.json');
    zip.add(entry);
    entry.push(bytes, true);
    zip.end();
  } finally {
    zip.terminate();
  }
}

export async function extractBackupArchive(
  chunks: AsyncIterable<Uint8Array>,
  open: (name: string) => BackupSink,
) {
  const entries: Record<string, { size: number; sha256: string }> = {};
  const prefixes: Record<string, Uint8Array> = {};
  const pending = new Set<string>();
  const handles = new Set<BackupSink>();
  const manifestChunks: Uint8Array[] = [];
  let manifestSize = 0;
  let total = 0;
  let archiveSize = 0;
  const unzip = new Unzip((entry) => {
    if (!validName(entry.name) || pending.has(entry.name) || entries[entry.name])
      throw new Error('잘못된 경로나 중복 파일이 포함된 백업입니다.');
    if (Object.keys(entries).length + pending.size >= MAX_BACKUP_FILES)
      throw new Error('백업에 포함된 파일이 너무 많습니다.');
    if (entry.compression !== 0 && entry.compression !== 8)
      throw new Error('지원하지 않는 ZIP 압축 방식입니다.');
    if ((entry.originalSize ?? 0) > MAX_BACKUP_BYTES)
      throw new Error('백업 크기 제한을 초과했습니다.');
    pending.add(entry.name);
    const sink = entry.name === 'manifest.json' ? null : open(entry.name);
    if (sink) handles.add(sink);
    const hash = sha256.create();
    let size = 0;
    let prefix = new Uint8Array(0);
    entry.ondata = (error, bytes, final) => {
      if (error) throw error;
      size += bytes.length;
      total += bytes.length;
      if (
        total > MAX_BACKUP_BYTES ||
        (entry.name === 'took.db' && size > MAX_DATABASE_BYTES) ||
        (entry.name === 'manifest.json' && size > MAX_MANIFEST_BYTES)
      )
        throw new Error('백업의 크기 제한을 초과했습니다.');
      if (prefix.length < 16) {
        const next = new Uint8Array(Math.min(16, prefix.length + bytes.length));
        next.set(prefix);
        next.set(bytes.subarray(0, next.length - prefix.length), prefix.length);
        prefix = next;
      }
      hash.update(bytes);
      if (sink) sink.write(bytes);
      else {
        manifestChunks.push(bytes.slice());
        manifestSize += bytes.length;
      }
      if (final) {
        sink?.close();
        if (sink) handles.delete(sink);
        entries[entry.name] = { size, sha256: bytesToHex(hash.digest()) };
        prefixes[entry.name] = prefix;
        pending.delete(entry.name);
      }
    };
    entry.start();
  });
  unzip.register(UnzipInflate);
  try {
    for await (const bytes of chunks) {
      archiveSize += bytes.length;
      if (archiveSize > MAX_BACKUP_BYTES) throw new Error('1GB보다 큰 백업 파일은 열 수 없습니다.');
      unzip.push(bytes);
    }
    unzip.push(new Uint8Array(), true);
    if (pending.size || !entries['manifest.json'])
      throw new Error('불완전한 Took 백업 파일입니다.');
    const manifestBytes = new Uint8Array(manifestSize);
    let offset = 0;
    for (const bytes of manifestChunks) {
      manifestBytes.set(bytes, offset);
      offset += bytes.length;
    }
    const manifest = JSON.parse(strFromU8(manifestBytes)) as BackupManifest;
    if (
      manifest.format !== 'took-backup' ||
      (manifest.version !== 1 && manifest.version !== 2) ||
      manifest.schemaVersion !== SCHEMA_VERSION ||
      typeof manifest.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(manifest.createdAt)) ||
      !manifest.files ||
      typeof manifest.files !== 'object' ||
      Array.isArray(manifest.files)
    )
      throw new Error('지원하지 않는 백업 버전 또는 손상된 백업입니다.');
    if (manifest.version === 2) {
      const set = manifest.set;
      if (
        !set ||
        !/^[a-zA-Z0-9-]{8,80}$/.test(set.id) ||
        !Number.isInteger(set.count) ||
        set.count < 2 ||
        set.count > MAX_BACKUP_FILES ||
        !Number.isInteger(set.index) ||
        set.index < 1 ||
        set.index > set.count ||
        !/^[a-f0-9]{64}$/.test(set.inventorySha256) ||
        archiveSize > MAX_BACKUP_PART_BYTES ||
        total > MAX_BACKUP_PART_BYTES ||
        (set.index === 1 ? !entries['took.db'] : !!entries['took.db'])
      )
        throw new Error('분할 백업 정보나 파일 크기가 올바르지 않습니다.');
    } else if (manifest.set || !entries['took.db']) throw new Error('Took 백업 파일이 아닙니다.');
    if (Object.keys(manifest.files).length !== Object.keys(entries).length - 1)
      throw new Error('백업 파일 목록이 일치하지 않습니다.');
    for (const [name, meta] of Object.entries(entries)) {
      if (name === 'manifest.json') continue;
      if (manifest.files[name]?.size !== meta.size || manifest.files[name]?.sha256 !== meta.sha256)
        throw new Error('백업 파일이 손상되었습니다.');
      const bytes = prefixes[name];
      if (name.startsWith('media/') && (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255))
        throw new Error('백업에 잘못된 사진이 포함되어 있습니다.');
    }
    if (prefixes['took.db'] && strFromU8(prefixes['took.db']) !== 'SQLite format 3\0')
      throw new Error('DB 파일 형식이 올바르지 않습니다.');
    delete prefixes['manifest.json'];
    return { files: prefixes, manifest };
  } finally {
    for (const sink of handles) sink.close();
  }
}
