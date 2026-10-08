import { useMemo, useState } from 'react';
import type { Habit } from '../../db/types';
import { localDate } from '../../domain/date';
import { getHabitMonthSummary } from '../../domain/habitStats';
import { HabitMonthStatistics } from './HabitMonthStatistics';
import { HabitYearStatistics } from './HabitYearStatistics';

export function HabitStatistics({
  habit,
  dates,
  today,
  disabled,
  unavailable,
  onToggle,
}: {
  habit: Habit;
  dates: string[];
  today: string;
  disabled: boolean;
  unavailable: boolean;
  onToggle: (date: string, completed: boolean) => void;
}) {
  const [month, setMonth] = useState(today.slice(0, 7));
  const startedDate = localDate(habit.initial_started_at);
  const summary = useMemo(
    () => getHabitMonthSummary(month, startedDate, dates, today),
    [month, startedDate, dates, today],
  );
  return (
    <>
      <HabitMonthStatistics
        habit={habit}
        dates={dates}
        month={month}
        onMonthChange={setMonth}
        today={today}
        summary={summary}
        disabled={disabled}
        unavailable={unavailable}
        onToggle={onToggle}
      />
      <HabitYearStatistics
        dates={dates}
        startedDate={startedDate}
        today={today}
        unavailable={unavailable}
      />
    </>
  );
}
