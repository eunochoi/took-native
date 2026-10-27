import { useI18n } from '../../i18n/react';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheetPage } from '../../components/BottomSheetPage';
import { QueryError } from '../../components/QueryError';
import { Text } from '../../components/Text';
import { soberQueries, statsQueries } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { DiaryAnalysis } from './DiaryAnalysis';
import { EmotionStats } from './EmotionStats';
import { HabitAnalysis } from './HabitAnalysis';
import { HomeStatsSkeleton } from './HomeStatsSkeleton';
import { HomeYearPicker } from './HomeYearPicker';
import { SoberAnalysis } from './SoberAnalysis';

export function HomeStatsScreen({
  year,
  currentYear,
  onYearChange,
}: {
  year: number;
  currentYear: number;
  onYearChange: (year: number) => void;
}) {
  const { t } = useI18n();
  const db = useSQLiteContext();
  const { iconSizes } = useAppTheme();
  const [picker, setPicker] = useState(false);
  const years = useQuery(statsQueries.years(db));
  const diary = useQuery(statsQueries.diary(db, year));
  const habit = useQuery(statsQueries.habit(db, year));
  const sobers = useQuery(soberQueries.list(db));
  const restarts = useQuery(soberQueries.restarts(db));
  const sections = [
    {
      id: 'diary',
      label: t('home.diary'),
      queries: [diary],
      content: diary.data ? <DiaryAnalysis stats={diary.data} year={year} /> : null,
    },
    {
      id: 'emotion',
      label: t('home.emotion'),
      fullBleed: true,
      queries: [diary],
      content: diary.data ? <EmotionStats stats={diary.data} year={year} /> : null,
    },
    {
      id: 'habit',
      label: t('home.habit'),
      queries: [habit],
      content: habit.data ? <HabitAnalysis stats={habit.data} year={year} /> : null,
    },
    {
      id: 'sober',
      label: t('navigation.sober'),
      queries: [sobers, restarts],
      content:
        sobers.data && restarts.data ? (
          <SoberAnalysis sobers={sobers.data} restarts={restarts.data} />
        ) : null,
    },
  ];

  return (
    <>
      <BottomSheetPage
        backRoute="/"
        title={t('home.insightsTitle')}
        scrollFade
        contentKey={year}
        contentFullBleed
      >
        <View className="gap-6">
          <View className="gap-14">
            {sections.map((section) => (
              <View
                key={section.id}
                className={
                  section.fullBleed && section.queries.every((query) => query.data)
                    ? undefined
                    : 'px-[5%]'
                }
              >
                {section.queries.some((query) => query.isError && !query.data) ? (
                  <QueryError
                    className="min-h-32"
                    message={t('home.sectionFailed', { title: section.label })}
                    retryAccessibilityLabel={t('home.sectionRetry', { title: section.label })}
                    onRetry={() => {
                      section.queries.forEach((query) => {
                        if (query.isError) void query.refetch();
                      });
                    }}
                  />
                ) : section.queries.some((query) => !query.data) ? (
                  <HomeStatsSkeleton />
                ) : (
                  section.content
                )}
              </View>
            ))}

            <View className="px-[5%]">
              <View className="gap-2 px-2">
                <Text className="text-xl font-bold">{t('home.otherYearTitle')}</Text>
                <Text className="text-base text-theme-text-secondary">
                  {t('home.otherYearDescription')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.yearChoice', { count: year })}
                  onPress={() => setPicker(true)}
                  className="py-2 my-3 self-end flex-row items-center justify-center gap-2 active:opacity-70"
                >
                  <Text className="text-base font-semibold text-theme-accent-deep">
                    {t('home.chooseYear')}
                  </Text>
                  <AppIcon
                    name="arrow-forward"
                    size={iconSizes.md}
                    className="text-theme-accent-deep"
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </BottomSheetPage>
      {picker && (
        <HomeYearPicker
          year={year}
          currentYear={currentYear}
          query={years}
          onClose={() => setPicker(false)}
          onApply={(value) => {
            onYearChange(value);
            setPicker(false);
          }}
        />
      )}
    </>
  );
}
