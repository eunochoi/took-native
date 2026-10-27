import { useI18n } from '../../i18n/react';
import { View } from 'react-native';

export function HomeStatsSkeleton() {
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.recordsLoading')}
      accessibilityState={{ busy: true }}
      className="w-full gap-6"
    >
      <View className="flex-row items-center justify-between gap-3 py-2">
        <View className="h-7 w-24 ios:curve-continuous rounded bg-theme-skeleton" />
        <View className="h-5 w-24 ios:curve-continuous rounded bg-theme-skeleton" />
      </View>
      {[0, 1, 2].map((index) => (
        <View key={index} className="flex-row items-center gap-4 py-3">
          <View className="h-12 w-12 ios:curve-continuous rounded-full bg-theme-skeleton" />
          <View className="flex-1 gap-2">
            <View className="h-5 w-3/4 ios:curve-continuous rounded bg-theme-skeleton" />
            <View className="h-4 w-1/2 ios:curve-continuous rounded bg-theme-skeleton" />
          </View>
        </View>
      ))}
    </View>
  );
}
