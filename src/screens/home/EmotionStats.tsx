import { useState } from 'react';
import { View } from 'react-native';
import { Badge } from '../../components/Badge';
import { EmotionImage } from '../../components/EmotionImage';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { UnderlineTab } from '../../components/UnderlineTab';
import type { getDiaryStats } from '../../db/stats';
import { EMOTIONS } from '../../domain/constants';
import { DIARY_EMOTION_GROUPS } from '../../domain/diaryFilters';
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
  const groups = (
    [
      { key: 'positive', className: 'bg-theme-emotion-positive' },
      { key: 'neutral', className: 'bg-theme-emotion-neutral' },
      { key: 'negative', className: 'bg-theme-emotion-negative' },
    ] as const
  ).map(({ key, className }) => {
    const group = DIARY_EMOTION_GROUPS[key];
    return {
      key,
      className,
      label: group.label,
      count: group.emotions.reduce<number>((sum, emotion) => sum + counts[emotion], 0),
    };
  });
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
      <View className="gap-4 mx-1 px-4 py-6 bg-theme-accent-light mx-1 bg-theme-accent-light/50 ios:curve-continuous rounded-theme">
        <View className="flex-row">
          {groups.map((group) => (
            <View key={group.key} className="flex-1 gap-2 items-center">
              <View className="flex-row items-center gap-2">
                <View className={`h-3 w-3 rounded-full ${group.className}`} />
                <Text className="text-sm text-theme-text-secondary">{group.label}</Text>
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-2xl font-semibold">{group.count}</Text>
                <Text className="text-sm text-theme-text-secondary">회</Text>
              </View>
            </View>
          ))}
        </View>
        <View
          accessible
          accessibilityLabel={`감정 비율, ${groups.map((group) => `${group.label} ${group.count}회 ${total ? Math.round((group.count / total) * 100) : 0}%`).join(', ')}`}
          className={`h-2 flex-row gap-0.5 overflow-hidden rounded-full ${total ? '' : 'bg-theme-accent/30'}`}
        >
          {groups
            .filter((group) => group.count > 0)
            .map((group) => (
              <View
                key={group.key}
                className={group.className}
                style={{ flexGrow: group.count, flexBasis: 0 }}
              />
            ))}
        </View>
      </View>
      <View className="p-2 gap-4">
        {[0, 5].map((start) => (
          <View key={start} className="flex-row justify-between">
            {EMOTIONS.slice(start, start + 5).map((_emotion, offset) => {
              const id = start + offset;
              return (
                <View key={id} className="items-center gap-1">
                  <View className="p-1">
                    <EmotionImage emotion={id} size={appRem * 3} />
                    {max > 0 && counts[id] === max && (
                      <Badge className="absolute -right-2 -top-2 h-7 w-8 bg-theme-accent-light">
                        1등
                      </Badge>
                    )}
                  </View>
                  <Text className="text-theme-text-primary font-semibold text-lg">
                    {total > 0
                      ? ((counts[id] / total) * 100).toFixed(
                          counts[id] === total || counts[id] === 0 ? 0 : 1,
                        )
                      : '0'}
                    %
                  </Text>
                  <Text className="text-theme-text-tertiary text-sm">{counts[id]}회</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View className="gap-2">
        {groups.map((group) => (
          <InfoNotice key={group.key}>
            {`${group.label}: ${DIARY_EMOTION_GROUPS[group.key].description.replace(/\n/g, ', ')}`}
          </InfoNotice>
        ))}
      </View>
    </View>
  );
}
