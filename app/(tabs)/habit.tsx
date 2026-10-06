import { AppIcon } from '../../src/components/AppIcon';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';
import { EmptyState } from '../../src/components/EmptyState';
import { ColorView } from '../../src/components/ColorTransition';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { AlertModal, type AlertContent } from '../../src/components/AlertModal';
import { RecordSortPicker } from '../../src/components/RecordSortPicker';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { setHabitCompletion, sortHabits } from '../../src/db/habit';
import { shiftDate } from '../../src/domain/date';
import { MAX_HABIT_COUNT } from '../../src/domain/limits';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { habitQueries, useRecordMutation, useToday } from '../../src/queries';
import { HabitBox } from '../../src/screens/habit/HabitBox';
import { HabitListSkeleton } from '../../src/screens/habit/HabitListSkeleton';
import { HabitTodayProgress } from '../../src/screens/habit/HabitTodayProgress';
import { Toolbar } from '../../src/components/Toolbar';
import { ToolbarSortButton } from '../../src/components/ToolbarSortButton';
import { ToolbarAddButton } from '../../src/components/ToolbarAddButton';
import { HabitTopSection } from '../../src/screens/habit/HabitTopSection';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';

export default function HabitList() {
  const [sortOpen, setSortOpen] = useState(false);
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const fade = useScrollFade();
  const router = useRouter();
  const today = useToday();
  const scroll = useRef<ScrollView>(null);
  useScrollToTop(scroll);
  const { settings, updateSettings } = useSettings();
  const list = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, shiftDate(today, -3), today));
  const mutation = useRecordMutation(
    ({ id, date, checked }: { id: number; date: string; checked: boolean }) =>
      setHabitCompletion(db, id, date, checked),
    'habitCompletion',
    undefined,
    (error) => setAlert({ title: '처리하지 못했어요', message: error.message }),
  );
  const pending = useRef(new Set<number>());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const toggle = (id: number, date: string, checked: boolean) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setPendingIds(new Set(pending.current));
    // Each call owns its promise: a later mutation must not unlock an earlier habit.
    void mutation
      .mutateAsync({ id, date, checked })
      .catch(() => undefined) // The local mutation error handler displays the notice.
      .finally(() => {
        pending.current.delete(id);
        if (mounted.current) setPendingIds(new Set(pending.current));
      });
  };
  const sorted = sortHabits(list.data ?? [], settings);
  const ready = !!list.data && !!completions.data;
  const done = (completions.data ?? []).filter((item) => item.date === today).length;
  const change = (values: Parameters<typeof updateSettings>[0]) => {
    void updateSettings(values)
      .then(() => scroll.current?.scrollTo({ y: 0, animated: true }))
      .catch((error: Error) => setAlert({ title: '설정 저장 실패', message: error.message }));
  };
  const failed = list.isError || completions.isError;
  const gridItems = ready ? [...sorted, ...(sorted.length % 2 ? [null] : [])] : [];
  const emptyContent = failed ? (
    <View className="min-h-64 items-center justify-center gap-3">
      <Text className="text-theme-text-secondary">습관 목록을 불러오지 못했어요.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void list.refetch();
          void completions.refetch();
        }}
      >
        <Text className="text-theme-accent">다시 시도</Text>
      </Pressable>
    </View>
  ) : !ready ? (
    <HabitListSkeleton />
  ) : (
    <EmptyState
      icon={<AppIcon name="habit" size={appRem * 1.875} color={colors.accent} />}
      title="아직 만든 습관이 없어요."
      description="작은 목표 하나부터 만들어 보아요."
    />
  );
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <ScrollView
        ref={scroll}
        onScroll={fade.onScroll}
        onLayout={fade.onLayout}
        onContentSizeChange={fade.onContentSizeChange}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        <HabitTopSection>
          <Toolbar>
            <ToolbarSortButton
              sort={settings.habitSort}
              priorityFirst={settings.habitPriorityFirst}
              accessibilityLabel="습관 정렬"
              onPress={() => setSortOpen(true)}
            />
            <ToolbarAddButton
              disabled={!list.data || sorted.length >= MAX_HABIT_COUNT}
              onPress={() => router.push('/habit/new')}
            />
          </Toolbar>
        </HabitTopSection>
        <FlatList
          data={gridItems}
          numColumns={2}
          keyExtractor={(_habit, index) => String(index)}
          scrollEnabled={false}
          initialNumToRender={MAX_HABIT_COUNT}
          removeClippedSubviews={false}
          contentContainerClassName="pt-8"
          contentContainerStyle={{ paddingHorizontal: '5%' }}
          ListHeaderComponent={
            ready && sorted.length > 0 ? (
              <HabitTodayProgress done={done} total={sorted.length} />
            ) : null
          }
          ListEmptyComponent={emptyContent}
          renderItem={({ item, index }) => (
            <View
              className={`w-1/2 border-theme-border/60 ${index < gridItems.length - 2 ? 'border-b' : 'border-b-0'} ${index % 2 === 0 ? 'border-r' : 'border-r-0'}`}
            >
              {item && (
                <HabitBox
                  key={item.id}
                  habit={item}
                  today={today}
                  records={completions.data ?? []}
                  disabled={pendingIds.has(item.id) || failed}
                  onToggle={toggle}
                />
              )}
            </View>
          )}
          ListFooterComponent={
            ready && failed ? (
              <View className="py-4 items-center gap-2">
                <Text className="text-sm text-theme-text-secondary">
                  습관 목록을 불러오지 못했어요.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void list.refetch();
                    void completions.refetch();
                  }}
                >
                  <Text className="text-theme-accent">다시 시도</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
        <TabBottomSpacer />
      </ScrollView>
      <ScrollEdgeFade edge="top" visible={fade.topVisible} />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {sortOpen && (
        <RecordSortPicker
          title="습관 정렬"
          sort={settings.habitSort}
          priorityFirst={settings.habitPriorityFirst}
          allowCustom
          onClose={() => setSortOpen(false)}
          onApply={(sort, priorityFirst) => {
            setSortOpen(false);
            change({ habitSort: sort, habitPriorityFirst: priorityFirst });
          }}
        />
      )}
      <AlertModal
        visible={alert !== null}
        title={alert?.title ?? ''}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </ColorView>
  );
}
