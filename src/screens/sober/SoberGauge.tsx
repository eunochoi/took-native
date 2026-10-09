import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { SoberIcon } from '../../components/SoberIcon';
import { ProgressBar } from '../../components/ProgressBar';
import { Text } from '../../components/Text';
import type { HabitIconColorKey } from '../../domain/constants';
import type { SoberIconKey } from '../../domain/sober';
import { formatSoberDuration, formatSoberGoal } from '../../domain/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SoberGauge({
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
  const { rem: appRem } = useAppTheme();
  return (
    <View className="w-full items-center gap-6">
      <SoberIcon name={iconKey} colorKey={iconColor} size={appRem * 5} />
      <View className="w-full items-center gap-1">
        <Text className="text-center text-2xl font-bold text-theme-text-primary">
          {formatSoberDuration(duration)}
        </Text>
        <Text className="text-center text-base text-theme-text-secondary">
          {format(parseISO(start), 'yy년 M월 d일 HH:mm')} 시작
        </Text>
      </View>
      <ProgressBar
        value={progress}
        accessibilityLabel={`목표 ${formatSoberGoal(goalDays)}`}
      />
    </View>
  );
}
