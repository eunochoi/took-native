import type { SQLiteDatabase } from 'expo-sqlite';
import {
  HABIT_NAME_MAX_LENGTH,
  isHabitIcon,
  isHabitIconColor,
  DEFAULT_HABIT_ICON_COLOR,
  MAX_HABIT_COUNT,
} from '../domain/constants';
import { assertDate, canCheckHabit, todayString } from '../domain/date';
import type { Settings } from '../settings/model';
import { withWriteLock } from './index';
import type { Completion, Habit } from './types';

export const getHabitList = (db: SQLiteDatabase) =>
  db.getAllAsync<Habit>('SELECT * FROM habits ORDER BY created_at DESC, id');
export const getHabitById = (db: SQLiteDatabase, id: number) =>
  db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id = ?', id);
export const getCompletions = (db: SQLiteDatabase, from: string, to: string) =>
  db.getAllAsync<Completion>(
    'SELECT * FROM habit_completions WHERE date BETWEEN ? AND ?',
    from,
    to,
  );
export const getCompletionsByHabit = (db: SQLiteDatabase, id: number) =>
  db.getAllAsync<Completion>(
    'SELECT * FROM habit_completions WHERE habit_id = ? ORDER BY date',
    id,
  );
export function sortHabits<T extends Habit>(
  habits: T[],
  settings: Pick<Settings, 'habitSort' | 'habitPriorityFirst' | 'habitOrder'>,
) {
  const order = new Map(settings.habitOrder.map((id, index) => [id, index]));
  return [...habits].sort((a, b) => {
    if (settings.habitSort === 'CUSTOM') {
      const diff =
        (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER);
      if (diff) return diff;
    } else if (settings.habitPriorityFirst && a.priority !== b.priority)
      return b.priority - a.priority;
    const diff = a.created_at.localeCompare(b.created_at);
    return (settings.habitSort === 'ASC' ? diff : -diff) || a.id - b.id;
  });
}
interface HabitInput {
  id?: number;
  name: string;
  priority: number;
  icon_key: Habit['icon_key'];
  icon_color?: Habit['icon_color'];
}
export function validateHabit(input: HabitInput) {
  if (!input.name.trim() || input.name.trim().length > HABIT_NAME_MAX_LENGTH)
    throw new Error(`습관 이름은 1~${HABIT_NAME_MAX_LENGTH}자로 입력해주세요.`);
  if (
    !Number.isInteger(input.priority) ||
    input.priority < 0 ||
    input.priority > 2 ||
    !isHabitIcon(input.icon_key) ||
    !isHabitIconColor(input.icon_color ?? DEFAULT_HABIT_ICON_COLOR)
  )
    throw new Error('습관 설정을 확인해주세요.');
}
export function saveHabit(db: SQLiteDatabase, input: HabitInput) {
  return withWriteLock(async () => {
    validateHabit(input);
    let id = input.id ?? 0;
    await db.withTransactionAsync(async () => {
      const tx = db;
      const name = input.name.trim();
      if (await tx.getFirstAsync('SELECT id FROM habits WHERE name = ? AND id != ?', name, id))
        throw new Error('같은 이름의 습관이 있습니다.');
      const now = new Date().toISOString();
      if (id) {
        const result = await tx.runAsync(
          'UPDATE habits SET name = ?, priority = ?, icon_key = ?, icon_color = ?, updated_at = ? WHERE id = ?',
          name,
          input.priority,
          input.icon_key,
          input.icon_color ?? DEFAULT_HABIT_ICON_COLOR,
          now,
          id,
        );
        if (!result.changes) throw new Error('습관을 찾을 수 없습니다.');
      } else {
        const count = (await tx.getFirstAsync<{ count: number }>(
          'SELECT count(*) AS count FROM habits',
        ))!.count;
        if (count >= MAX_HABIT_COUNT)
          throw new Error(`습관은 최대 ${MAX_HABIT_COUNT}개까지 만들 수 있습니다.`);
        id = (
          await tx.runAsync(
            'INSERT INTO habits (name, priority, icon_key, icon_color, created_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            name,
            input.priority,
            input.icon_key,
            input.icon_color ?? DEFAULT_HABIT_ICON_COLOR,
            todayString(),
            now,
            now,
          )
        ).lastInsertRowId;
      }
    });
    return id;
  });
}
export function setHabitCompletion(
  db: SQLiteDatabase,
  id: number,
  date: string,
  completed: boolean,
) {
  return withWriteLock(async () => {
    assertDate(date);
    await db.withTransactionAsync(async () => {
      const tx = db;
      const habit = await getHabitById(tx, id);
      if (!habit) throw new Error('습관을 찾을 수 없습니다.');
      if (!canCheckHabit(date, habit.created_date))
        throw new Error('습관 생성일 이후, 오늘을 포함한 최근 4일만 변경할 수 있습니다.');
      if (completed)
        await tx.runAsync(
          'INSERT OR IGNORE INTO habit_completions (habit_id, date, created_at) VALUES (?, ?, ?)',
          id,
          date,
          new Date().toISOString(),
        );
      else
        await tx.runAsync(
          'DELETE FROM habit_completions WHERE habit_id = ? AND date = ?',
          id,
          date,
        );
    });
  });
}
export const deleteHabit = (db: SQLiteDatabase, id: number) =>
  withWriteLock(() => db.runAsync('DELETE FROM habits WHERE id = ?', id));
