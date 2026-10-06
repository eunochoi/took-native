import { View } from 'react-native';

export function HomeStatsSkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="선택한 기록 불러오는 중"
      accessibilityState={{ busy: true }}
      className="w-full gap-6"
    >
      <View className="flex-row items-center justify-between gap-3 py-2">
        <View className="h-7 w-24 rounded bg-theme-skeleton" />
        <View className="h-5 w-24 rounded bg-theme-skeleton" />
      </View>
      {[0, 1, 2].map((index) => (
        <View key={index} className="flex-row items-center gap-4 py-3">
          <View className="h-12 w-12 rounded-full bg-theme-skeleton" />
          <View className="flex-1 gap-2">
            <View className="h-5 w-3/4 rounded bg-theme-skeleton" />
            <View className="h-4 w-1/2 rounded bg-theme-skeleton" />
          </View>
        </View>
      ))}
    </View>
  );
}
