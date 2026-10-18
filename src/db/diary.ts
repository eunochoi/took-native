import { DIARY_SEASONS, DIARY_EMOTION_GROUPS } from '../domain/diaryFilters';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DIARY_IMAGE_MAX_COUNT, DIARY_TEXT_MAX_LENGTH, PAGE_SIZE } from '../domain/constants';
import { assertDate, assertYear, todayString } from '../domain/date';
import { withWriteLock } from './index';
import type { Diary, DiaryDetail, DiaryFilters, DiaryImage, Habit } from './types';

export async function getDiaryYears(db: SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ year: number }>(
    'SELECT DISTINCT CAST(substr(date, 1, 4) AS INTEGER) AS year FROM diaries ORDER BY year DESC',
  );
  return rows.map((row) => row.year);
}

export async function getDiaryById(db: SQLiteDatabase, id: number): Promise<DiaryDetail | null> {
  const diary = await db.getFirstAsync<Diary>('SELECT * FROM diaries WHERE id = ?', id);
  if (!diary) return null;
  const images = await db.getAllAsync<DiaryImage>(
    'SELECT * FROM diary_images WHERE diary_id = ? ORDER BY position',
    id,
  );
  const completedHabits = await db.getAllAsync<Habit>(
    'SELECT h.* FROM habits h JOIN habit_completions c ON c.habit_id = h.id WHERE c.date = ? ORDER BY h.id',
    diary.date,
  );
  return { ...diary, images, completedHabits };
}
export const getDiaryByDate = (db: SQLiteDatabase, date: string) =>
  db.getFirstAsync<Diary>('SELECT * FROM diaries WHERE date = ?', date);

export async function getDiaryList(db: SQLiteDatabase, filters: DiaryFilters, page: number) {
  if (filters.year !== null) assertYear(filters.year);
  if (
    !Array.isArray(filters.seasons) ||
    filters.seasons.some((season) => !Object.hasOwn(DIARY_SEASONS, season))
  )
    throw new Error('계절을 확인해주세요.');
  if (
    !Array.isArray(filters.emotionGroups) ||
    filters.emotionGroups.some((group) => !Object.hasOwn(DIARY_EMOTION_GROUPS, group))
  )
    throw new Error('감정을 확인해주세요.');
  if (!Number.isInteger(page) || page < 0) throw new Error('목록 위치가 올바르지 않습니다.');
  const conditions: string[] = [];
  const parameters: (string | number)[] = [];
  const seasons = [...new Set(filters.seasons)];
  if (filters.year !== null) {
    if (seasons.length) {
      const ranges = seasons.map((season) => {
        const startMonth = DIARY_SEASONS[season].months[0];
        const endMonth = season === 'winter' ? 3 : startMonth + 3;
        const endYear = filters.year! + (season === 'winter' ? 1 : 0);
        parameters.push(
          `${filters.year}-${String(startMonth).padStart(2, '0')}-01`,
          `${endYear}-${String(endMonth).padStart(2, '0')}-01`,
        );
        return '(date >= ? AND date < ?)';
      });
      conditions.push(`(${ranges.join(' OR ')})`);
    } else {
      conditions.push('date >= ? AND date < ?');
      parameters.push(`${filters.year}-01-01`, `${filters.year + 1}-01-01`);
    }
  } else if (seasons.length && seasons.length < 4) {
    const months = seasons.flatMap((season) => [...DIARY_SEASONS[season].months]);
    conditions.push(`CAST(substr(date, 6, 2) AS INTEGER) IN (${months.map(() => '?').join(',')})`);
    parameters.push(...months);
  }
  const groups = [...new Set(filters.emotionGroups)];
  if (groups.length && groups.length < 3) {
    const emotions = groups.flatMap((group) => [...DIARY_EMOTION_GROUPS[group].emotions]);
    conditions.push(`emotion IN (${emotions.map(() => '?').join(',')})`);
    parameters.push(...emotions);
  }
  const diaries = await db.getAllAsync<Diary>(
    `SELECT * FROM diaries${conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''} ORDER BY date ${filters.sort === 'ASC' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
    ...parameters,
    PAGE_SIZE,
    page * PAGE_SIZE,
  );
  if (diaries.length === 0) return [];
  // Fetch the page first, then batch its children so joins cannot duplicate or truncate diaries.
  const placeholders = diaries.map(() => '?').join(',');
  const images = await db.getAllAsync<DiaryImage>(
    `SELECT * FROM diary_images WHERE diary_id IN (${placeholders}) ORDER BY position`,
    ...diaries.map((diary) => diary.id),
  );
  const habits = await db.getAllAsync<Habit & { completion_date: string }>(
    `SELECT h.*, c.date AS completion_date FROM habits h JOIN habit_completions c ON c.habit_id = h.id WHERE c.date IN (${placeholders}) ORDER BY h.id`,
    ...diaries.map((diary) => diary.date),
  );
  const imagesByDiary = new Map<number, DiaryImage[]>();
  for (const image of images) {
    const group = imagesByDiary.get(image.diary_id);
    if (group) group.push(image);
    else imagesByDiary.set(image.diary_id, [image]);
  }
  const habitsByDate = new Map<string, Habit[]>();
  for (const habit of habits) {
    const group = habitsByDate.get(habit.completion_date);
    if (group) group.push(habit);
    else habitsByDate.set(habit.completion_date, [habit]);
  }
  return diaries.map((diary): DiaryDetail => ({
    ...diary,
    images: imagesByDiary.get(diary.id) ?? [],
    completedHabits: habitsByDate.get(diary.date) ?? [],
  }));
}

export interface DiaryInput {
  id?: number;
  date: string;
  emotion: number;
  text: string;
  files: string[];
}
export function validateDiary(input: DiaryInput, today = todayString()) {
  assertDate(input.date);
  if (input.date > today) throw new Error('미래 날짜의 일기는 작성하거나 수정할 수 없습니다.');
  if (!Number.isInteger(input.emotion) || input.emotion < 0 || input.emotion > 9)
    throw new Error('감정을 선택해주세요.');
  if (!input.text.trim() || input.text.length > DIARY_TEXT_MAX_LENGTH)
    throw new Error(
      `일기는 공백만 입력할 수 없으며 ${DIARY_TEXT_MAX_LENGTH}자까지 입력할 수 있습니다.`,
    );
  if (
    input.files.length > DIARY_IMAGE_MAX_COUNT ||
    new Set(input.files).size !== input.files.length ||
    input.files.some((file) => !/^[a-zA-Z0-9_-]+\.jpg$/.test(file))
  )
    throw new Error('사진 목록을 확인해주세요.');
}

// Caller owns local files. Removed filenames are returned for cleanup after commit.
export function saveDiary(db: SQLiteDatabase, input: DiaryInput) {
  return withWriteLock(async () => {
    validateDiary(input);
    let id = input.id ?? 0;
    let removed: string[] = [];
    await db.withTransactionAsync(async () => {
      const tx = db;
      const duplicate = await tx.getFirstAsync<Diary>(
        'SELECT * FROM diaries WHERE date = ?',
        input.date,
      );
      if (duplicate && duplicate.id !== input.id) throw new Error('이미 일기가 있는 날짜입니다.');
      if (input.id) {
        const current = await tx.getFirstAsync<Diary>(
          'SELECT * FROM diaries WHERE id = ?',
          input.id,
        );
        if (!current) throw new Error('일기를 찾을 수 없습니다.');
        if (current.date > todayString()) throw new Error('미래 날짜의 일기는 수정할 수 없습니다.');
        if (current.date !== input.date) throw new Error('일기의 날짜는 변경할 수 없습니다.');
        const images = await tx.getAllAsync<DiaryImage>(
          'SELECT * FROM diary_images WHERE diary_id = ?',
          id,
        );
        removed = images
          .filter((image) => !input.files.includes(image.file_name))
          .map((image) => image.file_name);
        await tx.runAsync(
          'UPDATE diaries SET emotion = ?, text = ?, updated_at = ? WHERE id = ?',
          input.emotion,
          input.text,
          new Date().toISOString(),
          id,
        );
        await tx.runAsync('DELETE FROM diary_images WHERE diary_id = ?', id);
      } else {
        const now = new Date().toISOString();
        id = (
          await tx.runAsync(
            'INSERT INTO diaries (date, emotion, text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            input.date,
            input.emotion,
            input.text,
            now,
            now,
          )
        ).lastInsertRowId;
      }
      for (const [position, file] of input.files.entries()) {
        await tx.runAsync(
          'INSERT INTO diary_images (diary_id, file_name, position) VALUES (?, ?, ?)',
          id,
          file,
          position,
        );
      }
    });
    return { id, removed };
  });
}
export function deleteDiary(db: SQLiteDatabase, id: number) {
  return withWriteLock(async () => {
    let files: string[] = [];
    await db.withTransactionAsync(async () => {
      const tx = db;
      files = (
        await tx.getAllAsync<DiaryImage>('SELECT * FROM diary_images WHERE diary_id = ?', id)
      ).map((image) => image.file_name);
      await tx.runAsync('DELETE FROM diaries WHERE id = ?', id);
    });
    return files;
  });
}
