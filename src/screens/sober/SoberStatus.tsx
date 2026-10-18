import { adjustColorBrightness } from '../../theme/colors';
import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { ProgressBar } from '../../components/ProgressBar';
import { SoberIcon } from '../../components/SoberIcon';
import { Text } from '../../components/Text';
import { resolveIconColor, type HabitIconColorKey } from '../../domain/constants';
import type { SoberIconKey } from '../../domain/sober';
import { formatSoberDuration, formatSoberGoal } from '../../domain/sober';
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
  const { colors, rem: appRem } = useAppTheme();
  return (
    <View className="w-full items-center gap-8">
      <View className="w-20 items-center gap-1">
        <SoberIcon name={iconKey} colorKey={iconColor} size={appRem * 5} />
        <ProgressBar
          className="h-3"
          value={progress}
          color={adjustColorBrightness(resolveIconColor(iconColor, colors.accent), 0.15)}
          accessibilityLabel={`목표 ${formatSoberGoal(goalDays)}`}
        />
      </View>
      <View className="w-full items-center gap-1">
        <Text className="text-center text-2xl font-bold text-theme-text-primary">
          {formatSoberDuration(duration)}
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          {format(parseISO(start), 'yy년 M월 d일 HH:mm')} 시작
        </Text>
      </View>
    </View>
  );
}
