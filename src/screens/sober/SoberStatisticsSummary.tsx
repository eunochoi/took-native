import { formatDisplayDate } from '../../i18n/format';
import { formatSoberGoal } from '../../i18n/sober';
import { useI18n } from '../../i18n/react';
import { parseISO } from 'date-fns';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { type getSoberSummary } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberStatisticsSummary({
  summary,
  initialStartedAt,
}: {
  summary: ReturnType<typeof getSoberSummary>;
  initialStartedAt: string;
}) {
  const { t, language, formatLocale } = useI18n();

  const { rem: appRem } = useAppTheme();
  const longestMinutes = Math.max(0, Math.floor(summary.longest / 60000));
  const initialStart = parseISO(initialStartedAt);
  return (
    <View className="w-full flex-row">
      {(
        [
          {
            icon: 'flag',
            label: t('sober.progress'),
            value: `${summary.progress.toFixed(0)}%`,
            note: t('sober.goalLabel', { value: formatSoberGoal(summary.goalDays, language) }),
          },
          {
            icon: 'play-circle-outline',
            label: t('sober.firstStart'),
            value: formatDisplayDate(initialStartedAt, formatLocale, 'dayShort'),
            note: t('home.year', { count: initialStart.getFullYear() }),
          },
          {
            icon: 'emoji-events',
            label: t('sober.longest'),
            value: t('sober.dayCount', { count: Math.floor(longestMinutes / 1440) }),
            note: t('sober.hoursMinutes', {
              value: Math.floor((longestMinutes % 1440) / 60),
              count: longestMinutes % 60,
            }),
          },
        ] as const
      ).map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 min-w-0 items-center gap-2.5 px-1 py-3 border-theme-border-muted ${index < 2 ? 'border-r' : ''}`}
        >
          <View className="flex-col gap-1.5 items-center">
            <AppIcon name={stat.icon} size={appRem * 1.7} className="text-theme-accent" />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter text-sm text-theme-text-secondary"
            >
              {stat.label}
            </Text>
          </View>
          <View className="flex gap-0.5 items-center">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter w-full text-center text-xl font-bold leading-snug text-theme-text-primary"
            >
              {stat.value}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="tracking-tighter w-full text-center text-sm text-theme-text-secondary"
            >
              {stat.note}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
