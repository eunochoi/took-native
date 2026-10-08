import { useCallback } from 'react';
import { isDate, shiftMonth } from '../domain/date';

export function useCalendarNavigation(
  month: string,
  onMonthChange: (month: string) => void,
  minDate = '1900-01-01',
  maxDate = '2100-12-31',
) {
  const minMonth = minDate.slice(0, 7);
  const maxMonth = maxDate.slice(0, 7);
  const changeToMonth = useCallback(
    (next: string) => {
      if (isDate(`${next}-01`) && next >= minMonth && next <= maxMonth) onMonthChange(next);
    },
    [minMonth, maxMonth, onMonthChange],
  );
  const changeMonth = useCallback(
    (amount: number) => changeToMonth(shiftMonth(month, amount)),
    [month, changeToMonth],
  );
  const isDateAvailable = useCallback(
    (date: string) => isDate(date) && date >= minDate && date <= maxDate,
    [minDate, maxDate],
  );
  return {
    changeToMonth,
    changeMonth,
    isDateAvailable,
    canGoPrevious: month > minMonth && month > '1900-01',
    canGoNext: month < maxMonth && month < '2100-12',
  };
}
