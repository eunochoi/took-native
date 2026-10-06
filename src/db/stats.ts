import type { SQLiteDatabase } from 'expo-sqlite';
import { assertYear, getStreak, todayString } from '../domain/date';
import type { Diary, Habit } from './types';

export async function getAvailableYears(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ year: string }>(
    'SELECT substr(date, 1, 4) AS year FROM diaries UNION SELECT substr(date, 1, 4) AS year FROM habit_completions ORDER BY year DESC',
  );
  return [
    ...new Set([Number(todayString().slice(0, 4)), ...rows.map((row) => Number(row.year))]),
  ].sort((a, b) => b - a);
}
export async function getDiaryStats(db: SQLiteDatabase, year: number) {
  assertYear(year);
  const diaries = await db.getAllAsync<Pick<Diary, 'date' | 'emotion'>>(
    'SELECT date, emotion FROM diaries ORDER BY date',
  );
  const selected = diaries.filter((diary) => diary.date.startsWith(String(year)));
  const monthly = Array<number>(12).fill(0);
  const emotions = Array<number>(10).fill(0);
  const halves = [Array<number>(10).fill(0), Array<number>(10).fill(0)];
  for (const diary of selected) {
    const month = Number(diary.date.slice(5, 7)) - 1;
    monthly[month]++;
    emotions[diary.emotion]++;
    halves[Math.floor(month / 6)][diary.emotion]++;
  }
  return {
    total: selected.length,
    monthly,
    emotions,
    halves,
    ...getStreak(diaries.map((diary) => diary.date)),
  };
}
export async function getHabitStats(db: SQLiteDatabase, year: number) {
  assertYear(year);
  const habits = await db.getAllAsync<Habit & { count: number }>(
    `SELECT h.*, count(c.date) AS count FROM habits h LEFT JOIN habit_completions c ON c.habit_id = h.id AND c.date BETWEEN ? AND ? GROUP BY h.id ORDER BY count DESC, h.id`,
    `${year}-01-01`,
    `${year}-12-31`,
  );
  const recorded = habits.filter((habit) => habit.count > 0);
  return { top: recorded.slice(0, 5), bottom: recorded.slice(-5).reverse(), all: habits };
}
