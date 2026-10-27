import { useI18n } from '../../i18n/react';
import { ACCENT_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function DiaryStatisticsSummary({
  current,
  longest,
  monthlyAverage,
}: {
  current: number;
  longest: number;
  monthlyAverage: number;
}) {
  const { t } = useI18n();

  const { colors, iconSizes } = useAppTheme();
  return (
    <View
      className={`${ACCENT_CARD_BORDER_CLASS_NAME} flex-row py-2 mx-1 bg-theme-accent-light/50 ios:curve-continuous rounded-theme`}
    >
      {(
        [
          {
            label: t('stats.currentStreak'),
            icon: 'calendar',
            value: current,
            unit: t('stats.daysUnit'),
          },
          {
            label: t('stats.longestStreak'),
            icon: 'emoji-events',
            value: longest,
            unit: t('stats.daysUnit'),
          },
          {
            label: t('stats.monthlyAverage'),
            icon: 'description',
            value: Number(monthlyAverage.toFixed(1)),
            unit: t('stats.logsUnit', { count: Number(monthlyAverage.toFixed(1)) }),
          },
        ] as const
      ).map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 items-center gap-2.5 py-2 border-theme-border/50 ${index > 0 ? 'border-l' : 'border-l-0'}`}
        >
          <AppIcon name={stat.icon} size={iconSizes.lg} color={colors.accent} />
          <Text className="text-theme-text-secondary text-sm">{stat.label}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-theme-text-primary font-bold text-2xl leading-none"
            >
              {stat.value}
            </Text>
            <Text className="text-base text-theme-text-secondary">{stat.unit}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
