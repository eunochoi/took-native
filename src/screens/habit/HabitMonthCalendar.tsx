import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import type { Habit } from '../../db/types';
import type { getHabitMonthSummary } from '../../domain/habitStats';
import { canCheckHabit, shiftDate, localDate } from '../../domain/date';
import { CalendarGrid } from '../calendar/CalendarGrid';
import { calendarDays } from '../../domain/calendar';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { CalendarDay } from '../calendar/CalendarDay';
import { CalendarHeader } from '../calendar/CalendarHeader';

export function HabitMonthCalendar({
  habit,
  dates,
  month,
  onMonthChange,
  today,
  summary,
  disabled,
  unavailable,
  onToggle,
}: {
  habit: Habit;
  dates: string[];
  month: string;
  onMonthChange: (month: string) => void;
  today: string;
  summary: ReturnType<typeof getHabitMonthSummary>;
  disabled: boolean;
  unavailable: boolean;
  onToggle: (date: string, checked: boolean) => void;
}) {
  const startedDate = localDate(habit.initial_started_at);
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, startedDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  const completedDates = useMemo(() => new Set(dates), [dates]);
  const lockedBefore = shiftDate(today, -3);
  return (
    <View className="gap-4">
      <CalendarHeader
        month={month}
        today={today}
        navigation={navigation}
      />
      <View className="flex-row py-3">
        {[
          { label: '실천 횟수', value: summary.completed, unit: '회' },
          { label: '놓친 실천', value: summary.missed, unit: '회' },
          { label: '실천율', value: summary.rate ?? '—', unit: '%' },
        ].map((stat, index) => (
          <View
            key={stat.label}
            className={`flex-1 gap-1 px-2 items-center ${index > 0 ? 'border-l border-theme-border/60' : ''}`}
          >
            <Text className="text-sm text-theme-text-secondary">{stat.label}</Text>
            <Text className="text-2xl font-bold text-theme-accent">
              {unavailable ? '—' : stat.value}
              <Text className="text-sm font-semibold text-theme-text-secondary"> {stat.unit}</Text>
            </Text>
          </View>
        ))}
      </View>
      <CalendarGrid {...swipe.panHandlers} accessibilityLabel={`${month} 습관 실천 달력`}>
        {days.map((date) => {
          const outside = date.slice(0, 7) !== month;
          const completed = !outside && completedDates.has(date);
          const missed =
            !unavailable && !outside && date >= startedDate && date < lockedBefore && !completed;
          return (
            <CalendarDay
              key={date}
              date={date}
              month={month}
              today={today}
              onMonthChange={navigation.changeToMonth}
              disabled={disabled || !navigation.isDateAvailable(date) || (!outside && !canCheckHabit(date, startedDate, today))}
              dimmed={!navigation.isDateAvailable(date)}
              onSelect={(selectedDate) => onToggle(selectedDate, !completed)}
              label={`${date}${completed ? ', 완료 기록 있음' : ''}${missed ? ', 놓친 횟수' : ''}`}
              contentClassName={
                completed
                  ? 'rounded-full bg-theme-accent'
                  : missed
                    ? 'rounded-full bg-theme-border'
                    : undefined
              }
              textClassName={
                completed
                  ? 'text-theme-text-on-accent'
                  : missed
                    ? 'text-theme-text-secondary'
                    : undefined
              }
            />
          );
        })}
      </CalendarGrid>
    </View>
  );
}
