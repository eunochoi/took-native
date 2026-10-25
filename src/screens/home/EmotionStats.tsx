import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { EmotionImage } from '../../components/EmotionImage';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { UnderlineTab } from '../../components/UnderlineTab';
import type { getDiaryStats } from '../../db/stats';
import { EMOTIONS } from '../../domain/constants';
import { DIARY_EMOTION_GROUPS } from '../../domain/diaryFilters';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ACCENT_CARD_BORDER_CLASS_NAME, UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { AnalysisHeader } from './AnalysisHeader';
const halves = ['전체', '전반기', '후반기'];
export function EmotionStats({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getDiaryStats>>;
  year: number;
}) {
  const { rem: appRem, mode } = useAppTheme();
  const { width } = useWindowDimensions();
  const [half, setHalf] = useState(0);
  const counts = half === 0 ? stats.emotions : stats.halves[half - 1];
  const total = counts.reduce((sum, count) => sum + count, 0);
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
      <View className="gap-4 px-[5%]">
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
        <View
          className={`${ACCENT_CARD_BORDER_CLASS_NAME} gap-4 mx-1 px-4 py-6 bg-theme-accent-light/50 ios:curve-continuous rounded-theme`}
        >
          <View className="flex-row">
            {groups.map((group) => (
              <View key={group.key} className="flex-1 gap-2 items-center">
                <View className="flex-row items-center gap-2">
                  <View className={`h-3 w-3 rounded-full ${group.className}`} />
                  <Text className="text-sm text-theme-text-secondary">{group.label}</Text>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-2xl font-semibold">{group.count}</Text>
                  <Text className="text-base text-theme-text-secondary">회</Text>
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
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center gap-3"
        contentContainerStyle={{ paddingHorizontal: width * 0.05 }}
      >
        {EMOTIONS.map((emotion, index) => (
          <View
            key={emotion.key}
            accessible
            accessibilityLabel={`${emotion.name} ${counts[index]}회`}
            className="shrink-0 items-center justify-center p-3 border ios:curve-continuous rounded-theme"
            style={{
              width: width * 0.35,
              backgroundColor: `${emotion.color}${mode === 'dark' ? '33' : '26'}`,
              borderColor: `${emotion.color}${mode === 'dark' ? '59' : '40'}`,
            }}
          >
            <View className="items-center gap-1">
              <EmotionImage emotion={index} size={appRem * 4} />
              <Text className="text-sm text-theme-text-secondary">{emotion.name}</Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-2xl font-semibold">{counts[index]}</Text>
                <Text className="text-base text-theme-text-secondary">회</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="gap-2 px-[5%]">
        {groups.map((group) => (
          <InfoNotice key={group.key}>
            {`${group.label}: ${DIARY_EMOTION_GROUPS[group.key].description.replace(/\n/g, ', ')}`}
          </InfoNotice>
        ))}
      </View>
    </View>
  );
}
