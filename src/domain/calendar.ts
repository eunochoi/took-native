import { getHabitDaySummary } from './habitStats';
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

export function habitProgressBand(progress: number) {
  if (!Number.isFinite(progress) || progress <= 0) return null;
  return progress < 25 ? 'low' : progress < 75 ? 'medium' : 'high';
}

export function calendarHabitProgressCounts(
  habits: Pick<Habit, 'id' | 'initial_started_at' | 'priority'>[],
  completions: Pick<Completion, 'habit_id' | 'date'>[],
  month: string,
  today: string,
) {
  const counts = { low: 0, medium: 0, high: 0 };
  const dates = new Set(completions.map((record) => record.date));
  for (const date of dates) {
    if (date.slice(0, 7) !== month || date > today) continue;
    const summary = getHabitDaySummary(date, habits, completions);
    const band = habitProgressBand(summary.percent ?? 0);
    if (band) counts[band]++;
  }
  return counts;
}
