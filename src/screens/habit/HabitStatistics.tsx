import { localDate } from '../../domain/date';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import type { Habit } from '../../db/types';
import { getHabitMonthSummary, getHabitYearSummary } from '../../domain/habitStats';
import { HabitMonthCalendar } from './HabitMonthCalendar';
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
  const startedDate = localDate(habit.initial_started_at);
  const summary = useMemo(
    () => getHabitMonthSummary(month, startedDate, dates, today),
    [month, startedDate, dates, today],
  );
  const yearly = useMemo(
    () => getHabitYearSummary(year, dates, startedDate),
    [year, dates, startedDate],
  );
  const max = Math.max(...yearly.monthly, 1);
  return (
    <>
      <HabitMonthCalendar
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
