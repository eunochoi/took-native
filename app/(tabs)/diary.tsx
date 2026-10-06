import { useScrollToTop } from 'expo-router';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { AlertModal, type AlertContent } from '../../src/components/AlertModal';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { EmptyState } from '../../src/components/EmptyState';
import { RecordSortPicker } from '../../src/components/RecordSortPicker';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { ToolbarFilterButton } from '../../src/components/ToolbarFilterButton';
import { ToolbarSortButton } from '../../src/components/ToolbarSortButton';
import type { DiaryDetail } from '../../src/db/types';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { diaryQueries, useToday } from '../../src/queries';
import { DiaryCard } from '../../src/screens/diary/DiaryCard';
import { DiaryFilterPicker } from '../../src/screens/diary/DiaryFilterPicker';
import { DiaryListSkeleton } from '../../src/screens/diary/DiaryListSkeleton';
import { DiaryTopSection } from '../../src/screens/diary/DiaryTopSection';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import { PAGE_CLASS_NAME } from '../../src/theme/classes';

type Row = { kind: 'state' } | { kind: 'diary'; diary: DiaryDetail; first: boolean };

export default function DiaryList() {
  const [alert, setAlert] = useState<AlertContent | null>(null);
  const { colors, rem: appRem } = useAppTheme();
  const db = useSQLiteContext();
  const fade = useScrollFade();
  const today = useToday();
  const { settings, updateSettings } = useSettings();
  const scroll = useRef<FlatList<Row>>(null);
  useScrollToTop(scroll);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState(0);
  const [emotion, setEmotion] = useState<number | null>(null);
  const [picker, setPicker] = useState<'sort' | 'filter' | null>(null);
  const list = useInfiniteQuery({
    ...diaryQueries.list(db, { year, month, emotion, sort: settings.diarySort }),
    placeholderData: keepPreviousData,
  });
  const hasFilter = year !== null || emotion !== null;
  const failedWithoutData = list.isError && !list.data;
  const diaries = list.data?.pages.flat() ?? [];
  const rows: Row[] = diaries.length
    ? diaries.map((diary, index): Row => ({ kind: 'diary', diary, first: index === 0 }))
    : [{ kind: 'state' }];
  const emptyContent = failedWithoutData ? (
    <View className="min-h-64 items-center justify-center gap-3">
      <Text className="text-theme-text-secondary">일기 목록을 불러오지 못했어요.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void list.refetch();
        }}
      >
        <Text className="text-theme-accent">다시 시도</Text>
      </Pressable>
    </View>
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
        data={rows}
        keyExtractor={(row) => (row.kind === 'diary' ? String(row.diary.id) : row.kind)}
        removeClippedSubviews={false}
        contentContainerClassName="grow"
        ListHeaderComponent={
          <DiaryTopSection>
            <Toolbar>
              <ToolbarSortButton
                sort={settings.diarySort}
                accessibilityLabel="일기 정렬"
                onPress={() => setPicker('sort')}
              />
              <ToolbarFilterButton
                year={year}
                month={month}
                emotion={emotion}
                onPress={() => setPicker('filter')}
              />
            </Toolbar>
          </DiaryTopSection>
        }
        renderItem={({ item }) => {
          if (item.kind === 'state') return <View className="pt-8">{emptyContent}</View>;
          return (
            <View className={item.first ? 'pt-8' : undefined} style={{ paddingHorizontal: '5%' }}>
              <View className={`border-theme-border/60 ${item.first ? 'border-t-0' : 'border-t'}`}>
                <DiaryCard diary={item.diary} first={item.first} today={today} />
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
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void (list.isFetchNextPageError ? list.fetchNextPage() : list.refetch());
                  }}
                >
                  <Text className="text-theme-accent">다시 시도</Text>
                </Pressable>
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
      <ScrollEdgeFade edge="top" visible={fade.topVisible} />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {picker === 'sort' && (
        <RecordSortPicker
          title="일기 정렬"
          sort={settings.diarySort}
          onClose={() => setPicker(null)}
          onApply={(sort) => {
            setPicker(null);
            if (sort === 'CUSTOM') return;
            void updateSettings({ diarySort: sort })
              .then(() => scroll.current?.scrollToOffset({ offset: 0, animated: true }))
              .catch((error: Error) =>
                setAlert({ title: '설정 저장 실패', message: error.message }),
              );
          }}
        />
      )}
      {picker === 'filter' && (
        <DiaryFilterPicker
          year={year}
          month={month}
          emotion={emotion}
          currentYear={Number(today.slice(0, 4))}
          onClose={() => setPicker(null)}
          onApply={(value, selectedMonth, selectedEmotion) => {
            setYear(value);
            setMonth(selectedMonth);
            setEmotion(selectedEmotion);
            setPicker(null);
            scroll.current?.scrollToOffset({ offset: 0, animated: true });
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
