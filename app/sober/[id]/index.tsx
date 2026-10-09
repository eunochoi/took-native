import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { useModalNavigation } from '../../../src/navigation/ModalNavigationProvider';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { Button } from '../../../src/components/Button';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import { isDate } from '../../../src/domain/date';
import type { SoberRestart } from '../../../src/db/types';
import { getSoberSummary } from '../../../src/domain/sober';
import { useCurrentMinute } from '../../../src/hooks/useCurrentMinute';
import { soberQueries } from '../../../src/queries';
import { SoberGauge } from '../../../src/screens/sober/SoberGauge';
import { SoberLongRecords } from '../../../src/screens/sober/SoberLongRecords';
import { SoberMenu } from '../../../src/screens/sober/SoberMenu';
import { SoberMonthCalendar } from '../../../src/screens/sober/SoberMonthCalendar';
import { SoberStatisticsSummary } from '../../../src/screens/sober/SoberStatisticsSummary';
import { BODY_DESCRIPTION_CLASS_NAME } from '../../../src/theme/classes';

export default function SoberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const soberId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
  const validId = Number.isSafeInteger(soberId) && soberId > 0;
  const db = useSQLiteContext();
  const router = useRouter();
  const { openModal } = useModalNavigation();
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const query = useQuery({ ...soberQueries.byId(db, soberId), enabled: validId });
  const restarts = useQuery({
    ...soberQueries.restarts(db, soberId),
    enabled: validId && !!query.data,
  });
  const grouped = useMemo(() => {
    const result = new Map<string, SoberRestart[]>();
    for (const item of restarts.data ?? []) {
      const date = format(parseISO(item.restarted_at), 'yyyy-MM-dd');
      const rows = result.get(date) ?? [];
      rows.push(item);
      result.set(date, rows);
    }
    return result;
  }, [restarts.data]);
  const sober = query.data;
  if (!validId || !sober || restarts.isPending || query.error || restarts.error)
    return (
      <BottomSheetPage title="거리두기 정보" backRoute="/sober">
        {validId && <QueryState query={query} />}
        {validId && !!sober && <QueryState query={restarts} />}
        {(!validId || (!query.isPending && !query.error && !sober)) && (
          <Text className="px-6">거리두기 항목을 찾을 수 없어요.</Text>
        )}
      </BottomSheetPage>
    );
  const summary = getSoberSummary(sober, restarts.data ?? [], now);
  const firstDate = format(parseISO(sober.initial_started_at), 'yyyy-MM-dd');
  return (
    <BottomSheetPage
      title={sober.name}
      backRoute="/sober"
      menuAction={<SoberMenu sober={sober} onDeleted={() => router.dismissTo('/sober')} />}
    >
      <View className="gap-12">
        <View className="gap-5 items-center">
          <SoberGauge
            progress={summary.progress}
            goalDays={summary.goalDays}
            duration={summary.duration}
            start={summary.start}
            iconKey={sober.icon_key}
            iconColor={sober.icon_color}
          />
          <SoberStatisticsSummary summary={summary} initialStartedAt={sober.initial_started_at} />
          <Button
            labelWeight="normal"
            className="w-full"
            label="다시 시작하기"
            onPress={() =>
              openModal({ pathname: '/sober/[id]/restart/new', params: { id: String(soberId) } })
            }
          />
          <Button
            subtle
            labelWeight="normal"
            className="w-full"
            label="메모 기록보기"
            onPress={() =>
              openModal({ pathname: '/sober/[id]/memos', params: { id: String(soberId) } })
            }
          />
        </View>
        {!!sober.description && (
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-xl font-semibold">
              나의 다짐
            </Text>
            <Text className={twMerge(BODY_DESCRIPTION_CLASS_NAME, 'px-2')}>
              {sober.description}
            </Text>
          </View>
        )}
        <SoberMonthCalendar
          month={month}
          selected={selected}
          today={today}
          firstDate={firstDate}
          recordsByDate={grouped}
          onMonthChange={setMonth}
          onSelect={(date) => {
            if (!isDate(date)) return;
            setSelected(date);
            setMonth(date.slice(0, 7));
            openModal({
              pathname: '/sober/[id]/day/[date]',
              params: { id: String(soberId), date },
            });
          }}
        />
        <SoberLongRecords records={summary.longRecords} />
      </View>
    </BottomSheetPage>
  );
}
