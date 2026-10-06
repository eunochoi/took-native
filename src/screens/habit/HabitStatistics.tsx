import { useAppTheme } from '../../theme/AppThemeProvider';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { getDay, parseISO } from 'date-fns';
import type { Habit } from '../../db/types';
import { getHabitMonthSummary, getHabitYearSummary } from '../../domain/habitStats';
import { canCheckHabit, shiftDate } from '../../domain/date';
import { MonthCalendar } from '../calendar/MonthCalendar';
import { CalendarDay } from '../calendar/CalendarDay';
import { Text } from '../../components/Text';

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
  const { colors, iconSizes } = useAppTheme();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const completedDates = useMemo(() => new Set(dates), [dates]);
  const summary = useMemo(
    () => getHabitMonthSummary(month, habit.created_date, dates, today),
    [month, habit.created_date, dates, today],
  );
  const yearly = useMemo(() => getHabitYearSummary(year, dates), [year, dates]);
  const max = Math.max(...yearly.monthly, 1);
  const lockedBefore = shiftDate(today, -3);
  return (
    <>
      <MonthCalendar
        headerTitle="월별 기록"
        month={month}
        onMonthChange={setMonth}
        selected={today}
        today={today}
        canSelect={(date) =>
          !disabled &&
          (date.startsWith(month)
            ? canCheckHabit(date, habit.created_date, today)
            : date >= '1900-01-01' && date <= '2100-12-31')
        }
        onSelect={(date) => {
          if (!date.startsWith(month)) setMonth(date.slice(0, 7));
          else onToggle(date, !completedDates.has(date));
        }}
        headerContent={
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
                  <Text className="text-sm font-semibold text-theme-text-secondary">
                    {' '}
                    {stat.unit}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        }
        renderDay={(day) => {
          const completed = !day.outside && completedDates.has(day.date);
          const missed =
            !day.outside && day.date >= habit.created_date && day.date < lockedBefore && !completed;
          const weekday = getDay(parseISO(day.date));
          return (
            <CalendarDay
              {...day}
              selected={false}
              label={`${day.date}${completed ? ', 완료 기록 있음' : ''}${missed ? ', 놓친 횟수' : ''}`}
            >
              <View
                className={`w-3/5 aspect-square items-center justify-center ${completed ? 'rounded-full bg-theme-accent' : missed ? 'rounded-full bg-theme-calendar-sunday' : ''}`}
              >
                <Text
                  className={`text-xs ${completed || missed ? 'text-theme-text-on-accent' : weekday === 6 ? 'text-theme-calendar-saturday' : weekday === 0 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`}
                >
                  {Number(day.date.slice(-2))}
                </Text>
              </View>
            </CalendarDay>
          );
        }}
      />
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-1">
          <Text accessibilityRole="header" className="text-xl font-bold">
            연도별 기록
          </Text>
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 연도"
              disabled={year <= 1900}
              onPress={() => setYear(year - 1)}
              className="h-9 w-8 items-center justify-center"
            >
              <AppIcon name="chevron-left" size={iconSizes.lg} color={colors.accent} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${year}년, 올해로 이동`}
              onPress={() => setYear(Number(today.slice(0, 4)))}
              className="px-1 py-2"
            >
              <Text className="text-sm font-medium text-theme-accent">{year}년</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 연도"
              disabled={year >= 2100}
              onPress={() => setYear(year + 1)}
              className="h-9 w-8 items-center justify-center"
            >
              <AppIcon name="chevron-right" size={iconSizes.lg} color={colors.accent} />
            </Pressable>
          </View>
        </View>
        <View className="flex-row py-3">
          {[
            { label: '실천 횟수', value: yearly.completed, unit: '회' },
            {
              label: '실천율',
              value: yearly.rate,
              unit: '%',
            },
          ].map((stat, index) => (
            <View
              key={stat.label}
              className={`flex-1 gap-1 px-2 items-center ${index ? 'border-l border-theme-border/60' : ''}`}
            >
              <Text className="text-sm text-theme-text-secondary">{stat.label}</Text>
              <Text className="text-2xl font-bold text-theme-accent">
                {unavailable ? '—' : stat.value}
                <Text className="text-sm font-semibold text-theme-text-secondary">
                  {' '}
                  {stat.unit}
                </Text>
              </Text>
            </View>
          ))}
        </View>
        <View className="py-4">
          <View className="min-h-[200px] flex-row items-end">
            {yearly.monthly.map((count, index) => (
              <View key={index} className="flex-1 min-w-0 items-center gap-1.5">
                <View className="h-[178px] w-full items-center justify-end gap-1.5">
                  <Text className="min-h-[18px] text-sm text-theme-text-tertiary">
                    {count > 0 ? count : ''}
                  </Text>
                  <View
                    className={`w-3/5 max-w-5 rounded-[3px] ${count > 0 ? 'bg-theme-accent' : 'bg-theme-text-primary/15'}`}
                    style={{ height: count ? Math.max((count / max) * 160, 8) : 4 }}
                  />
                </View>
                <Text className="text-sm text-theme-text-tertiary">{index + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </>
  );
}
