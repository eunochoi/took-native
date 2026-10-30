import type { itemAccentColors } from '../../theme/colors';
import { useMemo, useState } from 'react';
import type { Habit } from '../../db/types';
import { localDate } from '../../domain/date';
import { getHabitMonthSummary } from '../../domain/habitStats';
import { HabitRecentRecord } from './HabitRecentRecord';
import { HabitMonthStatistics } from './HabitMonthStatistics';
import { HabitYearStatistics } from './HabitYearStatistics';

export function HabitStatistics({
  habit,
  dates,
  today,
  unavailable,
  accent,
}: {
  habit: Habit;
  dates: string[];
  today: string;
  unavailable: boolean;
  accent?: ReturnType<typeof itemAccentColors>;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const startedDate = localDate(habit.initial_started_at);
  const summary = useMemo(
    () => getHabitMonthSummary(month, startedDate, dates, today),
    [month, startedDate, dates, today],
  );
  return (
    <>
      {habit.priority === 0 && (
        <HabitRecentRecord
          dates={dates}
          startedDate={startedDate}
          today={today}
          unavailable={unavailable}
        />
      )}
      <HabitMonthStatistics
        accent={accent}
        habit={habit}
        dates={dates}
        month={month}
        onMonthChange={setMonth}
        today={today}
        summary={summary}
        unavailable={unavailable}
      />
      {habit.priority > 0 && (
        <HabitYearStatistics
          accent={accent}
          dates={dates}
          startedDate={startedDate}
          today={today}
          unavailable={unavailable}
        />
      )}
    </>
  );
}
