import { useI18n } from '../../src/i18n/react';
import { PageTopSection } from '../../src/components/PageTopSection';
import { EmptyState } from '../../src/components/EmptyState';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { EMPTY_STATE_CLASS_NAME, PAGE_CLASS_NAME } from '../../src/theme/classes';

import { useQuery } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useNotice } from '../../src/components/NoticeProvider';
import { AppIcon } from '../../src/components/AppIcon';
import { ColorView } from '../../src/components/ColorTransition';
import { QueryError } from '../../src/components/QueryError';
import { RecordSortPicker } from '../../src/components/RecordSortPicker';
import { ScrollEdgeFade } from '../../src/components/ScrollEdgeFade';
import { TabBottomSpacer } from '../../src/components/TabBottomSpacer';
import { Text } from '../../src/components/Text';
import { Toolbar } from '../../src/components/Toolbar';
import { ToolbarAddButton } from '../../src/components/ToolbarAddButton';
import { ToolbarSortButton } from '../../src/components/ToolbarSortButton';
import {
  SoberFilterPicker,
  DEFAULT_SOBER_FILTER,
  SOBER_RECORD_FILTERS,
} from '../../src/screens/sober/SoberFilterPicker';
import { ToolbarFilterButton } from '../../src/components/ToolbarFilterButton';
import { getCurrentSoberStart, SOBER_DAY_MS } from '../../src/domain/sober';
import { sortSobers } from '../../src/db/sober';
import type { Sober } from '../../src/db/types';
import { MAX_SOBER_COUNT } from '../../src/domain/limits';
import { useCurrentMinute } from '../../src/hooks/useCurrentMinute';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { soberQueries } from '../../src/queries';
import { SoberBox } from '../../src/screens/sober/SoberBox';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';

type Row =
  | { kind: 'fade' }
  | { kind: 'title' }
  | { kind: 'toolbar' }
  | { kind: 'state' }
  | { kind: 'sober'; sober: Sober; first: boolean };
export default function SoberList() {
  const { t } = useI18n();

  const db = useSQLiteContext();
  const { colors, rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const list = useQuery(soberQueries.list(db));
  const restarts = useQuery(soberQueries.restarts(db));
  const { settings, updateSettings } = useSettings();
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState(DEFAULT_SOBER_FILTER);
  const { showNotice } = useNotice();
  const now = useCurrentMinute();
  const fade = useScrollFade();
  const scroll = useRef<FlatList<Row>>(null);
  useScrollToTop(scroll);
  const sorted = sortSobers(list.data ?? [], settings, restarts.data ?? [], now);
  const grouped = useMemo(() => {
    const result = new Map<number, NonNullable<typeof restarts.data>>();
    for (const item of restarts.data ?? []) {
      const rows = result.get(item.sober_id) ?? [];
      rows.push(item);
      result.set(item.sober_id, rows);
    }
    return result;
  }, [restarts.data]);
  const hasFilter = filter.priorityOnly || filter.minimumDays > 0;
  const filtered = sorted.filter(
    (sober) =>
      (!filter.priorityOnly || sober.is_priority === 1) &&
      Math.max(0, now - Date.parse(getCurrentSoberStart(sober, grouped.get(sober.id) ?? []))) >=
        filter.minimumDays * SOBER_DAY_MS,
  );
  const periodFilter = SOBER_RECORD_FILTERS.find((option) => option.days === filter.minimumDays)!;
  const filterLabel =
    [
      filter.priorityOnly ? t('sober.priorityShort') : null,
      periodFilter.days === 0 ? '' : t(`sober.period${periodFilter.days}Short`),
    ]
      .filter(Boolean)
      .join(' · ') || t('habit.filter');
  const ready = !!list.data && !!restarts.data;
  const failed = list.isError || restarts.isError;
  const disabledAdd = !ready || failed;
  const showAdd = ready && sorted.length > 0 && sorted.length < MAX_SOBER_COUNT;
  const rows: Row[] = [
    { kind: 'fade' },
    { kind: 'title' },
    { kind: 'toolbar' },
    ...(ready && filtered.length
      ? filtered.map((sober, index): Row => ({ kind: 'sober', sober, first: index === 0 }))
      : [{ kind: 'state' } as const]),
  ];
  const change = (patch: Parameters<typeof updateSettings>[0]) =>
    void updateSettings(patch)
      .then(() => scroll.current?.scrollToOffset({ offset: 0, animated: true }))
      .catch((error: Error) =>
        showNotice({ tone: 'error', title: t('settings.saveFailed'), message: error.message }),
      );
  return (
    <ColorView className={PAGE_CLASS_NAME}>
      <FlatList
        ref={scroll}
        data={rows}
        keyExtractor={(item) => (item.kind === 'sober' ? String(item.sober.id) : item.kind)}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        onScroll={fade.onScroll}
        onLayout={fade.onLayout}
        onContentSizeChange={fade.onContentSizeChange}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0, 2]}
        contentContainerClassName="grow"
        renderItem={({ item, index }) => {
          if (item.kind === 'fade')
            return (
              <View collapsable={false} pointerEvents="none" className="h-0 overflow-visible">
                <ScrollEdgeFade edge="top" visible={fade.topVisible} />
              </View>
            );
          if (item.kind === 'title')
            return <PageTopSection title={t('sober.title')} hashtags={t('sober.tags')} />;
          if (item.kind === 'toolbar')
            return (
              <Toolbar>
                <ToolbarSortButton
                  sort={settings.soberSort}
                  recordSort={settings.soberRecordSort}
                  priorityFirst={settings.soberPriorityFirst}
                  accessibilityLabel={t('sober.sortItem')}
                  onPress={() => setSortOpen(true)}
                />
                <ToolbarFilterButton
                  label={filterLabel}
                  accessibilityLabel={t('sober.filterSummary', {
                    title: filter.priorityOnly ? t('sober.priorityOnly') : t('sober.allPriorities'),
                    value: t(`sober.period${periodFilter.days}`),
                  })}
                  onPress={() => setFilterOpen(true)}
                />
                <ToolbarAddButton
                  disabled={disabledAdd}
                  onPress={() => {
                    if (sorted.length >= MAX_SOBER_COUNT) {
                      showNotice({
                        tone: 'info',
                        title: t('sober.maxItems', { count: MAX_SOBER_COUNT }),
                      });
                      return;
                    }
                    openModal('/sober/new');
                  }}
                />
              </Toolbar>
            );
          if (item.kind === 'sober')
            return (
              <View style={{ paddingHorizontal: '5%' }}>
                <View
                  className={`border-theme-border/50 ${item.first ? 'border-t-0' : 'border-t'}`}
                >
                  <SoberBox
                    sober={item.sober}
                    restarts={grouped.get(item.sober.id) ?? []}
                    now={now}
                    isFirst={item.first}
                    isLast={index === rows.length - 1 && !failed && !showAdd}
                  />
                </View>
              </View>
            );
          return (
            <View>
              {failed ? (
                <QueryError
                  className="min-h-64"
                  message={t('sober.listFailed')}
                  onRetry={() => {
                    void list.refetch();
                    void restarts.refetch();
                  }}
                />
              ) : !ready ? (
                <View className={EMPTY_STATE_CLASS_NAME}>
                  <Text className="text-theme-text-secondary">{t('sober.recordsLoading')}</Text>
                </View>
              ) : (
                <EmptyState
                  icon={<AppIcon name="sober" size={appRem * 1.875} color={colors.accent} />}
                  title={hasFilter ? t('sober.filteredEmpty') : t('sober.empty')}
                  description={hasFilter ? t('habit.filterHint') : t('sober.emptyHint')}
                />
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {showAdd && (
              <View style={{ paddingHorizontal: '5%' }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('sober.add')}
                  disabled={disabledAdd}
                  onPress={() => {
                    if (!disabledAdd && sorted.length < MAX_SOBER_COUNT) openModal('/sober/new');
                  }}
                  className={`min-h-40 items-center justify-center gap-2 border-t border-theme-border/50 bg-theme-surface px-2 py-5 active:opacity-65 ${disabledAdd ? 'opacity-40' : ''}`}
                >
                  <AppIcon name="add" size={appRem * 2} color={colors.accent} />
                  <Text className="text-xs text-center text-theme-text-tertiary">
                    ({sorted.length}/{MAX_SOBER_COUNT})
                  </Text>
                </Pressable>
              </View>
            )}
            {ready && filtered.length > 0 && failed ? (
              <QueryError
                className="pt-4"
                message={t('sober.listFailed')}
                onRetry={() => {
                  void list.refetch();
                  void restarts.refetch();
                }}
              />
            ) : null}
            <TabBottomSpacer />
          </>
        }
      />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {filterOpen && (
        <SoberFilterPicker
          filter={filter}
          onClose={() => setFilterOpen(false)}
          onApply={(next) => {
            setFilter(next);
            setFilterOpen(false);
            scroll.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        />
      )}
      {sortOpen && (
        <RecordSortPicker
          title={t('sober.sort')}
          sortLabel={t('ui.createdDate')}
          sort={settings.soberSort}
          recordSort={settings.soberRecordSort}
          priorityFirst={settings.soberPriorityFirst}
          ascendingLabel={t('ui.oldest')}
          onClose={() => setSortOpen(false)}
          onApply={(sort, priorityFirst, recordSort) => {
            setSortOpen(false);
            if (sort === 'CUSTOM') return;
            change({
              soberSort: sort,
              soberPriorityFirst: priorityFirst,
              soberRecordSort: recordSort,
            });
          }}
        />
      )}
    </ColorView>
  );
}
