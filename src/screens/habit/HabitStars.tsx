import { useI18n } from '../../i18n/react';
import { View } from 'react-native';
import { StarIcon } from '../../components/StarIcon';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function HabitStars({
  priority,
  size,
  color,
  className,
  accessibilityLabel,
}: {
  priority: number;
  size?: number;
  color?: string;
  className?: string;
  accessibilityLabel?: string;
}) {
  const { t } = useI18n();

  const { colors, rem: appRem } = useAppTheme();
  return (
    <View
      className={`flex-row gap-0.5 ${className ?? ''}`}
      accessibilityLabel={
        accessibilityLabel ??
        (priority === 0 ? t('habit.free') : t('habit.stars', { count: priority }))
      }
    >
      {[0, 1, 2].map((index) => (
        <StarIcon
          key={index}
          size={size ?? appRem * 0.875}
          color={index < priority ? (color ?? colors.accent) : `${colors.textDisabled}B3`}
        />
      ))}
    </View>
  );
}
