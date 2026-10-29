import { resolveLocale, type Language } from '../../i18n/core';
import { readDeviceLocale } from '../../i18n/locale';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { withReadLock, withWriteLock } from '../../db';
import { getSoberById, getSoberRestarts } from '../../db/sober';
import { DEFAULT_SETTINGS, type Settings } from '../../settings/model';
import { ACCENT_KEYS } from '../../theme/accents';
import { parseWidgetSettings, type SoberWidgetSettings } from './model';

async function withWidgetDatabase<T>(work: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  const db = await openDatabaseAsync('took-widgets.db', { useNewConnection: true });
  try {
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS widget_settings (widget_id INTEGER PRIMARY KEY, value TEXT NOT NULL)',
    );
    return await work(db);
  } finally {
    await db.closeAsync();
  }
}
function assertWidgetId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('위젯을 다시 추가해주세요.');
}
// Separate DB: widget preferences remain local when the app's records are restored.
export function loadWidgetSettings(id: number) {
  assertWidgetId(id);
  return withReadLock(() =>
    withWidgetDatabase(async (db) => {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM widget_settings WHERE widget_id = ?',
        id,
      );
      return row ? parseWidgetSettings(JSON.parse(row.value)) : null;
    }),
  );
}
export function saveWidgetSettings(id: number, value: SoberWidgetSettings) {
  assertWidgetId(id);
  const settings = parseWidgetSettings(value);
  return withWriteLock(() =>
    withWidgetDatabase(async (db) => {
      await db.runAsync(
        'INSERT INTO widget_settings (widget_id, value) VALUES (?, ?) ON CONFLICT(widget_id) DO UPDATE SET value = excluded.value',
        id,
        JSON.stringify(settings),
      );
    }),
  );
}
export function removeWidgetSettings(id: number) {
  assertWidgetId(id);
  return withWriteLock(() =>
    withWidgetDatabase(async (db) => {
      await db.runAsync('DELETE FROM widget_settings WHERE widget_id = ?', id);
    }),
  );
}
export function loadWidgetRecord(id?: number) {
  return withReadLock(async () => {
    const db = await openDatabaseAsync('took.db', { useNewConnection: true });
    try {
      const sober = id === undefined ? null : await getSoberById(db, id);
      const [restarts, display] = await Promise.all([
        sober ? getSoberRestarts(db, id) : [],
        loadWidgetDisplaySettings(db),
      ]);
      return { sober, restarts, ...display };
    } finally {
      await db.closeAsync();
    }
  });
}

export async function loadWidgetDisplaySettings(db: SQLiteDatabase): Promise<{
  themeAccent: Settings['themeAccent'];
  language: Language;
  languagePreference: Settings['language'];
}> {
  let themeAccent = DEFAULT_SETTINGS.themeAccent;
  let preference = DEFAULT_SETTINGS.language;
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'preferences',
    );
    const value = row ? JSON.parse(row.value) : null;
    if (ACCENT_KEYS.includes(value?.themeAccent)) themeAccent = value.themeAccent;
    if (['system', 'ko', 'en'].includes(value?.language)) preference = value.language;
  } catch {
    // Missing or unreadable preferences use the device language and default accent.
  }
  return {
    themeAccent,
    language: resolveLocale(preference, readDeviceLocale()).language,
    languagePreference: preference,
  };
}
