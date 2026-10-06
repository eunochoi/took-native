import { View } from 'react-native';

export function HabitListSkeleton() {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="습관 기록 불러오는 중"
      accessibilityState={{ busy: true }}
      className="w-full"
    >
      <View className="gap-4 px-2 mb-8">
        <View className="flex-row items-center justify-between gap-3">
          <View className="gap-2">
            <View className="h-7 w-32 rounded bg-theme-skeleton" />
            <View className="h-6 w-24 rounded bg-theme-skeleton" />
          </View>
          <View className="h-12 w-20 rounded bg-theme-skeleton" />
        </View>
        <View className="h-5 w-full rounded-full bg-theme-skeleton" />
      </View>
      <View className="flex-row flex-wrap">
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            className={`w-1/2 border-theme-border/60 ${index < 2 ? 'border-t-0' : 'border-t'} ${index % 2 === 0 ? 'border-l-0' : 'border-l'}`}
          >
            <View className="gap-4 px-2 py-4">
              <View>
                <View className="items-center gap-2 mb-2">
                  <View className="h-8 w-8 rounded-full bg-theme-skeleton" />
                  <View className="h-6 w-3/4 rounded bg-theme-skeleton" />
                </View>
                <View className="flex-row items-center justify-center gap-3">
                  <View className="h-5 w-12 rounded bg-theme-skeleton" />
                  <View className="h-3 w-10 rounded bg-theme-skeleton" />
                </View>
              </View>
              <View className="flex-row justify-around">
                {[0, 1, 2, 3].map((day) => (
                  <View key={day} className="items-center gap-1">
                    <View className="h-5 w-4 rounded bg-theme-skeleton" />
                    <View className="h-5 w-4 rounded bg-theme-skeleton" />
                    <View className="mt-1 h-5 w-5 rounded-md bg-theme-skeleton" />
                  </View>
                ))}
              </View>
              <View className="h-10 w-full rounded-xl bg-theme-skeleton" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
