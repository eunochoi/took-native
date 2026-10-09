import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { UnderlineTab } from '../../components/UnderlineTab';
import { AnalysisHeader } from './AnalysisHeader';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { HabitIcon } from '../../components/HabitIcon';
import { HabitStars } from '../habit/HabitStars';
import { Text } from '../../components/Text';
import type { getHabitStats } from '../../db/stats';
import { useAppTheme } from '../../theme/AppThemeProvider';
export function HabitAnalysis({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getHabitStats>>;
  year: number;
}) {
  const { rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const [tab, setTab] = useState<'top' | 'bottom'>('top');
  const habits = stats[tab].slice(0, 3);
  return (
    <View className="gap-4">
      <AnalysisHeader title="습관 기록">{year}년 기준</AnalysisHeader>
      <View accessibilityRole="tablist" className={UNDERLINE_TAB_LIST_CLASS_NAME}>
        {(
          [
            {
              value: 'top',
              label: '상위 Top 3',
            },
            {
              value: 'bottom',
              label: '하위 Top 3',
            },
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
      {habits.length ? (
        <View className="px-2 gap-4">
          {habits.map((habit, index) => (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              onPress={() => openModal(`/habit/${habit.id}`)}
              className={`flex-row items-center gap-6 min-h-24 py-3 ${index < habits.length - 1 ? 'border-b border-theme-border/60' : ''}`}
            >
              <View className="h-9 w-9 shrink-0 items-center justify-center">
                <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 2.25} />
              </View>
              <View className="flex-1 min-w-0 gap-1">
                <Text numberOfLines={1} className="text-base leading-relaxed">
                  {habit.name}
                </Text>
                <HabitStars
                  priority={habit.priority}
                  size={appRem}
                  className="opacity-80"
                  accessibilityLabel={`중요도 ${habit.priority + 1}`}
                />
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-theme-accent font-semibold text-2xl">{habit.count}</Text>
                <Text className="text-theme-text-secondary text-sm">회</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text className="px-2 py-8 text-center text-theme-text-secondary text-sm">
          {year}년에 완료한 습관이 없어요.
        </Text>
      )}
    </View>
  );
}
