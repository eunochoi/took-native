import { useI18n } from '../../src/i18n/react';
import { selectionSummary } from '../../src/domain/selection';
import {
  DIARY_SEASONS,
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
  const { t, language } = useI18n();

  const { showNotice } = useNotice();
  const { colors } = useAppTheme();
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
      message={t('diary.listFailed')}
      onRetry={() => {
        void list.refetch();
      }}
    />
  ) : list.isPending ? (
    <DiaryListSkeleton />
  ) : (
    <EmptyState
      title={hasFilter ? t('diary.filteredEmpty') : t('diary.empty')}
      description={hasFilter ? t('diary.filteredHint') : t('diary.emptyHint')}
    />
  );
  const periodLabel =
    language === 'ko' || (year !== null && seasons.length > 0)
      ? diaryPeriodLabel(year, seasons)
      : seasons.length
        ? (Object.keys(DIARY_SEASONS) as DiarySeason[])
            .filter((season) => seasons.includes(season))
            .map((season) => `${t(`diary.${season}`)} (${t(`diary.${season}Range`)})`)
            .join(' · ')
        : year === null
          ? t('diary.allPeriod')
          : t('diary.yearAll', { count: year });
  return (
    <ColorView background="surface" className={PAGE_CLASS_NAME}>
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
            return <PageTopSection title={t('diary.listTitle')} hashtags={t('diary.listTags')} />;
          if (item.kind === 'toolbar')
            return (
              <Toolbar>
                <ToolbarSortButton
                  sort={settings.diarySort}
                  sortLabel={t('diary.dateLabel')}
                  accessibilityLabel={t('diary.sortTitle')}
                  onPress={() => setPicker('sort')}
                />
                <ToolbarFilterButton
                  label={
                    [
                      year === null
                        ? null
                        : language === 'ko' && year === Number(today.slice(0, 4))
                          ? t('diary.thisYear')
                          : t('diary.shortYear', { value: String(year % 100).padStart(2, '0') }),
                      selectionSummary(
                        seasons.map((season) => t(`diary.${season}Short`)),
                        4,
                        '',
                      ) || null,
                      selectionSummary(
                        emotionGroups.map((group) => t(`diary.${group}Short`)),
                        3,
                        '',
                      ) || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('diary.filter')
                  }
                  accessibilityLabel={t('diary.filterSummary', {
                    title: periodLabel,
                    value: selectionSummary(
                      emotionGroups.map((group) => t(`diary.${group}`)),
                      3,
                      t('diary.allEmotions'),
                    ),
                  })}
                  onPress={() => setPicker('filter')}
                />
                <ToolbarAddButton
                  label={t('diary.add')}
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
                  accessibilityLabel={t('diary.loadingMore')}
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
          title={t('diary.sortTitle')}
          sortLabel={t('diary.dateSort')}
          sort={settings.diarySort}
          onClose={() => setPicker(null)}
          onApply={(sort) => {
            setPicker(null);
            if (sort === 'CUSTOM') return;
            void updateSettings({ diarySort: sort })
              .then(() => scroll.current?.scrollToOffset({ offset: 0, animated: true }))
              .catch((error: Error) =>
                showNotice({
                  tone: 'error',
                  title: t('diary.settingsFailed'),
                  message: error.message,
                }),
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
