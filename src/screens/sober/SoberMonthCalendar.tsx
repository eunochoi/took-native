import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import type { SoberRestart } from '../../db/types';
import { calendarDays } from '../../domain/calendar';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { CalendarDay } from '../calendar/CalendarDay';
import { CalendarGrid } from '../calendar/CalendarGrid';
import { CalendarHeader } from '../calendar/CalendarHeader';

export function SoberMonthCalendar({
  month,
  today,
  selected,
  firstDate,
  recordsByDate,
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  firstDate: string;
  recordsByDate: Map<string, SoberRestart[]>;
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, firstDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        월간 기록
      </Text>
      <View className="px-2 gap-4">
        <CalendarHeader month={month} today={today} navigation={navigation} />
        <CalendarGrid {...swipe.panHandlers} accessibilityLabel={`${month} 거리두기 기록 달력`}>
          {days.map((date) => {
            const outside = date.slice(0, 7) !== month;
            const unavailable = !navigation.isDateAvailable(date);
            const count = outside || unavailable ? 0 : (recordsByDate.get(date)?.length ?? 0);
            const noRestart = !outside && !unavailable && count === 0;
            return (
              <CalendarDay
                key={date}
                date={date}
                month={month}
                today={today}
                selected={selected}
                showSelectedIndicator={false}
                disabled={unavailable}
                dimmed={unavailable}
                onSelect={onSelect}
                label={[
                  date,
                  count
                    ? `다시 시작 ${count}회`
                    : !outside && !unavailable
                      ? '리셋 없이 지낸 날'
                      : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                contentClassName={noRestart ? 'rounded-full bg-theme-calendar-empty' : undefined}
                textClassName="font-medium"
              >
                {count > 0 ? (
                  <View className="w-3/5 aspect-square items-center justify-center rounded-full bg-theme-accent">
                    <Text className="text-xs font-medium text-theme-text-on-accent">{count}</Text>
                  </View>
                ) : undefined}
              </CalendarDay>
            );
          })}
        </CalendarGrid>
      </View>
    </View>
  );
}
