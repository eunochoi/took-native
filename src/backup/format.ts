import { SCHEMA_VERSION } from '../db/schema';
export { MAX_BACKUP_BYTES, MAX_BACKUP_FILES, MAX_BACKUP_PART_BYTES } from '../domain/limits';
export interface BackupManifest {
  format: 'took-backup';
  version: 1 | 2;
  schemaVersion: typeof SCHEMA_VERSION;
  createdAt: string;
  set?: BackupSetPart;
  files: Record<string, { size: number; sha256: string }>;
}
export const validName = (name: string) =>
  name === 'manifest.json' || name === 'took.db' || /^media\/[a-zA-Z0-9_-]+\.jpg$/.test(name);

export interface BackupSetPart {
  id: string;
  index: number;
  count: number;
  inventorySha256: string;
}
