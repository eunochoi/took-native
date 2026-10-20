import { useMemo } from 'react';
import { View } from 'react-native';
import { calendarDays } from '../../domain/calendar';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { CalendarDay } from './CalendarDay';
import { CalendarGrid } from './CalendarGrid';
import { CalendarHeader } from './CalendarHeader';

export function DatePickerCalendar({
  month,
  today,
  selected,
  minDate,
  compact = false,
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  minDate?: string;
  compact?: boolean;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, minDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  return (
    <View className="gap-4">
      <CalendarHeader month={month} today={today} navigation={navigation} centerTitle />
      <CalendarGrid {...swipe.panHandlers} accessibilityLabel={`${month} 날짜 선택 달력`}>
        {days.map((date) => {
          const unavailable = !navigation.isDateAvailable(date);
          const isSelected = date === selected && date.slice(0, 7) === month && !unavailable;
          return (
            <CalendarDay
              key={date}
              date={date}
              month={month}
              today={today}
              selected={selected}
              showTodayIndicator={false}
              showSelectedIndicator={false}
              disabled={unavailable}
              dimmed={unavailable}
              onSelect={onSelect}
              className={compact ? 'aspect-auto h-10' : undefined}
              contentClassName={isSelected ? 'rounded-full bg-theme-accent' : undefined}
              textClassName={isSelected ? 'text-theme-surface' : undefined}
            />
          );
        })}
      </CalendarGrid>
    </View>
  );
}
