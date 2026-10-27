import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { HabitIcon } from '../../components/HabitIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { UnderlineTab } from '../../components/UnderlineTab';
import type { getHabitStats } from '../../db/stats';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME, UNDERLINE_TAB_LIST_CLASS_NAME } from '../../theme/classes';
import { HabitStars } from '../habit/HabitStars';
import { AnalysisHeader } from './AnalysisHeader';
export function HabitAnalysis({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getHabitStats>>;
  year: number;
}) {
  const { t } = useI18n();

  const { rem: appRem } = useAppTheme();
  const { openModal } = useModalNavigation();
  const [tab, setTab] = useState<'top' | 'bottom'>('top');
  const habits = stats[tab].slice(0, 3);
  return (
    <View className="gap-4">
      <AnalysisHeader title={t('stats.habitTitle')}>
        {t('stats.habitYear', { count: year })}
      </AnalysisHeader>
      <View accessibilityRole="tablist" className={UNDERLINE_TAB_LIST_CLASS_NAME}>
        {(
          [
            {
              value: 'top',
              label: t('stats.topThree'),
            },
            {
              value: 'bottom',
              label: t('stats.bottomThree'),
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
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} mx-1 p-6 bg-theme-surface-muted/60 ios:curve-continuous rounded-theme`}
      >
        {habits.length ? (
          habits.map((habit, index) => (
            <Pressable
              key={habit.id}
              accessibilityRole="button"
              onPress={() => openModal(`/habit/${habit.id}`)}
              className={`flex-row items-center gap-4 min-h-12 ${index > 0 ? 'pt-6' : ''} ${index < habits.length - 1 ? 'pb-6 border-b border-theme-border/50' : ''}`}
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
                  accessibilityLabel={t('stats.priority', { count: habit.priority })}
                />
              </View>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-theme-text-primary font-semibold text-2xl">
                  {habit.count}
                </Text>
                <Text className="text-base text-theme-text-secondary">
                  {t('stats.timesUnit', { count: habit.count })}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text className="text-center text-theme-text-secondary text-sm">
            {t('stats.habitEmpty', { count: year })}
          </Text>
        )}
      </View>
      <InfoNotice>{t('stats.freeNotice')}</InfoNotice>
    </View>
  );
}
