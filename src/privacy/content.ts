// This policy describes the local native app only. Keep it aligned with shipped behavior.
export const PRIVACY_SECTIONS = [
  'storedData',
  'accounts',
  'servers',
  'photos',
  'manualBackup',
  'restore',
  'deletion',
  'deviceBackup',
  'contact',
  'scope',
] as const;
