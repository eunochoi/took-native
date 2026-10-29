export function backupDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export interface BackupEntry {
  name: string;
  day: string;
  created: number;
}
export function parseAutomaticBackup(name: string, device: string): BackupEntry | null {
  const match = /^bloolog-([a-f0-9]{16})-(\d{4}-\d{2}-\d{2})-(\d+)-([a-f0-9]{16})\.bloo$/.exec(
    name,
  );
  if (!match || match[1] !== device) return null;
  return { name, day: match[2], created: Number(match[3]) };
}
export function expiredBackups(entries: BackupEntry[], newestName?: string) {
  const ordered = [...entries].sort((a, b) => {
    if (a.name === newestName) return -1;
    if (b.name === newestName) return 1;
    return b.created - a.created;
  });
  const days = new Set<string>();
  return ordered.filter((entry) => {
    if (days.has(entry.day) || days.size >= 3) return true;
    days.add(entry.day);
    return false;
  });
}
