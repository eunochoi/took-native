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
export const canCheckHabit = (date: string, startedDate: string, today = todayString()) =>
  isDate(date) && date <= today && date >= shiftDate(today, -3) && date >= startedDate;
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

export const localDate = (iso: string) => format(parseISO(iso), 'yyyy-MM-dd');

export function assertDateTime(value: string, now: number) {
  const timestamp = Date.parse(value);
  if (
    typeof value !== 'string' ||
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== value ||
    value < '1900-01-01T00:00:00.000Z' ||
    value > '2100-12-31T23:59:59.999Z'
  )
    throw new Error('날짜와 시간을 확인해주세요.');
  if (timestamp > now) throw new Error('미래 시각에는 기록할 수 없어요.');
}

interface DateTimeDraft {
  date: string;
  hour: string;
  minute: string;
}
export function dateTimeDraft(iso: string): DateTimeDraft {
  const date = parseISO(iso);
  return { date: format(date, 'yyyy-MM-dd'), hour: format(date, 'HH'), minute: format(date, 'mm') };
}
export function parseDateTime(draft: DateTimeDraft, now: number) {
  if (
    !/^\d{1,2}$/.test(draft.hour) ||
    !/^\d{1,2}$/.test(draft.minute) ||
    Number(draft.hour) > 23 ||
    Number(draft.minute) > 59
  )
    throw new Error('시간은 0~23시, 분은 0~59분으로 입력해주세요.');
  const local = `${draft.date}T${draft.hour.padStart(2, '0')}:${draft.minute.padStart(2, '0')}:00`;
  const date = new Date(local);
  if (!Number.isFinite(date.getTime()) || format(date, "yyyy-MM-dd'T'HH:mm:ss") !== local)
    throw new Error('날짜와 시간을 확인해주세요.');
  const iso = date.toISOString();
  assertDateTime(iso, now);
  return iso;
}
