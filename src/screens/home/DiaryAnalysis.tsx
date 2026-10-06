import { AppIcon } from '../../components/AppIcon';
import { AnalysisHeader } from './AnalysisHeader';
import { useAppTheme } from '../../theme/AppThemeProvider';
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
  const { colors, iconSizes } = useAppTheme();
  const max = Math.max(...stats.monthly, 1);
  return (
    <View className="gap-4">
      <AnalysisHeader title="일기 기록">
        {year}년 {stats.total}개
      </AnalysisHeader>
      <View className="flex-row">
        {(
          [
            {
              label: '현재 연속 기록',
              icon: 'calendar',
              value: stats.current,
            },
            {
              label: '역대 최고 기록',
              icon: 'emoji-events',
              value: stats.longest,
            },
          ] as const
        ).map((stat, index) => (
          <View
            key={stat.label}
            className={`flex-1 items-center gap-2 py-3 border-theme-border/60 ${index === 1 ? 'border-l' : 'border-l-0'}`}
          >
            <AppIcon name={stat.icon} size={iconSizes.lg} color={colors.accent} />
            <Text className="text-theme-text-secondary text-sm">{stat.label}</Text>
            <View className="flex-row items-baseline gap-1">
              <Text className="text-theme-accent font-bold text-2xl leading-none">
                {stat.value}
              </Text>
              <Text className="text-theme-text-secondary font-bold text-sm">일</Text>
            </View>
          </View>
        ))}
      </View>
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
