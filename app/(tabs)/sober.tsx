import { EmptyState } from '../../src/components/EmptyState';
import { useModalNavigation } from '../../src/navigation/ModalNavigationProvider';
import { EMPTY_STATE_CLASS_NAME, PAGE_CLASS_NAME } from '../../src/theme/classes';

import { useQuery } from '@tanstack/react-query';
import { useScrollToTop } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
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
import { sortSobers } from '../../src/db/sober';
import type { Sober } from '../../src/db/types';
import { MAX_SOBER_COUNT } from '../../src/domain/limits';
import { useCurrentMinute } from '../../src/hooks/useCurrentMinute';
import { useScrollFade } from '../../src/hooks/useScrollFade';
import { soberQueries } from '../../src/queries';
import { SoberBox } from '../../src/screens/sober/SoberBox';
import { SoberTopSection } from '../../src/screens/sober/SoberTopSection';
import { useSettings } from '../../src/settings/SettingsProvider';
import { useAppTheme } from '../../src/theme/AppThemeProvider';

type Row = { kind: 'state' } | { kind: 'sober'; sober: Sober };
export default function SoberList() {
  const db = useSQLiteContext();
  const { colors, rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const list = useQuery(soberQueries.list(db));
  const restarts = useQuery(soberQueries.restarts(db));
  const { settings, updateSettings } = useSettings();
  const [sortOpen, setSortOpen] = useState(false);
  const { showNotice } = useNotice();
  const now = useCurrentMinute();
  const fade = useScrollFade();
  const scroll = useRef<FlatList<Row>>(null);
  useScrollToTop(scroll);
  const sorted = sortSobers(list.data ?? [], settings);
  const grouped = useMemo(() => {
    const result = new Map<number, NonNullable<typeof restarts.data>>();
    for (const item of restarts.data ?? []) {
      const rows = result.get(item.sober_id) ?? [];
      rows.push(item);
      result.set(item.sober_id, rows);
    }
    return result;
  }, [restarts.data]);
  const ready = !!list.data && !!restarts.data;
  const failed = list.isError || restarts.isError;
  const disabledAdd = !ready || failed || sorted.length >= MAX_SOBER_COUNT;
  const rows: Row[] =
    ready && sorted.length
      ? sorted.map((sober): Row => ({ kind: 'sober', sober }))
      : [{ kind: 'state' }];
  const change = (patch: Parameters<typeof updateSettings>[0]) =>
    void updateSettings(patch)
      .then(() => scroll.current?.scrollToOffset({ offset: 0, animated: true }))
      .catch((error: Error) =>
        showNotice({ tone: 'error', title: '설정을 저장하지 못했어요', message: error.message }),
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
        contentContainerClassName="grow"
        ListHeaderComponent={
          <SoberTopSection>
            <Toolbar>
              <ToolbarSortButton
                sort={settings.soberSort}
                priorityFirst={settings.soberPriorityFirst}
                ascendingLabel="과거순"
                accessibilityLabel="거리두기 항목 정렬"
                onPress={() => setSortOpen(true)}
              />
              <ToolbarAddButton disabled={disabledAdd} onPress={() => openModal('/sober/new')} />
            </Toolbar>
          </SoberTopSection>
        }
        renderItem={({ item, index }) => {
          if (item.kind === 'sober')
            return (
              <View
                className={index === 0 ? 'pt-8' : undefined}
                style={{ paddingHorizontal: '5%' }}
              >
                <View
                  className={`border-theme-border/60 ${index === 0 ? 'border-t-0' : 'border-t'}`}
                >
                  <SoberBox
                    sober={item.sober}
                    restarts={grouped.get(item.sober.id) ?? []}
                    now={now}
                    isFirst={index === 0}
                    isLast={index === rows.length - 1 && !failed}
                  />
                </View>
              </View>
            );
          return (
            <View className="pt-8">
              {failed ? (
                <QueryError
                  className="min-h-64"
                  message="거리두기 목록을 불러오지 못했어요."
                  onRetry={() => {
                    void list.refetch();
                    void restarts.refetch();
                  }}
                />
              ) : !ready ? (
                <View className={EMPTY_STATE_CLASS_NAME}>
                  <Text className="text-theme-text-secondary">기록을 불러오는 중이에요.</Text>
                </View>
              ) : (
                <EmptyState
                  icon={<AppIcon name="sober" size={appRem * 1.875} color={colors.accent} />}
                  title="아직 시작한 거리두기가 없어요."
                  description="잠시 거리를 두고 싶은 것을 추가해보세요."
                />
              )}
            </View>
          );
        }}
        ListFooterComponent={
          <>
            {ready && sorted.length > 0 && failed ? (
              <QueryError
                className="pt-4"
                message="거리두기 목록을 불러오지 못했어요."
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
      <ScrollEdgeFade edge="top" visible={fade.topVisible} />
      <ScrollEdgeFade edge="bottom" visible={fade.bottomVisible} />

      {sortOpen && (
        <RecordSortPicker
          title="거리두기 정렬"
          sort={settings.soberSort}
          priorityFirst={settings.soberPriorityFirst}
          ascendingLabel="과거순"
          onClose={() => setSortOpen(false)}
          onApply={(sort, priorityFirst) => {
            setSortOpen(false);
            if (sort === 'CUSTOM') return;
            change({ soberSort: sort, soberPriorityFirst: priorityFirst });
          }}
        />
      )}
    </ColorView>
  );
}
