import { View } from 'react-native';
import { Text } from '../../components/Text';

export function HabitYearChart({ monthly }: { monthly: number[] }) {
  const max = Math.max(...monthly, 1);
  return (
    <View className="py-4">
      <View className="min-h-[200px] flex-row items-end">
        {monthly.map((count, index) => (
          <View key={index} className="flex-1 min-w-0 items-center gap-1.5">
            <View className="h-[178px] w-full items-center justify-end gap-1.5">
              <Text className="min-h-[18px] text-sm text-theme-text-tertiary">
                {count > 0 ? count : ''}
              </Text>
              <View
                className={`w-3/5 max-w-5 rounded-[3px] ${count > 0 ? 'bg-theme-accent' : 'bg-theme-text-primary/15'}`}
                style={{ height: count ? Math.max((count / max) * 160, 8) : 4 }}
              />
            </View>
            <Text className="text-sm text-theme-text-tertiary">{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
