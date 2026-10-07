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
  const db = useSQLiteContext();
  const { colors, iconSizes, rem: appRem } = useAppTheme();
  const [picker, setPicker] = useState(false);
  const years = useQuery(statsQueries.years(db));
  const diary = useQuery(statsQueries.diary(db, year));
  const habit = useQuery(statsQueries.habit(db, year));
  const sobers = useQuery(soberQueries.list(db));
  const restarts = useQuery(soberQueries.restarts(db));
  const sections = [
    {
      label: '일기',
      queries: [diary],
      content: diary.data ? <DiaryAnalysis stats={diary.data} year={year} /> : null,
    },
    {
      label: '감정',
      queries: [diary],
      content: diary.data ? <EmotionStats stats={diary.data} year={year} /> : null,
    },
    {
      label: '습관',
      queries: [habit],
      content: habit.data ? <HabitAnalysis stats={habit.data} year={year} /> : null,
    },
    {
      label: '거리두기',
      queries: [sobers, restarts],
      content:
        sobers.data && restarts.data ? (
          <SoberAnalysis sobers={sobers.data} restarts={restarts.data} />
        ) : null,
    },
  ];

  return (
    <>
      <BottomSheetPage backRoute="/" title="모아보기" scrollFade contentKey={year}>
        <View className="gap-6 pt-1 pb-6">
          <View className="gap-14">
            {sections.map((section) => (
              <View key={section.label}>
                {section.queries.some((query) => query.isError && !query.data) ? (
                  <QueryError
                    className="min-h-32"
                    message={`${section.label} 기록을 불러오지 못했어요.`}
                    retryAccessibilityLabel={`${section.label} 기록 다시 시도`}
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

            <View className="gap-2 px-2">
              <Text className="text-xl font-bold">다른 연도도 확인해 볼까요?</Text>
              <Text className="text-base text-theme-text-secondary">
                연도를 바꿔 다른 해의 기록도 살펴보세요.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${year}년, 연도 선택`}
                onPress={() => setPicker(true)}
                className="py-2 my-3 self-end flex-row items-center justify-center gap-2 active:opacity-70"
              >
                <Text className="text-base font-semibold text-theme-accent-deep">연도 선택</Text>
                <AppIcon
                  name="arrow-forward"
                  size={iconSizes.md}
                  className="text-theme-accent-deep"
                />
              </Pressable>
            </View>

            <View className="flex-row items-start gap-2 px-2">
              <View className="h-5 w-4 shrink-0 items-center justify-center">
                <AppIcon name="info-outline" size={appRem} color={colors.accent} />
              </View>
              <Text className="flex-1 text-sm leading-5 text-theme-accent">
                일기의 연속·역대 최고 기록과 거리두기 기록은 선택 연도와 관계없이 전체 기간
                기준이에요.
              </Text>
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
