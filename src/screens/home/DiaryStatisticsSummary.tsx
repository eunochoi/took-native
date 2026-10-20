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
  const { colors, iconSizes } = useAppTheme();
  return (
    <View className="flex-row">
      {(
        [
          {
            label: '현재 연속 기록',
            icon: 'calendar',
            value: current,
            unit: '일',
          },
          {
            label: '역대 최고 기록',
            icon: 'emoji-events',
            value: longest,
            unit: '일',
          },
          {
            label: '월평균 일기',
            icon: 'description',
            value: Number(monthlyAverage.toFixed(1)),
            unit: '개',
          },
        ] as const
      ).map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 items-center gap-2 py-3 border-theme-border/50 ${index > 0 ? 'border-l' : 'border-l-0'}`}
        >
          <AppIcon name={stat.icon} size={iconSizes.lg} color={colors.accent} />
          <Text className="text-theme-text-secondary text-sm">{stat.label}</Text>
          <View className="flex-row items-baseline gap-1">
            <Text className="text-theme-text-secondary font-bold text-2xl leading-none">
              {stat.value}
            </Text>
            <Text className="text-theme-text-secondary font-bold text-sm">{stat.unit}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
