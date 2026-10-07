import { UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { UnderlineTab } from '../../components/UnderlineTab';
import { AnalysisHeader } from './AnalysisHeader';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import type { Sober, SoberRestart } from '../../db/types';
import { formatSoberDuration, getSoberSummary } from '../../domain/sober';
import { useCurrentMinute } from '../../hooks/useCurrentMinute';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberAnalysis({ sobers, restarts }: { sobers: Sober[]; restarts: SoberRestart[] }) {
  const router = useRouter();
  const now = useCurrentMinute();
  const { rem: appRem } = useAppTheme();
  const [tab, setTab] = useState<'top' | 'bottom'>('top');
  const visibleSobers = sobers
    .map((sober) => ({
      sober,
      summary: getSoberSummary(
        sober,
        restarts.filter((item) => item.sober_id === sober.id),
        now,
      ),
    }))
    .sort(
      (a, b) =>
        (tab === 'top'
          ? b.summary.duration - a.summary.duration
          : a.summary.duration - b.summary.duration) || a.sober.id - b.sober.id,
    )
    .slice(0, 3);
  return (
    <View className="gap-4">
      <AnalysisHeader title="절제 기록">진행 중 {sobers.length}개</AnalysisHeader>
      <View accessibilityRole="tablist" className={UNDERLINE_TAB_LIST_CLASS_NAME}>
        {(
          [
            { value: 'top', label: '상위 Top 3' },
            { value: 'bottom', label: '하위 Top 3' },
          ] as const
        ).map((option) => (
          <UnderlineTab
            key={option.value}
            selected={tab === option.value}
            onPress={() => setTab(option.value)}
          >
            {option.label}
          </UnderlineTab>
        ))}
      </View>
      {sobers.length ? (
        <View className="gap-4 px-2">
          {visibleSobers.map(({ sober, summary }, index) => {
            return (
              <Pressable
                key={sober.id}
                accessibilityRole="button"
                accessibilityLabel={`${sober.name} 절제 항목 정보`}
                onPress={() => {
                  router.push(`/sober/${sober.id}`);
                }}
                className={`flex-row items-center gap-6 min-h-24 py-3 ${index < visibleSobers.length - 1 ? 'border-b border-theme-border/60' : ''}`}
              >
                <View className="h-9 w-9 shrink-0 items-center justify-center">
                  <SoberIcon
                    name={sober.icon_key}
                    colorKey={sober.icon_color}
                    size={appRem * 2.25}
                  />
                </View>
                <View className="flex-1 min-w-0 gap-1">
                  <Text numberOfLines={1} className="text-base leading-relaxed">
                    {sober.name}
                  </Text>
                  <Text className="text-base font-bold text-theme-text-primary">
                    현재 {formatSoberDuration(summary.duration)}
                  </Text>
                  <Text className="text-sm text-theme-text-secondary">
                    역대 최고 {formatSoberDuration(summary.longest)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text className="px-2 py-8 text-center text-theme-text-secondary text-sm">
          아직 만든 절제가 없어요.
        </Text>
      )}
    </View>
  );
}
