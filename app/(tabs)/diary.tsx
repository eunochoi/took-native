import { selectionSummary } from '../../src/domain/selection';
import {
  DIARY_SEASONS,
  DIARY_EMOTION_GROUPS,
  diaryPeriodLabel,
  type DiarySeason,
  type DiaryEmotionGroup,
} from '../../src/domain/diaryFilters';
import { useScrollToTop } from 'expo-router';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { PageTopSection } from '../../src/components/PageTopSection';
import { QueryError } from '../../src/components/QueryError';
import { useNotice } from '../../src/components/NoticeProvider';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { EmptyState } from '../../src/components/EmptyState';
import { RecordSortPicker } from '../../src/components/RecordSortPicker';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { ToolbarAddButton } from '../../src/components/ToolbarAddButton';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { Toolbar } from '../../src/components/Toolbar';
import { ToolbarFilterButton } from '../../src/components/ToolbarFilterButton';
import { ToolbarSortButton } from '../../src/components/ToolbarSortButton';
import type { DiaryDetail } from '../../src/db/types';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { diaryQueries, useToday } from '../../src/queries';
import { DiaryCard } from '../../src/screens/diary/DiaryCard';
import { DiaryFilterPicker } from '../../src/screens/diary/DiaryFilterPicker';
import { DiaryListSkeleton } from '../../src/screens/diary/DiaryListSkeleton';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

type Row =
  | { kind: 'fade' }
  | { kind: 'title' }
  | { kind: 'toolbar' }
  | { kind: 'state' }
  | { kind: 'diary'; diary: DiaryDetail; first: boolean };

export default function DiaryList() {
  const { showNotice } = useNotice();
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const fade = useScrollFade();
  const today = useToday();
  const { openModal } = useModalNavigation();
  const { settings, updateSettings } = useSettings();
  const scroll = useRef<FlatList<Row>>(null);
  useScrollToTop(scroll);
  const [year, setYear] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<DiarySeason[]>([]);
  const [emotionGroups, setEmotionGroups] = useState<DiaryEmotionGroup[]>([]);
  const [picker, setPicker] = useState<'sort' | 'filter' | null>(null);
  const yearsQuery = useQuery({ ...diaryQueries.years(db), enabled: picker === 'filter' });
  const list = useInfiniteQuery({
    ...diaryQueries.list(db, { year, seasons, emotionGroups, sort: settings.diarySort }),
    placeholderData: keepPreviousData,
  });
  const hasFilter =
    year !== null ||
    (seasons.length > 0 && seasons.length < 4) ||
    (emotionGroups.length > 0 && emotionGroups.length < 3);
  const failedWithoutData = list.isError && !list.data;
  const diaries = list.data?.pages.flat() ?? [];
  const rows: Row[] = [
    { kind: 'fade' },
    { kind: 'title' },
    { kind: 'toolbar' },
    ...(diaries.length
      ? diaries.map((diary, index): Row => ({ kind: 'diary', diary, first: index === 0 }))
      : [{ kind: 'state' } as const]),
  ];
  const emptyContent = failedWithoutData ? (
    <QueryError
      className="min-h-64"
      message="일기 목록을 불러오지 못했어요."
      onRetry={() => {
        void list.refetch();
      }}
    />
  ) : list.isPending ? (
    <DiaryListSkeleton />
  ) : (
    <EmptyState
      icon={<AppIcon name="diary" size={appRem * 1.875} color={colors.accent} />}
      title={hasFilter ? '선택한 조건의 일기가 없어요.' : '아직 작성한 일기가 없어요.'}
      description={
        hasFilter
          ? '필터를 바꾸거나 새로운 일기를 작성해 보세요.'
          : '오늘의 감정과 생각을 첫 번째 일기로 남겨보세요.'
      }
    />
  );
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <FlatList
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        ref={scroll}
        onScroll={fade.onScroll}
        onLayout={fade.onLayout}
        onContentSizeChange={fade.onContentSizeChange}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0, 2]}
        data={rows}
        keyExtractor={(row) => (row.kind === 'diary' ? String(row.diary.id) : row.kind)}
        removeClippedSubviews={false}
        contentContainerClassName="grow"
        renderItem={({ item, index }) => {
          if (item.kind === 'fade')
            return (
              <View collapsable={false} pointerEvents="none" className="h-0 overflow-visible">
                <ScrollEdgeFade edge="top" visible={fade.topVisible} />
              </View>
            );
          if (item.kind === 'title')
            return <PageTopSection title="일기 목록" hashtags="#감정 #끄적끄적" />;
          if (item.kind === 'toolbar')
            return (
              <Toolbar>
                <ToolbarSortButton
                  sort={settings.diarySort}
                  sortLabel="날짜"
                  accessibilityLabel="일기 정렬"
                  onPress={() => setPicker('sort')}
                />
                <ToolbarFilterButton
                  label={
                    [
                      year === null
                        ? null
                        : year === Number(today.slice(0, 4))
                          ? '올해'
                          : `${String(year % 100).padStart(2, '0')}년`,
                      selectionSummary(
                        seasons.map((season) => DIARY_SEASONS[season].label),
                        4,
                        '',
                      ) || null,
                      selectionSummary(
                        emotionGroups.map((group) => DIARY_EMOTION_GROUPS[group].label),
                        3,
                        '',
                      ) || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '필터'
                  }
                  accessibilityLabel={`일기 필터, ${diaryPeriodLabel(year, seasons)} · ${selectionSummary(
                    emotionGroups.map((group) => DIARY_EMOTION_GROUPS[group].label),
                    3,
                    '전체 감정',
                  )}`}
                  onPress={() => setPicker('filter')}
                />
                <ToolbarAddButton
                  label="일기 추가"
                  onPress={() =>
                    openModal({ pathname: '/diary/new', params: { allowDateChange: 'true' } })
                  }
                />
              </Toolbar>
            );
          if (item.kind === 'state') return <View>{emptyContent}</View>;
          return (
            <View style={{ paddingHorizontal: '5%' }}>
              <View className={`border-theme-border/50 ${item.first ? 'border-t-0' : 'border-t'}`}>
                <DiaryCard
                  diary={item.diary}
                  first={item.first}
                  last={
                    index === rows.length - 1 &&
                    !list.isFetchingNextPage &&
                    !(list.isError && list.data)
                  }
                  today={today}
                />
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <>
            <View
              className={`items-center justify-center ${list.isFetchingNextPage || (list.isError && list.data) ? 'min-h-[50px]' : ''}`}
            >
              {list.isFetchingNextPage && (
                <ActivityIndicator
                  color={colors.accent}
                  accessibilityLabel="일기 목록 더 불러오는 중"
                />
              )}
              {list.isError && list.data && (
                <QueryError
                  onRetry={() => {
                    void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch());
                  }}
                />
              )}
            </View>
            <TabBottomSpacer />
          </>
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetching && !list.isPlaceholderData && !list.isError)
            void list.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
      />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {picker === 'sort' && (
        <RecordSortPicker
          title="일기 정렬"
          sortLabel="날짜 정렬"
          sort={settings.diarySort}
          onClose={() => setPicker(null)}
          onApply={(sort) => {
            setPicker(null);
            if (sort === 'CUSTOM') return;
            void updateSettings({ diarySort: sort })
              .then(() => scroll.current?.scrollToOffset({ offset: 0, animated: true }))
              .catch((error: Error) =>
                showNotice({ tone: 'error', title: '설정 저장 실패', message: error.message }),
              );
          }}
        />
      )}
      {picker === 'filter' && (
        <DiaryFilterPicker
          year={year}
          yearsQuery={yearsQuery}
          seasons={seasons}
          emotionGroups={emotionGroups}
          currentYear={Number(today.slice(0, 4))}
          onClose={() => setPicker(null)}
          onApply={(value, selectedSeasons, selectedEmotionGroups) => {
            setYear(value);
            setSeasons(selectedSeasons);
            setEmotionGroups(selectedEmotionGroups);
            setPicker(null);
            scroll.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
      )}
    </ColorView>
  );
}
