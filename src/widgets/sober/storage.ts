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
export function loadWidgetRecord(id: number) {
  return withReadLock(async () => {
    const db = await openDatabaseAsync('took.db', { useNewConnection: true });
    try {
      const sober = await getSoberById(db, id);
      const [restarts, themeAccent] = await Promise.all([
        sober ? getSoberRestarts(db, id) : [],
        loadWidgetThemeAccent(db),
      ]);
      return { sober, restarts, themeAccent };
    } finally {
      await db.closeAsync();
    }
  });
}

export async function loadWidgetThemeAccent(db: SQLiteDatabase): Promise<Settings['themeAccent']> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'preferences',
    );
    const accent = row ? JSON.parse(row.value)?.themeAccent : undefined;
    if (ACCENT_KEYS.includes(accent)) return accent;
  } catch {
    // A missing or unreadable preference must not prevent the widget from rendering.
  }
  return DEFAULT_SETTINGS.themeAccent;
}
