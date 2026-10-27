import { useI18n } from '../../i18n/react';
import { View } from 'react-native';

export function DiaryListSkeleton() {
  const { t } = useI18n();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('diary.loading')}
      accessibilityState={{ busy: true }}
      className="w-full"
      style={{ paddingHorizontal: '5%' }}
    >
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          className={`gap-4 ${index === 2 ? 'pb-0' : 'pb-6'} ${index === 0 ? 'pt-0 border-t-0' : 'pt-6 border-t border-theme-border/50'}`}
        >
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 ios:curve-continuous rounded-full bg-theme-skeleton" />
            <View className="min-w-0 flex-1 gap-0.5">
              <View className="h-6 w-36 max-w-full ios:curve-continuous rounded bg-theme-skeleton" />
              <View className="h-5 w-24 max-w-full ios:curve-continuous rounded bg-theme-skeleton" />
            </View>
            <View className="h-5 w-1 ios:curve-continuous rounded-full bg-theme-skeleton" />
          </View>
          <View className="py-2 px-1">
            {[0, 1, 2].map((line) => (
              <View key={line} className="h-7 justify-center">
                <View
                  className={`h-4 ios:curve-continuous rounded bg-theme-skeleton ${line === 2 ? 'w-2/3' : 'w-full'}`}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
