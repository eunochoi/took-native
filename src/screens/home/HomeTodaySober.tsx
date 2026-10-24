import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { sortSobers } from '../../db/sober';
import { resolveIconColor } from '../../domain/constants';
import { getSoberSummary, SOBER_DAY_MS } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { soberQueries } from '../../queries';
import { useSettings } from '../../settings/SettingsProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HomeTodayItem } from './HomeTodayItem';

export function HomeTodaySober() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { settings } = useSettings();
  const { colors, rem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const now = useCurrentMinute();
  const sobers = useQuery(soberQueries.list(db));
  const restarts = useQuery({
    ...soberQueries.restarts(db),
    enabled: !!sobers.data?.length,
  });
  const sober = sortSobers(sobers.data ?? [], settings, restarts.data ?? [], now)[0];
  const pending = sobers.isPending || (!!sober && restarts.isPending);
  const error = sobers.isError || (!!sober && restarts.isError);
  const status = error ? '불러오기 실패' : (sober?.name ?? '기록 없음');
  const days =
    sober && !pending && !error
      ? Math.floor(
          getSoberSummary(
            sober,
            (restarts.data ?? []).filter((item) => item.sober_id === sober.id),
            now,
          ).duration / SOBER_DAY_MS,
        ) + 1
      : null;

  return (
    <HomeTodayItem
      title="거리두기"
      status={status}
      pending={pending}
      accessibilityLabel={`거리두기 이동, ${status}${days !== null ? `, ${days}일차` : ''}`}
      onPress={() => (sober ? openModal(`/sober/${sober.id}`) : router.push('/sober'))}
    >
      {days !== null ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          className="w-full text-center text-2xl leading-tight font-bold"
          style={{ color: resolveIconColor(sober?.icon_color ?? 'theme', colors.accent) }}
        >
          {`${days}일차`}
        </Text>
      ) : (
        <AppIcon name="sober" size={rem * 3.5} className="text-theme-text-disabled" />
      )}
    </HomeTodayItem>
  );
}
