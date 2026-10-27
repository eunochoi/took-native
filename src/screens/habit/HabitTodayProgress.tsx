import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { Completion, Habit } from '../../db/types';
import { shiftDate } from '../../domain/date';
import { getHabitDaySummary } from '../../domain/habitStats';
import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { PROGRESS_FILL_CLASS_NAME, PROGRESS_TRACK_CLASS_NAME } from '../../theme/classes';

export function HabitTodayProgress({
  today,
  habits,
  records,
  onPress,
}: {
  today: string;
  habits: Pick<Habit, 'id' | 'initial_started_at' | 'priority'>[];
  records: Pick<Completion, 'habit_id' | 'date'>[];
  onPress: () => void;
}) {
  const { t, formatLocale } = useI18n();

  const { colors, rem: appRem } = useAppTheme();
  const days = Array.from({ length: 4 }, (_, index) => {
    const date = shiftDate(today, -index);
    return { date, ...getHabitDaySummary(date, habits, records) };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('habit.flowLink')}
      accessibilityHint={t('habit.flowHint')}
      onPress={onPress}
      className="flex-1 gap-4 bg-theme-surface px-2 py-5 active:opacity-65"
    >
      <View>
        <View className="items-center gap-2 mb-2">
          <View
            className="items-center justify-center"
            style={{ width: appRem * 1.875, height: appRem * 1.875 }}
          >
            <AppIcon name="habit-flow" size={appRem * 1.875} color={colors.accent} />
          </View>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className="text-base text-center font-semibold"
          >
            {t('habit.flow')}
          </Text>
        </View>
        <Text className="h-5 text-sm leading-5 text-center text-theme-text-secondary">
          {t('habit.lastFour')}
        </Text>
      </View>
      <View className="flex-row justify-around">
        {days.map(({ date, total, completed, percent }) => {
          return (
            <View
              key={date}
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('habit.flowDay', {
                title: `${date}${date === today ? `, ${t('calendar.today')}` : ''}`,
                value: total
                  ? t('habit.completionSummary', {
                      value: total,
                      count: completed,
                      setting: Math.round(percent ?? 0),
                    })
                  : t('habit.noneStarted'),
              })}
              className="flex-1 min-w-0 items-center gap-1"
            >
              <Text
                className={twMerge(
                  date === today ? 'text-theme-accent' : 'text-theme-text-secondary',
                  'h-5 text-sm leading-5',
                )}
              >
                {date === today
                  ? t('calendar.today')
                  : formatDisplayDate(date, formatLocale, 'weekdayShort')}
              </Text>
              <View className={`h-12 w-5 justify-end rounded-lg ${PROGRESS_TRACK_CLASS_NAME}`}>
                {total ? (
                  <View
                    className={`w-full ${PROGRESS_FILL_CLASS_NAME}`}
                    style={{ height: `${percent ?? 0}%` }}
                  />
                ) : (
                  <Text className="text-sm text-center text-theme-text-disabled">–</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}
