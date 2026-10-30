import { resolveIconColor } from '../../../src/domain/constants';
import { itemAccentColors } from '../../../src/theme/colors';
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

  const { rem: appRem, colors, mode } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const today = useToday();
  const query = useQuery(habitQueries.byId(db, Number(id)));
  const records = useQuery(habitQueries.completionsByHabit(db, Number(id)));
  const dates = useMemo(() => (records.data ?? []).map((record) => record.date), [records.data]);
  const habit = query.data;
  const accent = itemAccentColors(
    resolveIconColor(habit?.icon_color ?? 'theme', colors.accent),
    colors.surface,
    mode,
  );
  return (
    <>
      <BottomSheetPage
        backRoute="/habit"
        handleColor={accent.color}
        title={t('habit.detailTitle')}
        menuAction={
          habit ? (
            <HabitMenu habit={habit} onDeleted={() => router.dismissTo('/habit')} />
          ) : undefined
        }
      >
        <View className="gap-8">
          <QueryState query={query} />
          <QueryState query={records} />
          {habit ? (
            <>
              <View className="items-center gap-4 px-1 py-2">
                <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 4} />
                <Text accessibilityRole="header" className="text-center text-xl font-semibold">
                  {habit.name}
                </Text>
                <View className="items-center gap-1">
                  <HabitStars color={accent.color} priority={habit.priority} size={appRem * 1.1} />
                  <Text className="text-sm text-theme-text-secondary">
                    {habit.priority === 0 ? t('habit.free') : t('habit.daily')}
                  </Text>
                </View>
                <Text className="text-center text-sm text-theme-text-secondary">
                  {t('habit.started', {
                    value: formatDisplayDate(
                      habit.initial_started_at,
                      formatLocale,
                      'shortDateTime',
                    ),
                  })}
                </Text>
              </View>
              <HabitStatistics
                accent={accent}
                habit={habit}
                dates={dates}
                today={today}
                unavailable={records.isPending || records.isError}
              />
              {habit.priority > 0 && (
                <View className="px-1 gap-2">
                  <InfoNotice accent={accent} numberOfLines={0} adjustsFontSizeToFit={false}>
                    {t('habit.eligibleNotice')}
                  </InfoNotice>
                  <InfoNotice accent={accent} numberOfLines={0} adjustsFontSizeToFit={false}>
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
