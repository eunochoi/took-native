import { SCHEMA_VERSION } from '../db/migrations';
import { strToU8 } from 'fflate';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  MAX_BACKUP_BYTES,
  MAX_BACKUP_FILES,
  MAX_BACKUP_PART_BYTES,
  validName,
  type BackupManifest,
} from './format';

interface BackupEntry {
  name: string;
  size: number;
}
export function inventoryDigest(entries: BackupEntry[]) {
  return bytesToHex(
    sha256(
      strToU8(
        JSON.stringify(
          entries
            .map(({ name, size }) => [name, size])
            .sort((a, b) =>
              String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0,
            ),
        ),
      ),
    ),
  );
}

export function planBackupParts(
  entries: BackupEntry[],
  singleLimit = MAX_BACKUP_BYTES,
  partLimit = MAX_BACKUP_PART_BYTES,
) {
  if (
    !entries.length ||
    entries[0].name !== 'took.db' ||
    entries.length >= MAX_BACKUP_FILES ||
    new Set(entries.map((entry) => entry.name)).size !== entries.length ||
    entries.some(
      (entry) =>
        !validName(entry.name) ||
        entry.name === 'manifest.json' ||
        !Number.isSafeInteger(entry.size) ||
        entry.size < 0,
    )
  )
    throw new Error('백업 파일 목록이 올바르지 않습니다.');
  // Streaming ZIP headers + descriptors + central directory + end record.
  const manifest: BackupManifest = {
    format: 'took-backup',
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    createdAt: '2000-01-01T00:00:00.000Z',
    files: {},
  };
  let estimated = 22 + 92 + 2 * 'manifest.json'.length;
  for (const entry of entries) {
    estimated += entry.size + 92 + 2 * entry.name.length;
    manifest.files[entry.name] = { size: entry.size, sha256: '0'.repeat(64) };
  }
  estimated += strToU8(JSON.stringify(manifest)).length;
  if (estimated <= singleLimit) return [entries];
  // Reserve manifest and ZIP metadata space in every part; photos are already JPEG.
  const reserve = Math.min(4 * 1024 * 1024, Math.floor(partLimit / 8));
  const budget = partLimit - reserve;
  const parts: BackupEntry[][] = [];
  let current: BackupEntry[] = [];
  let size = 0;
  for (const entry of entries) {
    if (entry.size + 92 + 2 * entry.name.length > budget)
      throw new Error('한 파일이 분할 백업의 크기 제한을 초과했습니다.');
    const cost = entry.size + 92 + 2 * entry.name.length;
    if (current.length && size + cost > budget) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += cost;
  }
  if (current.length) parts.push(current);
  return parts;
}

export function validateBackupSet(
  parts: { manifest: BackupManifest; files: Record<string, Uint8Array> }[],
) {
  if (!parts.length) throw new Error('복원할 백업 파일을 선택해주세요.');
  if (parts[0].manifest.version === 1) {
    if (parts.length !== 1) throw new Error('단일 백업은 ZIP 한 개만 선택해주세요.');
    return parts[0].files;
  }
  const expected = parts[0].manifest.set;
  if (!expected) throw new Error('분할 백업 정보가 없습니다.');
  const indices = new Set<number>();
  const files: Record<string, Uint8Array> = {};
  const inventory: BackupEntry[] = [];
  for (const part of parts) {
    const set = part.manifest.set;
    if (
      part.manifest.version !== 2 ||
      !set ||
      set.id !== expected.id ||
      set.count !== expected.count ||
      set.inventorySha256 !== expected.inventorySha256
    )
      throw new Error('서로 다른 백업 세트가 선택되었습니다. 같은 세트의 파일만 선택해주세요.');
    if (indices.has(set.index)) throw new Error(`백업 ${set.index}번 파일이 중복되었습니다.`);
    indices.add(set.index);
    for (const [name, meta] of Object.entries(part.manifest.files)) {
      if (!part.files[name]) throw new Error('백업 파일이 손상되었습니다.');
      if (files[name]) throw new Error('백업 세트에 중복된 기록이나 사진 파일이 있습니다.');
      files[name] = part.files[name];
      inventory.push({ name, size: meta.size });
    }
  }
  const missing = Array.from({ length: expected.count }, (_, i) => i + 1).filter(
    (i) => !indices.has(i),
  );
  if (missing.length)
    throw new Error(
      `백업 파일이 빠졌습니다. ${missing.slice(0, 10).join(', ')}번 파일을 함께 선택해주세요. (전체 ${expected.count}개)`,
    );
  if (
    inventory.length >= MAX_BACKUP_FILES ||
    inventoryDigest(inventory) !== expected.inventorySha256 ||
    !files['took.db']
  )
    throw new Error('백업 세트의 전체 파일 목록이 일치하지 않습니다.');
  return files;
}
