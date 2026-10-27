import { formatDisplayDate } from '../../../src/i18n/format';
import { useI18n } from '../../../src/i18n/react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
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
  const { t, formatLocale } = useI18n();

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
      <ActivityIndicator color={colors.accent} accessibilityLabel={t('sober.notesLoading')} />
    </View>
  ) : list.isError && !list.data ? (
    <QueryError
      className="min-h-48"
      message={t('sober.notesFailed')}
      onRetry={() => void list.refetch()}
    />
  ) : (
    <View className="min-h-48 items-center justify-center gap-3">
      <Text className="text-center text-base">{t('sober.notesEmpty')}</Text>
      <Text className="text-center text-sm text-theme-text-secondary">
        {t('sober.notesEmptyHint')}
      </Text>
    </View>
  );
  return (
    <SoberRestartActions key={soberId} soberId={soberId}>
      {({ pending, onMenu, onBeforeClose }) =>
        !validId || !sober.data ? (
          <BottomSheetPage
            title={t('sober.notesTitle')}
            backRoute={backRoute}
            onBeforeClose={onBeforeClose}
          >
            {validId && <QueryState query={sober} />}
            {(!validId || (!sober.isPending && !sober.error)) && (
              <Text className="text-center text-base">{t('sober.notFound')}</Text>
            )}
          </BottomSheetPage>
        ) : (
          <>
            <BottomSheetPage
              title={t('sober.notesName', { value: sober.data.name })}
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
                  contentContainerClassName="pt-6 pb-7"
                  removeClippedSubviews={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  ListHeaderComponent={
                    <View className="gap-3 pb-6">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('sober.notesSortLabel', {
                          value: sort === 'DESC' ? t('ui.newest') : t('ui.oldest'),
                        })}
                        onPress={() => setSorting(true)}
                        className="min-h-11 self-end flex-row items-center gap-1"
                      >
                        <AppIcon name="sort" size={iconSizes.sm} color={colors.accent} />
                        <Text className="text-sm text-theme-accent">
                          {sort === 'DESC' ? t('ui.newest') : t('ui.oldest')}
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
                          {formatDisplayDate(item.date, formatLocale, 'long')}
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
                          accessibilityLabel={t('sober.notesMoreLoading')}
                        />
                      )}
                      {list.isError && list.data && (
                        <QueryError
                          message={
                            list.isFetchNextPageError
                              ? t('sober.nextNotesFailed')
                              : t('sober.refreshNotesFailed')
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
                title={t('sober.sortNotes')}
                sortLabel={t('sober.sortRestart')}
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
