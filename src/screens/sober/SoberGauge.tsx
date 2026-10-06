import { format, parseISO } from 'date-fns';
import { View } from 'react-native';
import { SoberIcon } from '../../components/SoberIcon';
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
  const value = Math.min(100, Math.max(0, progress));
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
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`목표 ${formatSoberGoal(goalDays)}`}
        accessibilityValue={{ min: 0, max: 100, now: value }}
        className="h-6 w-full overflow-hidden rounded-xl bg-theme-border-muted"
      >
        <View className="h-full rounded-xl bg-theme-accent" style={{ width: `${value}%` }} />
      </View>
    </View>
  );
}
