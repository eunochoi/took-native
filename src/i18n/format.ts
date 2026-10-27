import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

type DateStyle =
  | 'compact'
  | 'compactDay'
  | 'short'
  | 'date'
  | 'long'
  | 'form'
  | 'month'
  | 'weekday'
  | 'day'
  | 'dayShort'
  | 'weekdayShort'
  | 'dateTime'
  | 'shortDateTime';
export function formatDisplayDate(value: string, locale: string, style: DateStyle): string {
  const date = parseISO(value);
  if (locale.startsWith('ko')) {
    const patterns: Record<DateStyle, string> = {
      compact: 'yyyy.M.d',
      compactDay: 'M.d',
      shortDateTime: 'yy년 M월 d일 HH:mm',
      dateTime: 'yyyy년 M월 d일 HH:mm',
      weekdayShort: 'eee',
      dayShort: 'M월 d일',
      short: 'yy년 M월 d일',
      date: 'yyyy년 M월 d일',
      long: 'yyyy년 M월 d일 EEEE',
      form: 'yyyy. M. d. EEEE',
      month: 'yyyy년 M월',
      weekday: 'EEEE',
      day: 'M월 d일 EEEE',
    };
    return format(date, patterns[style], { locale: ko });
  }
  const options: Intl.DateTimeFormatOptions =
    style === 'compact' || style === 'compactDay'
      ? { year: style === 'compact' ? 'numeric' : undefined, month: 'numeric', day: 'numeric' }
      : style === 'weekday' || style === 'weekdayShort'
        ? { weekday: style === 'weekdayShort' ? 'short' : 'long' }
        : style === 'month'
          ? { year: 'numeric', month: 'long' }
          : {
              year: style === 'day' || style === 'dayShort' ? undefined : 'numeric',
              ...(style === 'dateTime' || style === 'shortDateTime'
                ? {
                    hour: '2-digit' as const,
                    minute: '2-digit' as const,
                    hourCycle: 'h23' as const,
                  }
                : {}),
              month: 'short',
              day: 'numeric',
              ...(['long', 'form', 'day'].includes(style) ? { weekday: 'long' as const } : {}),
            };
  return new Intl.DateTimeFormat(locale, options).format(date);
}
