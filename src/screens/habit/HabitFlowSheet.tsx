import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { InfoNotice } from '../../components/InfoNotice';
import { QueryError } from '../../components/QueryError';
import { Text } from '../../components/Text';
import type { Habit } from '../../db/types';
import { shiftDate } from '../../domain/date';
import { getHabitFlowStats } from '../../domain/habitStats';
import { habitQueries } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { PROGRESS_FILL_CLASS_NAME, PROGRESS_TRACK_CLASS_NAME } from '../../theme/classes';

export function HabitFlowSheet({
  today,
  habits,
  onClose,
}: {
  today: string;
  habits: Pick<Habit, 'id' | 'initial_started_at' | 'priority'>[];
  onClose: () => void;
}) {
  const { t, formatLocale } = useI18n();

  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const records = useQuery(habitQueries.completions(db, shiftDate(today, -13), today));
  const stats = records.data ? getHabitFlowStats(today, habits, records.data) : null;
  const change = stats?.change == null ? null : Number(stats.change.toFixed(1));

  return (
    <BottomSheetModal
      visible
      title={t('habit.flow')}
      onClose={onClose}
      scrollFade
      contentKey={today}
    >
      <View className="gap-6 px-2 pb-4">
        {!stats && !records.isError && (
          <View className="min-h-64 items-center justify-center">
            <ActivityIndicator color={colors.accent} accessibilityLabel={t('habit.flowLoading')} />
          </View>
        )}
        {stats && (
          <>
            <View className="items-center gap-2">
              <Text className="text-base font-semibold">{t('habit.lastSevenAverage')}</Text>
              <Text className="text-sm text-theme-text-secondary">
                {formatDisplayDate(stats.recent.start, formatLocale, 'compact')} ~{' '}
                {formatDisplayDate(stats.recent.end, formatLocale, 'compactDay')}
              </Text>
              <Text className="pt-3.5 pb-2 text-4xl font-semibold text-theme-text-secondary">
                {stats.recent.average === null
                  ? '—'
                  : `${Number(stats.recent.average.toFixed(1))}%`}
              </Text>
              <Text className="text-sm text-theme-accent">
                {change === null
                  ? t('habit.noComparison')
                  : change === 0
                    ? t('habit.sameComparison')
                    : t('habit.compared', {
                        count: Math.abs(change),
                        value: change > 0 ? t('habit.higher') : t('habit.lower'),
                      })}
              </Text>
              {stats.recent.eligibleDays < 7 && (
                <Text className="text-sm text-theme-text-secondary">
                  {stats.recent.eligibleDays
                    ? t('habit.eligibleDays', { count: stats.recent.eligibleDays })
                    : t('habit.noneStartedPeriod')}
                </Text>
              )}
            </View>
            <View className="flex-row gap-1">
              {[...stats.recent.days].reverse().map((day) => (
                <View
                  key={day.date}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={t('habit.flowDay', {
                    title: `${day.date}${day.date === today ? `, ${t('calendar.today')}` : ''}`,
                    value:
                      day.percent === null
                        ? t('habit.noneStarted')
                        : t('habit.completionSummary', {
                            value: day.total,
                            count: day.completed,
                            setting: Number(day.percent.toFixed(1)),
                          }),
                  })}
                  className="min-w-0 flex-1 items-center gap-2"
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    className="h-5 w-full text-center text-sm leading-5 text-theme-text-secondary"
                  >
                    {day.percent === null ? '—' : `${Number(day.percent.toFixed(1))}%`}
                  </Text>
                  <View
                    className={`h-32 w-[70%] justify-end rounded-lg ${PROGRESS_TRACK_CLASS_NAME}`}
                  >
                    <View
                      className={`w-full ${PROGRESS_FILL_CLASS_NAME}`}
                      style={{ height: `${day.percent ?? 0}%` }}
                    />
                  </View>
                  <View className="items-center gap-1">
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      className={`mx-1 text-sm ${day.date === today ? 'text-theme-accent font-semibold' : 'text-theme-text-secondary'}`}
                    >
                      {formatDisplayDate(day.date, formatLocale, 'compactDay')}
                    </Text>
                    <Text
                      className={`text-sm ${day.date === today ? 'text-theme-accent font-semibold' : 'text-theme-text-secondary'}`}
                    >
                      {day.date === today
                        ? t('calendar.today')
                        : formatDisplayDate(day.date, formatLocale, 'weekdayShort')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="flex-row items-center justify-between gap-3 border-t border-theme-border pt-5">
              <View className="flex-1 gap-1">
                <Text className="text-base">{t('habit.previousAverage')}</Text>
                <Text className="text-sm text-theme-text-secondary">
                  {formatDisplayDate(stats.previous.start, formatLocale, 'compact')} ~{' '}
                  {formatDisplayDate(stats.previous.end, formatLocale, 'compactDay')}
                </Text>
                {stats.previous.eligibleDays < 7 && (
                  <Text className="text-sm text-theme-text-secondary">
                    {stats.previous.eligibleDays
                      ? t('habit.eligibleDays', { count: stats.previous.eligibleDays })
                      : t('habit.noneStarted')}
                  </Text>
                )}
              </View>
              <Text className="text-xl font-semibold text-theme-text-secondary">
                {stats.previous.average === null
                  ? '—'
                  : `${Number(stats.previous.average.toFixed(1))}%`}
              </Text>
            </View>
            <View className="gap-2">
              <InfoNotice>{t('habit.flowNotice')}</InfoNotice>
            </View>
          </>
        )}
        {records.isError && (
          <QueryError
            message={stats ? t('habit.latestFailed') : t('habit.flowFailed')}
            onRetry={() => void records.refetch()}
            className={stats ? undefined : 'min-h-64'}
          />
        )}
      </View>
    </BottomSheetModal>
  );
}
