import { useI18n } from '../../i18n/react';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import { InfoNotice } from '../../components/InfoNotice';
import { HabitIcon } from '../../components/HabitIcon';
import type { Habit } from '../../db/types';
import { calendarDays } from '../../domain/calendar';
import { localDate } from '../../domain/date';
import type { getHabitMonthSummary } from '../../domain/habitStats';
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { CalendarDay } from '../calendar/CalendarDay';
import { CalendarGrid } from '../calendar/CalendarGrid';
import { CalendarHeader } from '../calendar/CalendarHeader';
import { HabitStatisticsSummary } from './HabitStatisticsSummary';

export function HabitMonthStatistics({
  habit,
  dates,
  month,
  onMonthChange,
  today,
  summary,
  unavailable,
}: {
  habit: Habit;
  dates: string[];
  month: string;
  onMonthChange: (month: string) => void;
  today: string;
  summary: ReturnType<typeof getHabitMonthSummary>;
  unavailable: boolean;
}) {
  const { t } = useI18n();

  const startedDate = localDate(habit.initial_started_at);
  const days = useMemo(() => calendarDays(month), [month]);
  const navigation = useCalendarNavigation(month, onMonthChange, startedDate, today);
  const swipe = useMonthSwipe(navigation.changeMonth);
  const completedDates = useMemo(() => new Set(dates), [dates]);
  return (
    <View className="gap-6">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        {t('habit.monthly')}
      </Text>
      <HabitStatisticsSummary
        stats={
          habit.priority === 0
            ? [
                {
                  label: t('habit.recordCount'),
                  icon: 'check',
                  value: summary.completed,
                  unit: t('habit.timesUnit'),
                },
                {
                  label: t('habit.averageInterval'),
                  icon: 'date',
                  value:
                    summary.averageInterval === null
                      ? '—'
                      : Number(summary.averageInterval.toFixed(1)),
                  unit: unavailable || summary.averageInterval === null ? '' : t('habit.daysUnit'),
                },
              ]
            : [
                {
                  label: t('habit.completionCount'),
                  icon: 'check',
                  value: summary.completed,
                  unit: t('habit.timesUnit'),
                },
                {
                  label: t('habit.missedCount'),
                  icon: 'close',
                  value: summary.missed,
                  unit: t('habit.timesUnit'),
                },
                {
                  label: t('habit.rate'),
                  icon: 'habit-rate',
                  value: summary.rate ?? '—',
                  unit: '%',
                },
              ]
        }
        unavailable={unavailable}
      />
      {habit.priority === 0 && <InfoNotice>{t('habit.intervalNotice')}</InfoNotice>}
      <View className="px-1">
        <CalendarHeader month={month} today={today} navigation={navigation} />
        <CalendarGrid
          {...swipe.panHandlers}
          accessibilityLabel={t('habit.calendar', { value: month })}
        >
          {days.map((date) => {
            const outside = date.slice(0, 7) !== month;
            const available = navigation.isDateAvailable(date);
            const completed = !unavailable && !outside && available && completedDates.has(date);
            const empty = !unavailable && !outside && available && !completed;
            return (
              <CalendarDay
                key={date}
                date={date}
                month={month}
                today={today}
                onMonthChange={navigation.changeToMonth}
                disabled={!outside || !available}
                dimmed={!available}
                label={`${date}${completed ? t('habit.hasRecord') : ''}${empty ? t('habit.noRecord') : ''}`}
                textClassName="font-medium"
              >
                {completed ? (
                  <View className="w-3/5 aspect-square items-center justify-center">
                    <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} />
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
