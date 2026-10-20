import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
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
  const db = useSQLiteContext();
  const { colors } = useAppTheme();
  const records = useQuery(habitQueries.completions(db, shiftDate(today, -13), today));
  const stats = records.data ? getHabitFlowStats(today, habits, records.data) : null;
  const change = stats?.change == null ? null : Number(stats.change.toFixed(1));

  return (
    <BottomSheetModal visible title="습관 흐름" onClose={onClose} scrollFade contentKey={today}>
      <View className="gap-6 px-2 pb-4">
        {!stats && !records.isError && (
          <View className="min-h-64 items-center justify-center">
            <ActivityIndicator color={colors.accent} accessibilityLabel="습관 흐름 불러오는 중" />
          </View>
        )}
        {stats && (
          <>
            <View className="items-center gap-2">
              <Text className="text-base font-semibold">최근 7일 평균 완료율</Text>
              <Text className="text-sm text-theme-text-secondary">
                {format(parseISO(stats.recent.start), 'yyyy.M.d')} ~{' '}
                {format(parseISO(stats.recent.end), 'M.d')}
              </Text>
              <Text className="pt-3.5 pb-2 text-4xl font-semibold text-theme-text-secondary">
                {stats.recent.average === null
                  ? '—'
                  : `${Number(stats.recent.average.toFixed(1))}%`}
              </Text>
              <Text className="text-sm text-theme-accent">
                {change === null
                  ? '아직 이전 7일과 비교할 기록이 없어요.'
                  : change === 0
                    ? '이전 7일과 같아요.'
                    : `이전 7일보다 ${Math.abs(change)}%p ${change > 0 ? '높아요' : '낮아요'}.`}
              </Text>
              {stats.recent.eligibleDays < 7 && (
                <Text className="text-sm text-theme-text-secondary">
                  {stats.recent.eligibleDays
                    ? `습관이 시작된 ${stats.recent.eligibleDays}일 기준`
                    : '이 기간에 시작한 습관이 없어요.'}
                </Text>
              )}
            </View>
            <View className="flex-row gap-1">
              {[...stats.recent.days].reverse().map((day) => (
                <View
                  key={day.date}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={`${day.date}${day.date === today ? ', 오늘' : ''}, ${day.percent === null ? '시작한 습관 없음' : `${day.total}개 중 ${day.completed}개 완료, ${Number(day.percent.toFixed(1))}%`}`}
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
                      {format(parseISO(day.date), 'M.d')}
                    </Text>
                    <Text
                      className={`text-sm ${day.date === today ? 'text-theme-accent font-semibold' : 'text-theme-text-secondary'}`}
                    >
                      {day.date === today
                        ? '오늘'
                        : format(parseISO(day.date), 'eee', { locale: ko })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <View className="flex-row items-center justify-between gap-3 border-t border-theme-border pt-5">
              <View className="flex-1 gap-1">
                <Text className="text-base">이전 7일 평균</Text>
                <Text className="text-sm text-theme-text-secondary">
                  {format(parseISO(stats.previous.start), 'yyyy.M.d')} ~{' '}
                  {format(parseISO(stats.previous.end), 'M.d')}
                </Text>
                {stats.previous.eligibleDays < 7 && (
                  <Text className="text-sm text-theme-text-secondary">
                    {stats.previous.eligibleDays
                      ? `습관이 시작된 ${stats.previous.eligibleDays}일 기준`
                      : '시작한 습관 없음'}
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
              <InfoNotice>
                시작 전 날짜는 제외되며, 정기 기록 항목만 계산됩니다.
              </InfoNotice>
            </View>
          </>
        )}
        {records.isError && (
          <QueryError
            message={stats ? '최신 기록을 불러오지 못했어요.' : '습관 흐름을 불러오지 못했어요.'}
            onRetry={() => void records.refetch()}
            className={stats ? undefined : 'min-h-64'}
          />
        )}
      </View>
    </BottomSheetModal>
  );
}
