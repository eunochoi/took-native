import { getHabitDaySummary } from '../../domain/habitStats';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { Completion, Habit } from '../../db/types';
import { shiftDate } from '../../domain/date';
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
  const { colors, rem: appRem } = useAppTheme();
  const days = Array.from({ length: 4 }, (_, index) => {
    const date = shiftDate(today, -index);
    return { date, ...getHabitDaySummary(date, habits, records) };
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="습관 흐름 상세보기"
      accessibilityHint="최근 7일 완료율과 이전 7일 비교를 확인해요."
      onPress={onPress}
      className="flex-1 gap-4 bg-theme-surface px-2 py-4 active:opacity-65"
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
            습관 흐름
          </Text>
        </View>
        <Text className="h-5 text-sm leading-5 text-center text-theme-text-secondary">
          최근 4일
        </Text>
      </View>
      <View className="flex-row justify-around">
        {days.map(({ date, total, completed, percent }) => {
          return (
            <View
              key={date}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${date}${date === today ? ', 오늘' : ''}, ${total ? `${total}개 중 ${completed}개 완료, ${Math.round(percent ?? 0)}%` : '시작한 습관 없음'}`}
              className="flex-1 min-w-0 items-center gap-1 px-1"
            >
              <Text
                className={twMerge(
                  date === today ? 'text-theme-accent' : 'text-theme-text-secondary',
                  'h-5 text-sm leading-5',
                )}
              >
                {date === today ? '오늘' : format(parseISO(date), 'eee', { locale: ko })}
              </Text>
              <View className={`h-12 w-[70%] justify-end rounded-lg ${PROGRESS_TRACK_CLASS_NAME}`}>
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
