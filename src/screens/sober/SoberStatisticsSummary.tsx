import { parseISO } from 'date-fns';
import { View } from 'react-native';
import { Text } from '../../components/Text';
import { type getSoberSummary } from '../../domain/sober';
import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { formatSoberGoal } from '../../i18n/sober';
import { ACCENT_CARD_BORDER_CLASS_NAME } from '../../theme/classes';

export function SoberStatisticsSummary({
  summary,
  initialStartedAt,
}: {
  summary: ReturnType<typeof getSoberSummary>;
  initialStartedAt: string;
}) {
  const { t, language, formatLocale } = useI18n();

  const longestMinutes = Math.max(0, Math.floor(summary.longest / 60000));
  const initialStart = parseISO(initialStartedAt);
  return (
    <View
      className={`${ACCENT_CARD_BORDER_CLASS_NAME} self-stretch flex-row py-2 mx-1 bg-theme-accent-light/50 ios:curve-continuous rounded-theme`}
    >
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
          className={`flex-1 min-w-0 items-center gap-2.5 px-1 py-2 border-theme-border/50 ${index > 0 ? 'border-l' : 'border-l-0'}`}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="tracking-tighter text-sm text-theme-accent font-bold"
          >
            {stat.label}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            className="tracking-tighter w-full text-center text-xl font-bold leading-none text-theme-text-primary"
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
      ))}
    </View>
  );
}
