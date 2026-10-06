import { useMemo, useState } from 'react';
import { AlertModal, type AlertContent } from '../../../src/components/AlertModal';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';
import { useScrollFade } from '../../../src/hooks/useScrollFade';
import { ScrollEdgeFade } from '../../../src/components/ScrollEdgeFade';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { habitQueries, useRecordMutation, useToday } from '../../../src/queries';
import { setHabitCompletion } from '../../../src/db/habit';
import { RecordHeader } from '../../../src/components/RecordHeader';
import { HabitMenu } from '../../../src/screens/habit/HabitMenu';
import { HabitStars } from '../../../src/screens/habit/HabitStars';
import { HabitStatistics } from '../../../src/screens/habit/HabitStatistics';
import { Text } from '../../../src/components/Text';
import { HabitIcon } from '../../../src/components/HabitIcon';
import { QueryState } from '../../../src/components/QueryState';

export default function HabitDetail() {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { rem: appRem } = useAppTheme();
  const fade = useScrollFade();
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
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  const habit = query.data;
  return (
    <View className="flex-1 bg-theme-surface">
      <RecordHeader
        backRoute="/habit"
        title={habit?.name ?? '습관 정보'}
        rightAction={
          habit ? <HabitMenu habit={habit} onDeleted={() => router.replace('/habit')} /> : undefined
        }
      />
      <View className="flex-1">
        <ScrollView
          onScroll={fade.onScroll}
          onLayout={fade.onLayout}
          onContentSizeChange={fade.onContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-12 pt-6 pb-screen-content-bottom"
          contentContainerStyle={{ paddingHorizontal: '5%' }}
        >
          <QueryState query={query} />
          <QueryState query={records} />
          {habit ? (
            <>
              <View className="gap-4">
                <View className="items-center gap-4">
                  <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 3} />
                </View>
                <View className="items-center gap-y-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm text-theme-text-secondary">우선순위</Text>
                    <HabitStars priority={habit.priority} size={appRem} />
                  </View>
                  <Text className="text-sm text-theme-text-secondary">
                    생성일 {format(parseISO(habit.created_date), 'yyyy년 M월 d일')}
                  </Text>
                </View>
              </View>
              <HabitStatistics
                habit={habit}
                dates={dates}
                today={today}
                disabled={mutation.isPending || records.isPending || records.isError}
                unavailable={records.isPending || records.isError}
                onToggle={(date, checked) => mutation.mutate({ date, checked })}
              />
            </>
          ) : !query.isPending && !query.error ? (
            <Text>습관을 찾을 수 없습니다.</Text>
          ) : null}
        </ScrollView>
        <ScrollEdgeFade edge="top" visible={fade.topVisible} tone="surface" />
        <ScrollEdgeFade
          edge="bottom"
          visible={fade.bottomVisible}
          tone="surface"
          includeBottomInset={false}
        />
      </View>
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </View>
  );
}
