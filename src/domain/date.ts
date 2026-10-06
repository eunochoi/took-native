import { addDays, addMonths, format, isValid, parseISO, startOfMonth, startOfWeek } from 'date-fns';

export const todayString = () => format(new Date(), 'yyyy-MM-dd');
export const shiftDate = (date: string, days: number) =>
  format(addDays(parseISO(date), days), 'yyyy-MM-dd');
export const shiftMonth = (month: string, amount: number) =>
  format(addMonths(parseISO(`${month}-01`), amount), 'yyyy-MM');
export const isDate = (date: unknown): date is string =>
  typeof date === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  isValid(parseISO(date)) &&
  format(parseISO(date), 'yyyy-MM-dd') === date &&
  date >= '1900-01-01' &&
  date <= '2100-12-31';
export const assertDate = (date: string) => {
  if (!isDate(date)) throw new Error('날짜를 확인해주세요.');
};
export const assertYear = (year: number) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100)
    throw new Error('연도를 확인해주세요.');
};
export const canCheckHabit = (date: string, createdDate: string, today = todayString()) =>
  isDate(date) && date <= today && date >= shiftDate(today, -3) && date >= createdDate;
export const monthDays = (month: string): string[] => {
  assertDate(`${month}-01`);
  const start = startOfWeek(startOfMonth(parseISO(`${month}-01`)));
  return Array.from({ length: 42 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'));
};

export function getStreak(dates: string[], today = todayString()) {
  const ordered = [...new Set(dates)].filter((date) => date <= today).sort();
  let longest = 0;
  let streak = 0;
  let previous = '';
  for (const date of ordered) {
    streak = previous && shiftDate(previous, 1) === date ? streak + 1 : 1;
    longest = Math.max(longest, streak);
    previous = date;
  }
  const current = previous === today || previous === shiftDate(today, -1) ? streak : 0;
  return { current, longest };
}
