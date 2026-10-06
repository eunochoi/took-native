import { View } from 'react-native';
import { Text } from '../../components/Text';

export function HabitTodayProgress({ done, total }: { done: number; total: number }) {
  const rate = total ? Math.round((done / total) * 100) : 0;
  return (
    <View className="gap-4 px-2 mb-8">
      <View className="flex-row items-center justify-between gap-3">
        <View className="gap-2">
          <Text accessibilityRole="header" className="text-xl font-semibold">
            오늘의 습관
          </Text>
          <Text className="text-base text-theme-text-tertiary">
            {total}개 중 {done}개 완료
          </Text>
        </View>
        <Text className="text-5xl font-semibold text-theme-accent">{rate}%</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="오늘의 습관"
        accessibilityValue={{ min: 0, max: 100, now: rate, text: `${done}/${total} 완료` }}
        className="h-5 w-full overflow-hidden rounded-full bg-theme-accent/15"
      >
        <View className="h-full rounded-full bg-theme-accent" style={{ width: `${rate}%` }} />
      </View>
    </View>
  );
}
