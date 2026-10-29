import { useI18n } from '../../i18n/react';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { AnalysisHeader } from './AnalysisHeader';
import { DiaryStatisticsSummary } from './DiaryStatisticsSummary';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import type { getDiaryStats } from '../../db/stats';
import { InfoNotice } from '../../components/InfoNotice';
import { useAppTheme } from '../../theme/AppThemeProvider';
export function DiaryAnalysis({
  stats,
  year,
}: {
  stats: Awaited<ReturnType<typeof getDiaryStats>>;
  year: number;
}) {
  const { t } = useI18n();
  const currentYear = year === new Date().getFullYear();
  const { rem } = useAppTheme();

  const max = Math.max(...stats.monthly, 1);
  return (
    <View className="gap-4">
      <AnalysisHeader title={t('stats.diaryTitle')}>
        {t('stats.yearCount', { title: year, count: stats.total })}
      </AnalysisHeader>
      <DiaryStatisticsSummary
        current={stats.current}
        longest={stats.longest}
        monthlyAverage={stats.monthlyAverage}
      />
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} mx-1 px-4 py-4 flex-row bg-theme-surface-muted/60 ios:curve-continuous rounded-theme`}
      >
        {stats.monthly.map((count, index) => (
          <View key={index} className="flex-1 items-center gap-1.5">
            <View className="h-40 justify-end items-center gap-1">
              {count > 0 && (
                <Text className="text-theme-text-secondary text-sm font-medium leading-none">
                  {count}
                </Text>
              )}
              <View
                style={{
                  height: count > 0 ? Math.max((count / max) * rem * 7.5, rem * 0.5) : rem * 0.25,
                }}
                className={`w-3 ios:curve-continuous rounded-[3px] ${count > 0 ? 'bg-theme-accent' : 'bg-theme-text-primary/15'}`}
              />
            </View>
            <Text className="text-theme-text-secondary text-sm">{index + 1}</Text>
          </View>
        ))}
      </View>
      <View className="gap-2">
        <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
          {t('stats.streakNotice')}
        </InfoNotice>
        <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
          {t('stats.averageNotice', {
            end: t(currentYear ? 'stats.averageCurrentMonth' : 'stats.averageDecember'),
          })}
        </InfoNotice>
      </View>
    </View>
  );
}
