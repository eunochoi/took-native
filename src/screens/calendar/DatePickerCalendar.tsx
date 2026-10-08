import { useMemo } from 'react';
import { View } from 'react-native';
import { calendarDays } from '../../domain/calendar';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { CalendarDay } from './CalendarDay';
import { CalendarGrid } from './CalendarGrid';
import { CalendarMonthHeader } from './CalendarMonthHeader';

export function DatePickerCalendar({
  month,
  today,
  selected,
  minDate,
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  minDate?: string;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, minDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  return (
    <View className="gap-4">
      <CalendarMonthHeader
        headingWeight="normal"
        month={month}
        today={today}
        navigation={navigation}
        onToday={() => onSelect(today)}
      />
      <CalendarGrid {...swipe.panHandlers} accessibilityLabel={`${month} 날짜 선택 달력`}>
        {days.map((date) => {
          const unavailable = !navigation.isDateAvailable(date);
          return (
            <CalendarDay
              key={date}
              date={date}
              month={month}
              today={today}
              selected={selected}
              disabled={unavailable}
              dimmed={unavailable}
              onSelect={onSelect}
            />
          );
        })}
      </CalendarGrid>
    </View>
  );
}
