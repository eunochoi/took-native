import type { SQLiteDatabase } from 'expo-sqlite';
import { validateDiary } from '../db/diary';
import { isHabitIconColor } from '../domain/constants';
import { SCHEMA_VERSION } from '../db/migrations';
import { validateHabit } from '../db/habit';
import { validateSober, validateSoberRestart } from '../domain/sober';
import { MAX_SOBER_COUNT } from '../domain/limits';
import type { Completion, Diary, DiaryImage, Habit, Sober, SoberRestart } from '../db/types';
import { isDate } from '../domain/date';
import { parseSettings } from '../settings/model';

interface BackupRecords {
  diaries: Diary[];
  habits: Habit[];
  sobers: Sober[];
  soberRestarts: SoberRestart[];
  completions: Completion[];
  images: DiaryImage[];
  preferences: string | null;
}
export async function readBackupDatabase(
  db: SQLiteDatabase,
  files: Record<string, Uint8Array>,
): Promise<BackupRecords> {
  await db.execAsync(
    'PRAGMA query_only = ON; PRAGMA trusted_schema = OFF; PRAGMA foreign_keys = ON;',
  );
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (version?.user_version !== SCHEMA_VERSION) throw new Error('지원하지 않는 DB 버전입니다.');
  const integrity = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  if (integrity?.integrity_check !== 'ok') throw new Error('백업 DB가 손상되었습니다.');
  const schema = await db.getAllAsync<{ type: string; name: string }>(
    "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'",
  );
  const allowed = [
    'diaries',
    'habits',
    'habit_completions',
    'diary_images',
    'settings',
    'sobers',
    'sober_restarts',
  ];
  if (
    schema.some((item) => !['table', 'index'].includes(item.type)) ||
    schema.filter((item) => item.type === 'table').length !== allowed.length ||
    schema.some((item) => item.type === 'table' && !allowed.includes(item.name))
  )
    throw new Error('took DB 구조와 일치하지 않습니다.');
  if ((await db.getAllAsync('PRAGMA foreign_key_check')).length)
    throw new Error('백업 기록의 연결이 손상되었습니다.');
  const diaries = await db.getAllAsync<Diary>(
    'SELECT id, date, emotion, text, created_at, updated_at FROM diaries',
  );
  const habits = await db.getAllAsync<Habit>(
    'SELECT id, name, priority, icon_key, icon_color, created_date, created_at, updated_at FROM habits',
  );
  const completions = await db.getAllAsync<Completion>(
    'SELECT habit_id, date, created_at FROM habit_completions',
  );
  const images = await db.getAllAsync<DiaryImage>(
    'SELECT id, diary_id, file_name, position FROM diary_images',
  );
  const settings = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
  const sobers = await db.getAllAsync<Sober>(
    'SELECT id, name, description, icon_key, icon_color, is_priority, initial_started_at, goal_mode, goal_days, created_at, updated_at FROM sobers',
  );
  const soberRestarts = await db.getAllAsync<SoberRestart>(
    'SELECT id, sober_id, restarted_at, memo, created_at, updated_at FROM sober_restarts',
  );
  const records: BackupRecords = {
    diaries,
    habits,
    sobers,
    soberRestarts,
    completions,
    images,
    preferences: settings.find((item) => item.key === 'preferences')?.value ?? null,
  };
  validateBackupRecords(records, files);
  return records;
}
export function validateBackupRecords(records: BackupRecords, files: Record<string, Uint8Array>) {
  const validId = (id: number) => Number.isSafeInteger(id) && id > 0;
  const validTime = (date: string) => typeof date === 'string' && Number.isFinite(Date.parse(date));
  const diaryIds = new Set(records.diaries.map((diary) => diary.id));
  const habitMap = new Map(records.habits.map((habit) => [habit.id, habit]));
  if (
    diaryIds.size !== records.diaries.length ||
    habitMap.size !== records.habits.length ||
    records.habits.length > 20 ||
    new Set(records.diaries.map((diary) => diary.date)).size !== records.diaries.length
  )
    throw new Error('백업에 중복되거나 너무 많은 기록이 있습니다.');
  if (
    new Set(records.images.map((image) => image.file_name)).size !== records.images.length ||
    new Set(records.images.map((image) => `${image.diary_id}:${image.position}`)).size !==
      records.images.length
  )
    throw new Error('사진 목록이 중복되었습니다.');
  for (const image of records.images) {
    if (
      !validId(image.id) ||
      !diaryIds.has(image.diary_id) ||
      !/^[a-zA-Z0-9_-]+\.jpg$/.test(image.file_name) ||
      !files[`media/${image.file_name}`] ||
      !Number.isInteger(image.position) ||
      image.position < 0 ||
      image.position > 4
    )
      throw new Error('사진 파일이나 연결 정보가 손상되었습니다.');
  }
  for (const diary of records.diaries) {
    if (
      !validId(diary.id) ||
      typeof diary.text !== 'string' ||
      !validTime(diary.created_at) ||
      !validTime(diary.updated_at)
    )
      throw new Error('일기 기록이 손상되었습니다.');
    validateDiary(
      {
        ...diary,
        files: records.images
          .filter((image) => image.diary_id === diary.id)
          .map((image) => image.file_name),
      },
      '2100-12-31',
    );
  }
  for (const habit of records.habits) {
    if (
      !validId(habit.id) ||
      typeof habit.name !== 'string' ||
      !isHabitIconColor(habit.icon_color) ||
      !isDate(habit.created_date) ||
      !validTime(habit.created_at) ||
      !validTime(habit.updated_at)
    )
      throw new Error('습관 기록이 손상되었습니다.');
    validateHabit(habit);
  }
  if (
    new Set(records.habits.map((habit) => habit.name.trim())).size !== records.habits.length ||
    new Set(records.completions.map((row) => `${row.habit_id}:${row.date}`)).size !==
      records.completions.length
  )
    throw new Error('습관 기록이 중복되었습니다.');
  for (const row of records.completions) {
    const habit = habitMap.get(row.habit_id);
    if (!habit || !isDate(row.date) || row.date < habit.created_date || !validTime(row.created_at))
      throw new Error('습관 완료 기록이 손상되었습니다.');
  }
  const soberMap = new Map(records.sobers.map((item) => [item.id, item]));
  if (
    soberMap.size !== records.sobers.length ||
    records.sobers.length > MAX_SOBER_COUNT ||
    new Set(records.sobers.map((item) => item.name.trim())).size !== records.sobers.length ||
    new Set(records.soberRestarts.map((item) => item.id)).size !== records.soberRestarts.length
  )
    throw new Error('거리두기 기록이 중복되거나 너무 많아요.');
  const now = Date.now();
  for (const item of records.sobers) {
    if (!validId(item.id) || !validTime(item.created_at) || !validTime(item.updated_at))
      throw new Error('거리두기 기록이 손상됐어요.');
    validateSober(item, now);
  }
  for (const item of records.soberRestarts) {
    const sober = soberMap.get(item.sober_id);
    if (!validId(item.id) || !sober || !validTime(item.created_at) || !validTime(item.updated_at))
      throw new Error('다시 시작 기록의 연결이 손상되었습니다.');
    validateSoberRestart(item, sober.initial_started_at, now);
  }
  const mediaCount = Object.keys(files).filter((name) => name.startsWith('media/')).length;
  if (mediaCount !== records.images.length)
    throw new Error('사진 파일 목록과 DB가 일치하지 않습니다.');
  if (records.preferences !== null) parseSettings(JSON.parse(records.preferences));
}

export async function replaceRecords(
  db: SQLiteDatabase,
  records: BackupRecords,
  names: Map<string, string>,
) {
  await db.withTransactionAsync(async () => {
    const tx = db;
    await tx.execAsync(
      'DELETE FROM sober_restarts; DELETE FROM sobers; DELETE FROM diary_images; DELETE FROM habit_completions; DELETE FROM diaries; DELETE FROM habits; DELETE FROM settings;',
    );
    for (const row of records.diaries)
      await tx.runAsync(
        'INSERT INTO diaries (id, date, emotion, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        row.id,
        row.date,
        row.emotion,
        row.text,
        row.created_at,
        row.updated_at,
      );
    for (const row of records.habits)
      await tx.runAsync(
        'INSERT INTO habits (id, name, priority, icon_key, icon_color, created_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        row.id,
        row.name,
        row.priority,
        row.icon_key,
        row.icon_color,
        row.created_date,
        row.created_at,
        row.updated_at,
      );
    for (const row of records.sobers)
      await tx.runAsync(
        'INSERT INTO sobers (id, name, description, icon_key, icon_color, is_priority, initial_started_at, goal_mode, goal_days, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        row.id,
        row.name,
        row.description,
        row.icon_key,
        row.icon_color,
        row.is_priority,
        row.initial_started_at,
        row.goal_mode,
        row.goal_days,
        row.created_at,
        row.updated_at,
      );
    for (const row of records.soberRestarts)
      await tx.runAsync(
        'INSERT INTO sober_restarts (id, sober_id, restarted_at, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        row.id,
        row.sober_id,
        row.restarted_at,
        row.memo,
        row.created_at,
        row.updated_at,
      );
    for (const row of records.completions)
      await tx.runAsync(
        'INSERT INTO habit_completions (habit_id, date, created_at) VALUES (?, ?, ?)',
        row.habit_id,
        row.date,
        row.created_at,
      );
    for (const row of records.images) {
      const name = names.get(row.file_name);
      if (!name) throw new Error('복원 사진을 준비하지 못했습니다.');
      await tx.runAsync(
        'INSERT INTO diary_images (id, diary_id, file_name, position) VALUES (?, ?, ?, ?)',
        row.id,
        row.diary_id,
        name,
        row.position,
      );
    }
    if (records.preferences !== null)
      await tx.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?)',
        'preferences',
        JSON.stringify(parseSettings(JSON.parse(records.preferences))),
      );
  });
}
