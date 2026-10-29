import { formatDisplayDate } from '../../../src/i18n/format';
import { useI18n } from '../../../src/i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useMemo } from 'react';
import { View } from 'react-native';
import { BottomSheetPage } from '../../../src/components/BottomSheetPage';
import { HabitIcon } from '../../../src/components/HabitIcon';
import { InfoNotice } from '../../../src/components/InfoNotice';
import { QueryState } from '../../../src/components/QueryState';
import { Text } from '../../../src/components/Text';
import { habitQueries, useToday } from '../../../src/queries';
import { HabitMenu } from '../../../src/screens/habit/HabitMenu';
import { HabitStars } from '../../../src/screens/habit/HabitStars';
import { HabitStatistics } from '../../../src/screens/habit/HabitStatistics';
import { useAppTheme } from '../../../src/theme/AppThemeProvider';

export default function HabitDetail() {
  const { t, formatLocale } = useI18n();

  const { rem: appRem } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const today = useToday();
  const query = useQuery(habitQueries.byId(db, Number(id)));
  const records = useQuery(habitQueries.completionsByHabit(db, Number(id)));
  const dates = useMemo(() => (records.data ?? []).map((record) => record.date), [records.data]);
  const habit = query.data;
  return (
    <>
      <BottomSheetPage
        backRoute="/habit"
        title={habit?.name ?? t('habit.info')}
        menuAction={
          habit ? (
            <HabitMenu habit={habit} onDeleted={() => router.dismissTo('/habit')} />
          ) : undefined
        }
      >
        <View className="gap-12">
          <QueryState query={query} />
          <QueryState query={records} />
          {habit ? (
            <>
              <View className="gap-4 justify-center items-center">
                <View className="items-center gap-4">
                  <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 3} />
                </View>
                <HabitStars priority={habit.priority} size={appRem * 1.3} />
                <Text className="-mt-2 text-sm text-theme-text-secondary">
                  {habit.priority === 0 ? t('habit.free') : t('habit.daily')}
                </Text>
                <Text className="text-sm text-theme-text-secondary">
                  {t('habit.started', {
                    value: formatDisplayDate(habit.initial_started_at, formatLocale, 'dateTime'),
                  })}
                </Text>
              </View>
              <HabitStatistics
                habit={habit}
                dates={dates}
                today={today}
                unavailable={records.isPending || records.isError}
              />
              {habit.priority > 0 && (
                <View className="gap-2">
                  <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
                    {t('habit.eligibleNotice')}
                  </InfoNotice>
                  <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
                    {t('habit.rateNotice')}
                  </InfoNotice>
                </View>
              )}
            </>
          ) : !query.isPending && !query.error ? (
            <Text>{t('habit.notFound')}</Text>
          ) : null}
        </View>
      </BottomSheetPage>
    </>
  );
}
