import { formatDisplayDate } from '../../../../src/i18n/format';
import { useI18n } from '../../../../src/i18n/react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BottomSheetPage } from '../../../../src/components/BottomSheetPage';
import { QueryState } from '../../../../src/components/QueryState';
import { Text } from '../../../../src/components/Text';
import { getSoberAchievements } from '../../../../src/domain/sober';
import { isDate, localDate } from '../../../../src/domain/date';
import { useCurrentMinute } from '../../../../src/hooks/useCurrentMinute';
import { useModalNavigation } from '../../../../src/navigation/ModalNavigationProvider';
import { soberQueries } from '../../../../src/queries';
import { SoberRestartActions } from '../../../../src/screens/sober/SoberRestartActions';
import { SoberDayInfo } from '../../../../src/screens/sober/SoberDayInfo';

export default function SoberDay() {
  const { t, formatLocale } = useI18n();

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
  const title = isDate(date) ? formatDisplayDate(date, formatLocale, 'day') : t('sober.info');
  const records = (restarts.data ?? []).filter((record) => localDate(record.restarted_at) === date);
  return (
    <SoberRestartActions key={soberId} soberId={soberId}>
      {({ pending, onMenu, onBeforeClose }) =>
        !validParams || !sober.data || sober.error || restarts.isPending || restarts.error ? (
          <BottomSheetPage title={title} backRoute={backRoute} onBeforeClose={onBeforeClose}>
            {validParams && <QueryState query={sober} />}
            {validParams && !!sober.data && <QueryState query={restarts} />}
            {(!validParams || (!sober.isPending && !sober.error && !sober.data)) && (
              <Text className="text-center text-base">{t('sober.checkItemDate')}</Text>
            )}
          </BottomSheetPage>
        ) : (
          <BottomSheetPage title={title} backRoute={backRoute} onBeforeClose={onBeforeClose}>
            <SoberDayInfo
              date={date}
              records={records}
              achievements={
                records.length
                  ? []
                  : getSoberAchievements(sober.data, restarts.data ?? [], now).filter(
                      (item) => localDate(item.achievedAt) === date,
                    )
              }
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
