import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import { sortSobers } from '../../db/sober';
import { getHabitDaySummary } from '../../domain/habitStats';
import { getSoberSummary, SOBER_DAY_MS } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { diaryQueries, habitQueries, soberQueries } from '../../queries';
import { useSettings } from '../../settings/SettingsProvider';
import { SECTION_TITLE_CLASS_NAME } from '../../theme/classes';
import { HomeCardCarousel, type HomeCardId } from './HomeCardCarousel';
import {
  ArchiveSummaryCard,
  DiarySummaryCard,
  DistanceSummaryCard,
  HabitSummaryCard,
} from './HomeSummaryCards';

export const DEFAULT_HOME_CARD_ORDER: readonly HomeCardId[] = [
  'diary',
  'habit',
  'distance',
  'archive',
];

export function HomeSummarySection({
  today,
  cardOrder = DEFAULT_HOME_CARD_ORDER,
}: {
  today: string;
  cardOrder?: readonly HomeCardId[];
}) {
  const { settings } = useSettings();
  const now = useCurrentMinute();
  const db = useSQLiteContext();
  const router = useRouter();
  const { openModal } = useModalNavigation();
  const diary = useQuery(diaryQueries.byDate(db, today));
  const habits = useQuery(habitQueries.list(db));
  const completions = useQuery(habitQueries.completions(db, today, today));
  const sobers = useQuery(soberQueries.list(db));
  const restarts = useQuery({
    ...soberQueries.restarts(db),
    enabled: !!sobers.data?.length,
  });
  const sober = sortSobers(sobers.data ?? [], settings, restarts.data ?? [], now)[0];
  const habitSummary = getHabitDaySummary(today, habits.data ?? [], completions.data ?? []);
  const habitPending = habits.isPending || completions.isPending;
  const habitError = habits.isError || completions.isError;
  const soberPending = sobers.isPending || (!!sober && restarts.isPending);
  const soberError = sobers.isError || (!!sober && restarts.isError);
  const soberDays =
    sober && restarts.data
      ? Math.floor(
          getSoberSummary(
            sober,
            restarts.data.filter((item) => item.sober_id === sober.id),
            now,
          ).duration / SOBER_DAY_MS,
        ) + 1
      : null;
  const cards = {
    diary: (size: number) => (
      <DiarySummaryCard
        size={size}
        pending={diary.isPending}
        error={diary.isError}
        emotion={diary.data?.emotion ?? null}
        onPress={() =>
          openModal(
            diary.data
              ? `/diary/${diary.data.id}`
              : { pathname: '/diary/new', params: { date: today } },
          )
        }
      />
    ),
    habit: (size: number) => (
      <HabitSummaryCard
        size={size}
        pending={habitPending}
        error={habitError}
        completed={habitSummary.completed}
        total={habitSummary.total}
        freeRecords={
          habits.data?.some((habit) => habit.priority === 0) ? habitSummary.excludedCompleted : null
        }
        onPress={() => router.push('/habit')}
      />
    ),
    distance: (size: number) => (
      <DistanceSummaryCard
        size={size}
        pending={soberPending}
        error={soberError}
        days={soberDays}
        name={sober?.name}
        onPress={() => (sober ? openModal(`/sober/${sober.id}`) : router.push('/sober'))}
      />
    ),
    archive: (size: number) => (
      <ArchiveSummaryCard
        size={size}
        onPress={() =>
          openModal({ pathname: '/home/[year]/stats', params: { year: today.slice(0, 4) } })
        }
      />
    ),
  };
  return (
    <View className="py-1 gap-3">
      <Text
        accessibilityRole="header"
        className={`${SECTION_TITLE_CLASS_NAME} text-theme-text-secondary`}
      >
        오늘의 조각
      </Text>
      <HomeCardCarousel order={cardOrder} renderCard={(id, size) => cards[id](size)} />
    </View>
  );
}
