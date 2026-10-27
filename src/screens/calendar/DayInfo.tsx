import { useI18n } from '../../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { ActivityIndicator, View } from 'react-native';
import { EmotionImage } from '../../components/EmotionImage';
import { useNotice } from '../../components/NoticeProvider';
import { QueryError } from '../../components/QueryError';
import { setHabitCompletion, sortHabits } from '../../db/habit';
import { dayHabits } from '../../domain/calendar';
import { diaryQueries, habitQueries, useRecordMutation } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { CalendarHabitProgress } from './CalendarHabitProgress';
import { DayInfoDiarySection } from './DayInfoDiarySection';
import { DayInfoHabitSection } from './DayInfoHabitSection';

export function DayInfo({ date, today }: { date: string; today: string }) {
  const { t } = useI18n();

  const { showNotice } = useNotice();
  const { colors } = useAppTheme();
  const db = useSQLiteContext();
  const diary = useQuery(diaryQueries.detailByDate(db, date));
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, date, date));
  const mutation = useRecordMutation(
    ({ id, date: targetDate, checked }: { id: number; date: string; checked: boolean }) =>
      setHabitCompletion(db, id, targetDate, checked),
    'habitCompletion',
    undefined,
    (error) =>
      showNotice({ tone: 'error', title: t('diary.processFailed'), message: error.message }),
  );
  const pending = diary.isPending || habits.isPending || completions.isPending;
  const error = diary.isError || habits.isError || completions.isError;
  const rows = sortHabits(dayHabits(habits.data ?? [], completions.data ?? [], date, today), {
    habitSort: 'DESC',
    habitPriorityFirst: true,
    habitOrder: [],
  });
  return (
    <View className="gap-3">
      {error ? (
        <QueryError
          className="min-h-32"
          message={t('calendar.recordsFailed')}
          onRetry={() => {
            void diary.refetch();
            void habits.refetch();
            void completions.refetch();
          }}
        />
      ) : pending ? (
        <View className="min-h-32 items-center justify-center">
          <ActivityIndicator
            accessibilityLabel={t('calendar.recordsLoading')}
            color={colors.accent}
          />
        </View>
      ) : (
        <View className="gap-6">
          {diary.data && (
            <View className="w-16 self-center gap-2">
              <View className="h-16 w-full">
                <EmotionImage emotion={diary.data.emotion} fill />
              </View>
              <View className="px-2">
                <CalendarHabitProgress
                  done={rows.filter((habit) => habit.priority > 0 && habit.completed).length}
                  total={rows.filter((habit) => habit.priority > 0).length}
                />
              </View>
            </View>
          )}
          <DayInfoDiarySection
            key={`diary-${date}`}
            date={date}
            today={today}
            diary={diary.data ?? null}
          />
          <DayInfoHabitSection
            key={`habit-${date}`}
            date={date}
            today={today}
            habits={rows}
            pendingId={mutation.isPending ? mutation.variables.id : null}
            onToggle={(id, checked) => {
              if (!mutation.isPending) mutation.mutate({ id, date, checked });
            }}
          />
        </View>
      )}
    </View>
  );
}
