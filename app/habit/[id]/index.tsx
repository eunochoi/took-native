import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { HabitIcon } from '../../../src/components/HabitIcon';
import { InfoNotice } from '../../../src/components/InfoNotice';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import { habitQueries, useToday } from '../../../src/queries';
import { HabitMenu } from '../../../src/screens/habit/HabitMenu';
import { HabitStars } from '../../../src/screens/habit/HabitStars';
import { HabitStatistics } from '../../../src/screens/habit/HabitStatistics';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';

export default function HabitDetail() {
  const { rem: appRem } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const today = useToday();
  const query = useQuery(habitQueries.byId(db, Number(id)));
  const records = useQuery(habitQueries.completionsByHabit(db, Number(id)));
  const dates = useMemo(() => (records.data ?? []).map((record) => record.date), [records.data]);
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
                  {habit.priority === 0 ? '비정기 기록' : `별 ${habit.priority}개`}
                </Text>
                <Text className="text-sm text-theme-text-secondary">
                  {format(parseISO(habit.initial_started_at), 'yyyy년 M월 d일 HH:mm')} 시작
                </Text>
              </View>
              <HabitStatistics
                habit={habit}
                dates={dates}
                today={today}
                unavailable={records.isPending || records.isError}
              />
              {habit.priority > 0 && (
                <View className="gap-2">
                  <InfoNotice>실천 가능일은 선택 기간 내 시작일~오늘이에요.</InfoNotice>
                  <InfoNotice>실천율 = 실천 횟수 ÷ 실천 가능일 × 100</InfoNotice>
                </View>
              )}
            </>
          ) : !query.isPending && !query.error ? (
            <Text>습관을 찾을 수 없습니다.</Text>
          ) : null}
        </View>
      </BottomSheetPage>
    </>
  );
}
