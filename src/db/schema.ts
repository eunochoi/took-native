import { DEFAULT_HABIT_ICON_COLOR } from '../domain/constants';
import {
  DIARY_TEXT_MAX_LENGTH,
  HABIT_NAME_MAX_LENGTH,
  DIARY_IMAGE_MAX_COUNT,
  SOBER_NAME_MAX_LENGTH,
  SOBER_DESCRIPTION_MAX_LENGTH,
  SOBER_MEMO_MAX_LENGTH,
  SOBER_MAX_GOAL_DAYS,
} from '../domain/limits';
import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 5;
const SCHEMA = `
CREATE TABLE diaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE CHECK(length(date) = 10),
  emotion INTEGER NOT NULL CHECK(emotion BETWEEN 0 AND 9),
  text TEXT NOT NULL CHECK(length(trim(text)) BETWEEN 1 AND ${DIARY_TEXT_MAX_LENGTH}),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND ${HABIT_NAME_MAX_LENGTH}),
  priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 2),
  icon_key TEXT NOT NULL, icon_color TEXT NOT NULL DEFAULT '${DEFAULT_HABIT_ICON_COLOR}', initial_started_at TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE habit_completions (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY(habit_id, date)
);
CREATE INDEX completion_date ON habit_completions(date);
CREATE TABLE diary_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diary_id INTEGER NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL CHECK(position BETWEEN 0 AND ${DIARY_IMAGE_MAX_COUNT - 1}),
  UNIQUE(diary_id, position)
);
CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);

CREATE TABLE sobers (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) BETWEEN 1 AND ${SOBER_NAME_MAX_LENGTH}),
 description TEXT CHECK(description IS NULL OR length(description) <= ${SOBER_DESCRIPTION_MAX_LENGTH}),
 icon_key TEXT NOT NULL,
 icon_color TEXT NOT NULL DEFAULT '${DEFAULT_HABIT_ICON_COLOR}',
 is_priority INTEGER NOT NULL DEFAULT 0 CHECK(is_priority IN (0, 1)),
 initial_started_at TEXT NOT NULL,
 goal_mode TEXT NOT NULL CHECK(goal_mode IN ('AUTO', 'MANUAL')),
 goal_days INTEGER,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK((goal_mode = 'AUTO' AND goal_days IS NULL) OR (goal_mode = 'MANUAL' AND goal_days IS NOT NULL AND goal_days BETWEEN 1 AND ${SOBER_MAX_GOAL_DAYS}))
);
CREATE TABLE sober_restarts (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sober_id INTEGER NOT NULL REFERENCES sobers(id) ON DELETE CASCADE,
 restarted_at TEXT NOT NULL,
 memo TEXT CHECK(memo IS NULL OR length(memo) <= ${SOBER_MEMO_MAX_LENGTH}),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX sober_restart_time ON sober_restarts(sober_id, restarted_at);
`;

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(
    'PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;',
  );
  const version =
    (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version ?? 0;
  if (version === SCHEMA_VERSION) return;
  if (version !== 0) throw new Error('지원하지 않는 DB 버전입니다.');
  await db.withTransactionAsync(async () => {
    await db.execAsync(SCHEMA);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
  });
}
