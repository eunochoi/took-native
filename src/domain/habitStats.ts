import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns';

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
