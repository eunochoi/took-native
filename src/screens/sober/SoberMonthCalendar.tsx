import { useI18n } from '../../i18n/react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { SoberIcon } from '../../components/SoberIcon';
import type { Sober } from '../../db/types';
import { localDate } from '../../domain/date';
import type { SoberAchievement } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';
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
  iconKey,
  iconColor,
  recordsByDate,
  achievements = [],
  onMonthChange,
  onSelect,
}: {
  month: string;
  today: string;
  selected: string;
  firstDate: string;
  iconKey: Sober['icon_key'];
  iconColor: Sober['icon_color'];
  recordsByDate: Map<string, SoberRestart[]>;
  achievements?: SoberAchievement[];
  onMonthChange: (month: string) => void;
  onSelect: (date: string) => void;
}) {
  const { t } = useI18n();

  const { colors, iconSizes } = useAppTheme();
  const achievementDates = useMemo(() => {
    const result = new Map<string, number[]>();
    for (const item of achievements) {
      const date = localDate(item.achievedAt);
      result.set(date, [...(result.get(date) ?? []), item.days]);
    }
    return result;
  }, [achievements]);
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, firstDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  return (
    <View className="gap-4 border-t border-theme-border pt-8">
      <View className="flex-row items-center gap-2">
        <Text
          accessibilityRole="header"
          className="text-lg leading-6 font-semibold text-theme-text-primary"
        >
          {t('sober.monthly')}
        </Text>
      </View>
      <View className="px-1 gap-4">
        <CalendarHeader detail month={month} today={today} navigation={navigation} />
        <CalendarGrid
          {...swipe.panHandlers}
          accessibilityLabel={t('sober.monthLabel', { value: month })}
        >
          {days.map((date) => {
            const outside = date.slice(0, 7) !== month;
            const unavailable = !navigation.isDateAvailable(date);
            const hasRestart = !outside && !unavailable && !!recordsByDate.get(date)?.length;
            // Keep earned milestones in the data, but prioritize restarts on the same date.
            const goals =
              outside || unavailable || hasRestart ? [] : (achievementDates.get(date) ?? []);
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
                  ...goals.map((days) => t('sober.achievement', { count: days })),
                  hasRestart
                    ? t('sober.restartDay')
                    : !outside && !unavailable
                      ? t('sober.withoutRestart')
                      : '',
                ]
                  .filter(Boolean)
                  .join(', ')}
                textClassName="font-medium"
              >
                {goals.length > 0 ? (
                  <View className="w-3/5 aspect-square items-center justify-center">
                    <AppIcon name="auto-awesome" size={iconSizes.lg} color={colors.achievement} />
                  </View>
                ) : hasRestart ? (
                  <View className="w-3/5 aspect-square items-center justify-center">
                    <SoberIcon name={iconKey} colorKey={iconColor} />
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
