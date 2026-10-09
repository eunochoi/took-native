import { View } from 'react-native';
import { Text } from '../../components/Text';

export function HabitStatisticsSummary({
  stats,
  unavailable,
}: {
  stats: { label: string; value: number | string; unit: string }[];
  unavailable: boolean;
}) {
  return (
    <View className="flex-row py-4 bg-theme-accent-light/50 rounded-theme">
      {stats.map((stat, index) => (
        <View
          key={stat.label}
          className={`flex-1 gap-1 px-2 items-center ${index > 0 ? 'border-l border-theme-border/60' : ''}`}
        >
          <Text className="text-sm text-theme-text-secondary">{stat.label}</Text>
          <Text className="text-2xl font-bold text-theme-accent">
            {unavailable ? '—' : stat.value}
            <Text className="text-sm font-semibold text-theme-text-secondary"> {stat.unit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}
