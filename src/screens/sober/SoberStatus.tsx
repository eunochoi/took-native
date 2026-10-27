import { formatDisplayDate } from '../../i18n/format';
import { formatSoberDuration, formatSoberGoal } from '../../i18n/sober';
import { useI18n } from '../../i18n/react';
import { adjustColorBrightness } from '../../theme/colors';
import { View } from 'react-native';
import { ProgressBar } from '../../components/ProgressBar';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import { resolveIconColor, type HabitIconColorKey } from '../../domain/constants';
import type { SoberIconKey } from '../../domain/sober';

import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberStatus({
  progress,
  goalDays,
  duration,
  start,
  iconKey,
  iconColor,
}: {
  progress: number;
  goalDays: number;
  duration: number;
  start: string;
  iconKey: SoberIconKey;
  iconColor: HabitIconColorKey;
}) {
  const { t, language, formatLocale } = useI18n();

  const { colors, rem: appRem } = useAppTheme();
  return (
    <View className="w-full items-center gap-8">
      <View className="w-20 items-center gap-1">
        <SoberIcon name={iconKey} colorKey={iconColor} size={appRem * 5} />
        <ProgressBar
          className="h-3"
          value={progress}
          color={adjustColorBrightness(resolveIconColor(iconColor, colors.accent), 0.15)}
          accessibilityLabel={t('sober.goalLabel', { value: formatSoberGoal(goalDays, language) })}
        />
      </View>
      <View className="w-full items-center gap-1">
        <Text className="text-center text-2xl font-bold text-theme-text-primary">
          {formatSoberDuration(duration, language)}
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          {t('sober.started', { value: formatDisplayDate(start, formatLocale, 'shortDateTime') })}
        </Text>
      </View>
    </View>
  );
}
