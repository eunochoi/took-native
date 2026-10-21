import { useQuery } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { EmptyState } from '../../src/components/EmptyState';
import { useNotice } from '../../src/components/NoticeProvider';
import { PageTopSection } from '../../src/components/PageTopSection';
import { QueryError } from '../../src/components/QueryError';
import { RecordSortPicker } from '../../src/components/RecordSortPicker';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { ToolbarAddButton } from '../../src/components/ToolbarAddButton';
import { ToolbarFilterButton } from '../../src/components/ToolbarFilterButton';
import { ToolbarSortButton } from '../../src/components/ToolbarSortButton';
import { setHabitCompletion, sortHabits } from '../../src/db/habit';
import { shiftDate } from '../../src/domain/date';
import { MAX_HABIT_COUNT } from '../../src/domain/limits';
import { selectionSummary } from '../../src/domain/selection';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { habitQueries, useRecordMutation, useToday } from '../../src/queries';
import { HabitBox } from '../../src/screens/habit/HabitBox';
import { DEFAULT_HABIT_FILTER, HabitFilterPicker } from '../../src/screens/habit/HabitFilterPicker';
import { HabitFlowSheet } from '../../src/screens/habit/HabitFlowSheet';
import { HabitListSkeleton } from '../../src/screens/habit/HabitListSkeleton';
import { HabitTodayProgress } from '../../src/screens/habit/HabitTodayProgress';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

export default function HabitList() {
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [flowOpen, setFlowOpen] = useState(false);
  const [filter, setFilter] = useState(DEFAULT_HABIT_FILTER);
  const { showNotice } = useNotice();
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const fade = useScrollFade();
  const { openModal } = useModalNavigation();
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
    (error) => showNotice({ tone: 'error', title: '처리하지 못했어요', message: error.message }),
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
  const hasFilter =
    filter.completedOnly || (filter.priorities.length > 0 && filter.priorities.length < 4);
  const todayDone = new Set(
    (completions.data ?? []).filter((item) => item.date === today).map((item) => item.habit_id),
  );
  const filtered = sorted.filter(
    (habit) =>
      (filter.priorities.length === 0 || filter.priorities.includes(habit.priority)) &&
      (!filter.completedOnly || todayDone.has(habit.id)),
  );
  const filterLabel =
    [
      filter.completedOnly ? '완료' : null,
      selectionSummary(
        filter.priorities.map((priority) => (priority === 0 ? '자유 기록' : '★'.repeat(priority))),
        4,
        '',
      ) || null,
    ]
      .filter(Boolean)
      .join(' · ') || '필터';
  const ready = !!list.data && !!completions.data;
  const change = (values: Parameters<typeof updateSettings>[0]) => {
    void updateSettings(values)
      .then(() => scroll.current?.scrollTo({ y: 0, animated: true }))
      .catch((error: Error) =>
        showNotice({ tone: 'error', title: '설정 저장 실패', message: error.message }),
      );
  };
  const failed = list.isError || completions.isError;
  const gridEntries =
    ready && sorted.length > 0
      ? [
          ...(!(filter.priorities.length === 1 && filter.priorities[0] === 0) &&
          sorted.some((habit) => habit.priority > 0)
            ? ['progress' as const]
            : []),
          ...filtered,
          ...(sorted.length < MAX_HABIT_COUNT ? ['add' as const] : []),
        ]
      : [];
  const gridItems = [...gridEntries, ...(gridEntries.length % 2 ? [null] : [])];
  const emptyContent = failed ? (
    <QueryError
      className="min-h-64"
      message="습관 목록을 불러오지 못했어요."
      onRetry={() => {
        void list.refetch();
        void completions.refetch();
      }}
    />
  ) : !ready ? (
    <HabitListSkeleton />
  ) : (
    <EmptyState
      icon={<AppIcon name="habit" size={appRem * 1.875} color={colors.accent} />}
      title={hasFilter ? '선택한 조건의 습관이 없어요.' : '아직 만든 습관이 없어요.'}
      description={hasFilter ? '필터 조건을 바꿔보세요.' : '작은 목표 하나부터 만들어 보아요.'}
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
        stickyHeaderIndices={[0, 2]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="grow"
      >
        <View collapsable={false} pointerEvents="none" className="h-0 overflow-visible">
          <ScrollEdgeFade edge="top" visible={fade.topVisible} />
        </View>
        <PageTopSection title="습관 관리" hashtags="#실천 #성장" />
        <Toolbar>
          <ToolbarSortButton
            sort={settings.habitSort}
            priorityFirst={settings.habitPriorityFirst}
            accessibilityLabel="습관 정렬"
            onPress={() => setSortOpen(true)}
          />
          <ToolbarFilterButton
            label={filterLabel}
            accessibilityLabel={`습관 필터, ${filter.completedOnly ? '오늘 완료' : '완료 상태 전체'}, 중요도 ${selectionSummary(
              filter.priorities.map((priority) =>
                priority === 0 ? '자유 기록' : '★'.repeat(priority),
              ),
              4,
            )}`}
            onPress={() => setFilterOpen(true)}
          />
          <ToolbarAddButton
            disabled={!ready || failed}
            onPress={() => {
              if (sorted.length >= MAX_HABIT_COUNT) {
                showNotice({
                  tone: 'info',
                  title: `습관은 최대 ${MAX_HABIT_COUNT}개까지 만들 수 있어요.`,
                });
                return;
              }
              openModal('/habit/new');
            }}
          />
        </Toolbar>
        <View style={{ paddingHorizontal: '5%' }}>
          {gridItems.length === 0 ? (
            emptyContent
          ) : (
            <View className="flex-row flex-wrap">
              {gridItems.map((item, index) => (
                <View
                  key={typeof item === 'string' ? item : (item?.id ?? 'empty')}
                  className={`w-1/2 border-theme-border/50 ${index < gridItems.length - 2 ? 'border-b' : 'border-b-0'} ${index % 2 === 0 ? 'border-r' : 'border-r-0'}`}
                >
                  {item === 'progress' ? (
                    <HabitTodayProgress
                      today={today}
                      habits={sorted}
                      records={completions.data ?? []}
                      onPress={() => setFlowOpen(true)}
                    />
                  ) : item === 'add' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="습관 추가"
                      disabled={failed}
                      onPress={() => {
                        if (!failed && sorted.length < MAX_HABIT_COUNT) openModal('/habit/new');
                      }}
                      className={`flex-1 min-h-56 items-center justify-center gap-2 bg-theme-surface px-2 py-4 active:opacity-65 ${failed ? 'opacity-40' : ''}`}
                    >
                      <AppIcon name="add" size={appRem * 2} color={colors.accent} />
                      <Text className="text-xs text-center text-theme-text-tertiary">
                        ({sorted.length}/{MAX_HABIT_COUNT})
                      </Text>
                    </Pressable>
                  ) : item ? (
                    <HabitBox
                      habit={item}
                      today={today}
                      records={completions.data ?? []}
                      disabled={pendingIds.has(item.id) || failed}
                      onToggle={toggle}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {gridItems.length > 0 && filtered.length === 0 && emptyContent}
          {ready && failed && (
            <QueryError
              className="pt-4"
              message="습관 목록을 불러오지 못했어요."
              onRetry={() => {
                void list.refetch();
                void completions.refetch();
              }}
            />
          )}
        </View>
        <TabBottomSpacer />
      </ScrollView>
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {flowOpen && (
        <HabitFlowSheet today={today} habits={sorted} onClose={() => setFlowOpen(false)} />
      )}
      {filterOpen && (
        <HabitFilterPicker
          filter={filter}
          onClose={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilter(next);
            setFilterOpen(false);
            scroll.current?.scrollTo({ y: 0, animated: true });
          }}
        />
      )}
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
    </ColorView>
  );
}
