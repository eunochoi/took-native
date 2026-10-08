import { useState } from 'react';
import { View } from 'react-native';
import { Badge } from '../../components/Badge';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import { UnderlineTab } from '../../components/UnderlineTab';
import type { getDiaryStats } from '../../db/stats';
import { EMOTIONS } from '../../domain/constants';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { AnalysisHeader } from './AnalysisHeader';
const halves = ['전체', '전반기', '후반기'];
export function EmotionStats({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getDiaryStats>>;
  year: number;
}) {
  const { rem: appRem } = useAppTheme();
  const [half, setHalf] = useState(0);
  const counts = half === 0 ? stats.emotions : stats.halves[half - 1];
  const total = counts.reduce((sum, count) => sum + count, 0);
  const max = Math.max(...counts);
  return (
    <View className="gap-4">
      <AnalysisHeader title="감정 기록">
        {year}년 {halves[half]} {total}개
      </AnalysisHeader>
      <View accessibilityRole="tablist" className={UNDERLINE_TAB_LIST_CLASS_NAME}>
        {halves.map((label, index) => (
          <UnderlineTab key={index} selected={half === index} onPress={() => setHalf(index)}>
            {label}
          </UnderlineTab>
        ))}
      </View>
      <View className="p-2 gap-8">
        {[0, 5].map((start) => (
          <View key={start} className="flex-row justify-between">
            {EMOTIONS.slice(start, start + 5).map((emotion, offset) => {
              const id = start + offset;
              return (
                <View key={id} className="items-center gap-1">
                  <View>
                    <EmotionImage emotion={id} size={appRem * 3} />
                    {max > 0 && counts[id] === max && (
                      <Badge className="absolute -right-2 -top-2 h-7 w-8">
                        1등
                      </Badge>
                    )}
                  </View>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-theme-accent font-semibold text-xl">{counts[id]}</Text>
                    <Text className="text-theme-text-secondary text-sm">회</Text>
                  </View>
                  <Text className="text-theme-text-tertiary text-sm">{emotion.name}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
