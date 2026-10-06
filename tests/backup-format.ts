import { SCHEMA_VERSION } from '../src/db/migrations';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import {
  MAX_BACKUP_BYTES,
  MAX_BACKUP_FILES,
  validName,
  type BackupManifest,
} from '../src/backup/format';
const digest = (bytes: Uint8Array) => bytesToHex(sha256(bytes));

export function createArchive(files: Record<string, Uint8Array>) {
  if (!files['took.db']) throw new Error('백업할 DB를 찾을 수 없습니다.');
  const manifest: BackupManifest = {
    format: 'took-backup',
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    files: {},
  };
  let total = 0;
  for (const [name, bytes] of Object.entries(files)) {
    if (!validName(name) || name === 'manifest.json')
      throw new Error('백업 파일 이름이 올바르지 않습니다.');
    total += bytes.length;
    if (total > MAX_BACKUP_BYTES) throw new Error('백업은 최대 1GB까지 지원합니다.');
    manifest.files[name] = { size: bytes.length, sha256: digest(bytes) };
  }
  if (Object.keys(files).length >= MAX_BACKUP_FILES)
    throw new Error('백업에 포함된 파일이 너무 많습니다.');
  const archive = zipSync(
    { ...files, 'manifest.json': strToU8(JSON.stringify(manifest)) },
    { level: 1 },
  );
  if (archive.length > MAX_BACKUP_BYTES) throw new Error('백업은 최대 1GB까지 지원합니다.');
  return archive;
}

export function readArchive(archive: Uint8Array) {
  if (archive.length > MAX_BACKUP_BYTES) throw new Error('1GB보다 큰 백업 파일은 열 수 없습니다.');
  let total = 0;
  const seen = new Set<string>();
  const files = unzipSync(archive, {
    filter: (entry) => {
      if (!validName(entry.name) || seen.has(entry.name))
        throw new Error('잘못된 경로나 중복 파일이 포함된 백업입니다.');
      seen.add(entry.name);
      total += entry.originalSize;
      if (
        total > MAX_BACKUP_BYTES ||
        seen.size > MAX_BACKUP_FILES ||
        (entry.name === 'manifest.json' && entry.originalSize > 2 * 1024 * 1024)
      )
        throw new Error('백업의 크기 제한을 초과했습니다.');
      return true;
    },
  });
  if (!files['manifest.json'] || !files['took.db']) throw new Error('took 백업 파일이 아닙니다.');
  const manifest = JSON.parse(strFromU8(files['manifest.json'])) as BackupManifest;
  if (
    manifest.format !== 'took-backup' ||
    manifest.version !== 1 ||
    manifest.schemaVersion !== SCHEMA_VERSION ||
    typeof manifest.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(manifest.createdAt)) ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw new Error('지원하지 않는 백업 버전 또는 손상된 백업입니다.');
  if (Object.keys(manifest.files).length !== Object.keys(files).length - 1)
    throw new Error('백업 파일 목록이 일치하지 않습니다.');
  for (const [name, bytes] of Object.entries(files)) {
    if (name === 'manifest.json') continue;
    const meta = manifest.files[name];
    if (!meta || meta.size !== bytes.length || meta.sha256 !== digest(bytes))
      throw new Error('백업 파일이 손상되었습니다.');
    if (name.startsWith('media/') && (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff))
      throw new Error('백업에 잘못된 사진이 포함되어 있습니다.');
  }
  if (strFromU8(files['took.db'].slice(0, 16)) !== 'SQLite format 3\0')
    throw new Error('DB 파일 형식이 올바르지 않습니다.');
  return { manifest, files };
}
