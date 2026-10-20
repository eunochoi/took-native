import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns';
import type { Completion, Habit } from '../db/types';
import { localDate, shiftDate } from './date';

export function getHabitFlowStats(
  today: string,
  habits: Pick<Habit, 'id' | 'initial_started_at'>[],
  records: Pick<Completion, 'habit_id' | 'date'>[],
) {
  const starts = habits.map((habit) => ({
    id: habit.id,
    date: localDate(habit.initial_started_at),
  }));
  const completedByDate = new Map<string, Set<number>>();
  for (const record of records) {
    if (!completedByDate.has(record.date)) completedByDate.set(record.date, new Set());
    completedByDate.get(record.date)!.add(record.habit_id);
  }
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = shiftDate(today, index - 13);
    const eligible = starts.filter((habit) => habit.date <= date);
    const completed = eligible.filter((habit) => completedByDate.get(date)?.has(habit.id)).length;
    return {
      date,
      total: eligible.length,
      completed,
      percent: eligible.length ? (completed / eligible.length) * 100 : null,
    };
  });
  const [previous, recent] = [0, 7].map((offset) => {
    const periodDays = days.slice(offset, offset + 7);
    const eligibleDays = periodDays.filter((day) => day.percent !== null);
    return {
      start: periodDays[0].date,
      end: periodDays[6].date,
      days: periodDays,
      eligibleDays: eligibleDays.length,
      average: eligibleDays.length
        ? eligibleDays.reduce((sum, day) => sum + day.percent!, 0) / eligibleDays.length
        : null,
    };
  });
  return {
    recent,
    previous,
    change:
      recent.average !== null && previous.average !== null
        ? recent.average - previous.average
        : null,
  };
}

export function getHabitMonthSummary(
  month: string,
  startedDate: string,
  dates: string[],
  today: string,
) {
  const monthEnd = format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');
  const end = today < monthEnd ? today : monthEnd;
  const start = startedDate > `${month}-01` ? startedDate : `${month}-01`;
  const target = start <= end ? differenceInCalendarDays(parseISO(end), parseISO(start)) + 1 : 0;
  const valid = [...new Set(dates)].filter((date) => date >= start && date <= end && date <= today);
  return {
    completed: valid.length,
    missed: Math.max(0, target - valid.length),
    rate: target ? ((valid.length / target) * 100).toFixed(1) : null,
  };
}

export function getHabitYearSummary(
  year: number,
  dates: string[],
  startedDate: string,
  today: string,
) {
  const monthly = Array<number>(12).fill(0);
  const start = startedDate > `${year}-01-01` ? startedDate : `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const end = today < yearEnd ? today : yearEnd;
  const target = start <= end ? differenceInCalendarDays(parseISO(end), parseISO(start)) + 1 : 0;
  let completed = 0;
  for (const date of new Set(dates)) {
    if (date < start || date > end) continue;
    monthly[Number(date.slice(5, 7)) - 1]++;
    completed++;
  }
  return {
    completed,
    missed: Math.max(0, target - completed),
    monthly,
    rate: target ? ((completed / target) * 100).toFixed(1) : null,
  };
}
