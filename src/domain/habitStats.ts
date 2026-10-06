import { differenceInCalendarDays, endOfMonth, format, isLeapYear, parseISO } from 'date-fns';
import { shiftDate } from './date';

export function getHabitMonthSummary(
  month: string,
  created: string,
  dates: string[],
  today: string,
) {
  const end = format(endOfMonth(parseISO(`${month}-01`)), 'yyyy-MM-dd');
  const start = created > `${month}-01` ? created : `${month}-01`;
  const target = start <= end ? differenceInCalendarDays(parseISO(end), parseISO(start)) + 1 : 0;
  const locked = shiftDate(today, -4) < end ? shiftDate(today, -4) : end;
  const lockedDays = target
    ? Math.max(0, differenceInCalendarDays(parseISO(locked), parseISO(start)) + 1)
    : 0;
  const valid = [...new Set(dates)].filter((date) => date >= start && date <= end && date <= today);
  return {
    completed: valid.length,
    missed: Math.max(0, lockedDays - valid.filter((date) => date <= locked).length),
    rate: target ? ((valid.length / target) * 100).toFixed(1) : null,
  };
}

export function getHabitYearSummary(year: number, dates: string[]) {
  const monthly = Array<number>(12).fill(0);
  const prefix = `${year}-`;
  let completed = 0;
  for (const date of dates) {
    if (!date.startsWith(prefix)) continue;
    monthly[Number(date.slice(5, 7)) - 1]++;
    completed++;
  }
  return {
    completed,
    monthly,
    rate: ((completed / (isLeapYear(parseISO(`${year}-01-01`)) ? 366 : 365)) * 100).toFixed(1),
  };
}
