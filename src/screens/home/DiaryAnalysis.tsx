import { AnalysisHeader } from './AnalysisHeader';
import { DiaryStatisticsSummary } from './DiaryStatisticsSummary';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import type { getDiaryStats } from '../../db/stats';
export function DiaryAnalysis({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getDiaryStats>>;
  year: number;
}) {
  const max = Math.max(...stats.monthly, 1);
  return (
    <View className="gap-4">
      <AnalysisHeader title="일기 기록">
        {year}년 {stats.total}개
      </AnalysisHeader>
      <DiaryStatisticsSummary current={stats.current} longest={stats.longest} />
      <View className="p-2 flex-row">
        {stats.monthly.map((count, index) => (
          <View key={index} className="flex-1 items-center gap-1.5">
            <View className="h-32 justify-end items-center gap-1">
              {count > 0 && (
                <Text className="text-theme-accent text-sm font-medium leading-none">{count}</Text>
              )}
              <View
                style={{
                  height: count > 0 ? Math.max((count / max) * 112, 8) : 4,
                }}
                className={`w-3 rounded-[3px] ${count > 0 ? 'bg-theme-accent' : 'bg-theme-text-primary/15'}`}
              />
            </View>
            <Text className="text-theme-text-secondary text-sm">{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
