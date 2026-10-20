import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns';
import type { Completion, Habit } from '../db/types';
import { localDate, shiftDate } from './date';

type SummaryHabit = Pick<Habit, 'id' | 'initial_started_at' | 'priority'>;

export function getHabitDaySummary(
  date: string,
  habits: SummaryHabit[],
  records: Pick<Completion, 'habit_id' | 'date'>[],
) {
  const eligible = habits.filter((habit) => localDate(habit.initial_started_at) <= date);
  const completedIds = new Set(
    records.filter((record) => record.date === date).map((record) => record.habit_id),
  );
  const counted = eligible.filter((habit) => habit.priority > 0);
  const completed = counted.filter((habit) => completedIds.has(habit.id)).length;
  return {
    total: counted.length,
    completed,
    percent: counted.length ? (completed / counted.length) * 100 : null,
    excludedCompleted: eligible.filter(
      (habit) => habit.priority === 0 && completedIds.has(habit.id),
    ).length,
  };
}

export function getHabitFlowStats(
  today: string,
  habits: SummaryHabit[],
  records: Pick<Completion, 'habit_id' | 'date'>[],
) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = shiftDate(today, index - 13);
    return { date, ...getHabitDaySummary(date, habits, records) };
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
