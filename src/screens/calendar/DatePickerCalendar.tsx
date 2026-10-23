import { useMemo } from 'react';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { useAppTheme } from '../../theme/AppThemeProvider';
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
  diaryDates,
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  minDate?: string;
  compact?: boolean;
  diaryDates?: readonly string[];
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  const recorded = useMemo(() => new Set(diaryDates), [diaryDates]);
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, minDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  return (
    <View className="gap-4">
      <CalendarHeader month={month} today={today} navigation={navigation} centerTitle />
      <CalendarGrid {...swipe.panHandlers} accessibilityLabel={`${month} 날짜 선택 달력`}>
        {days.map((date) => {
          const unavailable = !navigation.isDateAvailable(date);
          const hasDiary = date.slice(0, 7) === month && !unavailable && recorded.has(date);
          const isSelected = date === selected && date.slice(0, 7) === month && !unavailable;
          return (
            <CalendarDay
              key={date}
              date={date}
              month={month}
              today={today}
              selected={selected}
              label={hasDiary ? `${date}, 일기 있음` : undefined}
              showTodayIndicator={false}
              showSelectedIndicator={false}
              disabled={unavailable}
              dimmed={unavailable}
              onSelect={onSelect}
              className={compact ? 'aspect-auto h-10' : undefined}
              contentClassName={isSelected ? 'rounded-full bg-theme-accent' : undefined}
              textClassName={isSelected ? 'text-theme-surface' : undefined}
            >
              {hasDiary ? (
                <View
                  className={`w-3/5 aspect-square items-center justify-center ${isSelected ? 'rounded-full bg-theme-accent' : ''}`}
                >
                  <AppIcon
                    name="diary"
                    size={iconSizes.lg}
                    color={isSelected ? colors.surface : colors.accent}
                  />
                </View>
              ) : undefined}
            </CalendarDay>
          );
        })}
      </CalendarGrid>
    </View>
  );
}
