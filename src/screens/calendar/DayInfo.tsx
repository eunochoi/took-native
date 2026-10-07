import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { QueryError } from '../../components/QueryError';
import { AlertModal, type AlertContent } from '../../components/AlertModal';
import { setHabitCompletion, sortHabits } from '../../db/habit';
import { dayHabits } from '../../domain/calendar';
import { diaryQueries, habitQueries, useRecordMutation } from '../../queries';
import { useSettings } from '../../settings/SettingsProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { DayInfoDiarySection } from './DayInfoDiarySection';
import { DayInfoHabitSection } from './DayInfoHabitSection';

export function DayInfo({ date, today }: { date: string; today: string }) {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors } = useAppTheme();
  const { settings } = useSettings();
  const db = useSQLiteContext();
  const diary = useQuery(diaryQueries.detailByDate(db, date));
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, date, date));
  const mutation = useRecordMutation(
    ({ id, date: targetDate, checked }: { id: number; date: string; checked: boolean }) =>
      setHabitCompletion(db, id, targetDate, checked),
    'habitCompletion',
    undefined,
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  const pending = diary.isPending || habits.isPending || completions.isPending;
  const error = diary.isError || habits.isError || completions.isError;
  const rows = sortHabits(
    dayHabits(habits.data ?? [], completions.data ?? [], date, today),
    settings,
  );
  return (
    <View className="gap-3">
      {error ? (
        <QueryError
          className="min-h-32"
          message="기록을 불러오지 못했어요."
          onRetry={() => {
            void diary.refetch();
            void habits.refetch();
            void completions.refetch();
          }}
        />
      ) : pending ? (
        <View className="min-h-32 items-center justify-center">
          <ActivityIndicator
            accessibilityLabel="선택 날짜 기록 불러오는 중"
            color={colors.accent}
          />
        </View>
      ) : (
        <View className="gap-6">
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
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </View>
  );
}
