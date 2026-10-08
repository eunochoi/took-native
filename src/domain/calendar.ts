import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfWeek } from 'date-fns';
import { assertDate, localDate } from './date';
import type { Completion, Habit } from '../db/types';

export function calendarDays(month: string) {
  assertDate(`${month}-01`);
  const start = parseISO(`${month}-01`);
  return eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(start), { weekStartsOn: 1 }),
  }).map((date) => format(date, 'yyyy-MM-dd'));
}

export function dayHabits(habits: Habit[], completions: Completion[], date: string, today: string) {
  if (date > today) return [];
  const completedIds = new Set(
    completions.filter((item) => item.date === date).map((item) => item.habit_id),
  );
  return habits
    .filter((habit) => localDate(habit.initial_started_at) <= date)
    .sort(
      (a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at) || a.id - b.id,
    )
    .map((habit) => ({ ...habit, completed: completedIds.has(habit.id) }));
}
