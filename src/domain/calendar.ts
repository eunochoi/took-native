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
  habits: Pick<Habit, 'initial_started_at'>[],
  completions: Pick<Completion, 'date'>[],
  month: string,
  today: string,
) {
  const counts = { low: 0, medium: 0, high: 0 };
  const doneByDate = new Map<string, number>();
  for (const record of completions) {
    if (record.date.slice(0, 7) !== month || record.date > today) continue;
    doneByDate.set(record.date, (doneByDate.get(record.date) ?? 0) + 1);
  }
  const startedDates = habits.map((habit) => localDate(habit.initial_started_at));
  for (const [date, done] of doneByDate) {
    const total = startedDates.filter((start) => start <= date).length;
    const band = habitProgressBand(total > 0 ? (done / total) * 100 : 0);
    if (band) counts[band]++;
  }
  return counts;
}
