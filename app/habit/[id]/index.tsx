import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useNotice } from '../../../src/components/NoticeProvider';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { HabitIcon } from '../../../src/components/HabitIcon';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import { setHabitCompletion } from '../../../src/db/habit';
import { habitQueries, useRecordMutation, useToday } from '../../../src/queries';
import { HabitMenu } from '../../../src/screens/habit/HabitMenu';
import { HabitStars } from '../../../src/screens/habit/HabitStars';
import { HabitStatistics } from '../../../src/screens/habit/HabitStatistics';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';

export default function HabitDetail() {
  const { showNotice } = useNotice();
  const { rem: appRem } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const today = useToday();
  const query = useQuery(habitQueries.byId(db, Number(id)));
  const records = useQuery(habitQueries.completionsByHabit(db, Number(id)));
  const dates = useMemo(() => (records.data ?? []).map((record) => record.date), [records.data]);
  const mutation = useRecordMutation(
    ({ date, checked }: { date: string; checked: boolean }) =>
      setHabitCompletion(db, Number(id), date, checked),
    'habitCompletion',
    undefined,
    (error) => showNotice({ tone: 'error', title: '처리하지 못했어요', message: error.message }),
  );
  const habit = query.data;
  return (
    <>
      <BottomSheetPage
        backRoute="/habit"
        title={habit?.name ?? '습관 정보'}
        menuAction={
          habit ? (
            <HabitMenu habit={habit} onDeleted={() => router.dismissTo('/habit')} />
          ) : undefined
        }
      >
        <View className="gap-12">
          <QueryState query={query} />
          <QueryState query={records} />
          {habit ? (
            <>
              <View className="gap-4 justify-center items-center">
                <View className="items-center gap-4">
                  <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 3} />
                </View>
                <HabitStars priority={habit.priority} size={appRem * 1.3} />
                <Text className="text-sm text-theme-text-secondary">
                  {format(parseISO(habit.initial_started_at), 'yyyy년 M월 d일 HH:mm')} 시작
                </Text>
              </View>
              <HabitStatistics
                habit={habit}
                dates={dates}
                today={today}
                disabled={mutation.isPending || records.isPending || records.isError}
                unavailable={records.isPending || records.isError}
                onToggle={(date, checked) => mutation.mutate({ date, checked })}
              />
              <View className="rounded-theme p-4 gap-3 bg-theme-accent-light">
                <View className="gap-1">
                  <Text className="text-base leading-5 font-semibold text-theme-accent">
                    실천 가능일
                  </Text>
                  <Text className="text-sm leading-5 text-theme-accent">
                    해당 기간에서 시작일 이전과 미래를 제외한 날짜
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-base leading-5 font-semibold text-theme-accent">
                    실천율
                  </Text>
                  <Text className="text-sm leading-5 text-theme-accent">
                    실천 횟수 ÷ 실천 가능일 × 100
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-base leading-5 font-semibold text-theme-accent">
                    놓친 횟수
                  </Text>
                  <Text className="text-sm leading-5 text-theme-accent">
                    최근 4일을 제외한 미실천 횟수
                  </Text>
                </View>
              </View>
            </>
          ) : !query.isPending && !query.error ? (
            <Text>습관을 찾을 수 없습니다.</Text>
          ) : null}
        </View>
      </BottomSheetPage>
    </>
  );
}
