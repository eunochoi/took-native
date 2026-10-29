import { ACCENT_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function HabitStatisticsSummary({
  stats,
  unavailable,
}: {
  stats: {
    label: string;
    icon: ComponentProps<typeof AppIcon>['name'];
    value: number | string;
    unit: string;
  }[];
  unavailable: boolean;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <View
      className={`${ACCENT_CARD_BORDER_CLASS_NAME} flex-row py-2 mx-1 bg-theme-accent-light/50 ios:curve-continuous rounded-theme`}
    >
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 items-center gap-2.5 py-2 border-theme-border/50 ${index > 0 ? 'border-l' : 'border-l-0'}`}
        >
          <AppIcon name={stat.icon} size={iconSizes.lg} color={colors.accent} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            className="w-full px-1 text-center text-theme-text-secondary text-sm"
          >
            {stat.label}
          </Text>
          <View className="flex-row items-baseline gap-1">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              className="text-theme-text-primary font-bold text-2xl leading-none"
            >
              {unavailable ? '—' : stat.value}
            </Text>
            <Text className="text-theme-text-secondary font-bold text-sm">{stat.unit}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
