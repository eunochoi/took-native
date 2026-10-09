import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View, type FlatList } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import { AppIcon } from '../../../src/components/AppIcon';
import { AnimatedFlatList } from '../../../src/components/AnimatedFlatList';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { QueryError } from '../../../src/components/QueryError';
import { QueryState } from '../../../src/components/QueryState';
import { RecordSortPicker } from '../../../src/components/RecordSortPicker';
import { Text } from '../../../src/components/Text';
import type { SoberRestart } from '../../../src/db/types';
import { localDate } from '../../../src/domain/date';
import { soberQueries } from '../../../src/queries';
import { SoberRestartActions } from '../../../src/screens/sober/SoberRestartActions';
import { SoberRestartCard } from '../../../src/screens/sober/SoberRestartCard';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';

type MemoRow = { record: SoberRestart; date: string; firstOfDate: boolean };

export default function SoberMemos() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const soberId = Number(id);
  const validId = Number.isSafeInteger(soberId) && soberId > 0;
  const db = useSQLiteContext();
  const { colors, iconSizes } = useAppTheme();
  const [sort, setSort] = useState<'ASC' | 'DESC'>('DESC');
  const [sorting, setSorting] = useState(false);
  const fetchingNext = useRef(false);
  const sober = useQuery({ ...soberQueries.byId(db, soberId), enabled: validId });
  const list = useInfiniteQuery({
    ...soberQueries.memos(db, soberId, sort),
    enabled: validId && !!sober.data,
  });
  const rows = useMemo(() => {
    const records = list.data?.pages.flatMap((page) => page.records) ?? [];
    let previousDate = '';
    return records.map((record): MemoRow => {
      const date = localDate(record.restarted_at);
      const firstOfDate = previousDate !== date;
      previousDate = date;
      return { record, date, firstOfDate };
    });
  }, [list.data]);
  const loadMore = () => {
    if (fetchingNext.current || list.isFetching || !list.hasNextPage) return;
    fetchingNext.current = true;
    void list
      .fetchNextPage()
      .catch(() => undefined)
      .finally(() => {
        fetchingNext.current = false;
      });
  };
  const backRoute = validId ? (`/sober/${soberId}` as const) : '/sober';
  const empty = list.isPending ? (
    <View className="min-h-48 items-center justify-center">
      <ActivityIndicator color={colors.accent} accessibilityLabel="메모 기록 불러오는 중" />
    </View>
  ) : list.isError && !list.data ? (
    <QueryError
      className="min-h-48"
      message="메모 기록을 불러오지 못했어요."
      onRetry={() => void list.refetch()}
    />
  ) : (
    <View className="min-h-48 items-center justify-center gap-3">
      <Text className="text-center text-base">아직 남긴 메모가 없어요.</Text>
      <Text className="text-center text-sm text-theme-text-secondary">
        다시 시작할 때 남긴 메모를 여기서 모아볼 수 있어요.
      </Text>
    </View>
  );
  return (
    <SoberRestartActions key={soberId} soberId={soberId}>
      {({ pending, onMenu, onBeforeClose }) =>
        !validId || !sober.data ? (
          <BottomSheetPage title="메모 기록" backRoute={backRoute} onBeforeClose={onBeforeClose}>
            {validId && <QueryState query={sober} />}
            {(!validId || (!sober.isPending && !sober.error)) && (
              <Text className="text-center text-base">거리두기 항목을 찾을 수 없어요.</Text>
            )}
          </BottomSheetPage>
        ) : (
          <>
            <BottomSheetPage
              title={`${sober.data.name} 메모`}
              onBeforeClose={onBeforeClose}
              backRoute={backRoute}
              contentKey={`${soberId}:${sort}`}
              renderScrollView={({ ref, ...viewport }) => (
                <AnimatedFlatList<MemoRow>
                  {...viewport}
                  key={`${soberId}:${sort}`}
                  ref={ref as unknown as AnimatedRef<FlatList>}
                  data={rows}
                  keyExtractor={(item) => String(item.record.id)}
                  contentContainerClassName="grow pt-6 pb-12"
                  removeClippedSubviews={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  ListHeaderComponent={
                    <View className="gap-3 pb-6">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`메모 기록 정렬, ${sort === 'DESC' ? '최신순' : '과거순'}`}
                        onPress={() => setSorting(true)}
                        className="min-h-11 self-end flex-row items-center gap-1"
                      >
                        <AppIcon name="sort" size={iconSizes.sm} color={colors.accent} />
                        <Text className="text-sm text-theme-accent">
                          {sort === 'DESC' ? '최신순' : '과거순'}
                        </Text>
                      </Pressable>
                    </View>
                  }
                  renderItem={({ item, index }) => (
                    <View className="gap-3 pb-3">
                      {item.firstOfDate && (
                        <Text
                          accessibilityRole="header"
                          className={`text-base font-semibold ${index ? 'pt-6' : ''}`}
                        >
                          {format(parseISO(item.date), 'yyyy년 M월 d일 EEEE', { locale: ko })}
                        </Text>
                      )}
                      <SoberRestartCard record={item.record} pending={pending} onMenu={onMenu} />
                    </View>
                  )}
                  ListEmptyComponent={empty}
                  ListFooterComponent={
                    <View className="items-center gap-3">
                      {list.isFetchingNextPage && (
                        <ActivityIndicator
                          color={colors.accent}
                          accessibilityLabel="메모 기록 더 불러오는 중"
                        />
                      )}
                      {list.isError && list.data && (
                        <QueryError
                          message={
                            list.isFetchNextPageError
                              ? '다음 메모를 불러오지 못했어요.'
                              : '메모 기록을 새로 불러오지 못했어요.'
                          }
                          onRetry={() => {
                            if (list.isFetchNextPageError) loadMore();
                            else void list.refetch();
                          }}
                        />
                      )}
                    </View>
                  }
                  onEndReached={() => {
                    if (!list.isError) loadMore();
                  }}
                  onEndReachedThreshold={0.4}
                />
              )}
            />
            {sorting && (
              <RecordSortPicker
                title="메모 기록 정렬"
                sortLabel="다시 시작 일시 정렬"
                sort={sort}
                onClose={() => setSorting(false)}
                onApply={(value) => {
                  setSorting(false);
                  if (value !== 'CUSTOM') setSort(value);
                }}
              />
            )}
          </>
        )
      }
    </SoberRestartActions>
  );
}
