import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BottomSheetPage } from '../../../../src/components/BottomSheetPage';
import { QueryState } from '../../../../src/components/QueryState';
import { Text } from '../../../../src/components/Text';
import { isDate, localDate } from '../../../../src/domain/date';
import { useCurrentMinute } from '../../../../src/hooks/useCurrentMinute';
import { useModalNavigation } from '../../../../src/navigation/ModalNavigationProvider';
import { soberQueries } from '../../../../src/queries';
import { SoberRestartActions } from '../../../../src/screens/sober/SoberRestartActions';
import { SoberDayInfo } from '../../../../src/screens/sober/SoberDayInfo';

export default function SoberDay() {
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const soberId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
  const validId = Number.isSafeInteger(soberId) && soberId > 0;
  const validParams = validId && isDate(date);
  const db = useSQLiteContext();
  const { openModal } = useModalNavigation();
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const sober = useQuery({ ...soberQueries.byId(db, soberId), enabled: validParams });
  const restarts = useQuery({
    ...soberQueries.restarts(db, soberId),
    enabled: validParams && !!sober.data,
  });
  const backRoute =
    validId && (sober.isPending || sober.data) ? (`/sober/${soberId}` as const) : '/sober';
  const title = isDate(date)
    ? format(parseISO(date), 'M월 d일 EEEE', { locale: ko })
    : '거리두기 정보';
  const records = (restarts.data ?? []).filter((record) => localDate(record.restarted_at) === date);
  return (
    <SoberRestartActions key={soberId} soberId={soberId}>
      {({ pending, onMenu, onBeforeClose }) =>
        !validParams || !sober.data || sober.error || restarts.isPending || restarts.error ? (
          <BottomSheetPage title={title} backRoute={backRoute} onBeforeClose={onBeforeClose}>
            {validParams && <QueryState query={sober} />}
            {validParams && !!sober.data && <QueryState query={restarts} />}
            {(!validParams || (!sober.isPending && !sober.error && !sober.data)) && (
              <Text className="text-center text-base">거리두기 항목이나 날짜를 확인해주세요.</Text>
            )}
          </BottomSheetPage>
        ) : (
          <BottomSheetPage title={title} backRoute={backRoute} onBeforeClose={onBeforeClose}>
            <SoberDayInfo
              date={date}
              records={records}
              pending={pending}
              canAdd={date >= localDate(sober.data.initial_started_at) && date <= today}
              onAdd={() =>
                openModal({
                  pathname: '/sober/[id]/restart/new',
                  params: { id: String(soberId), date },
                })
              }
              onMenu={onMenu}
            />
          </BottomSheetPage>
        )
      }
    </SoberRestartActions>
  );
}
