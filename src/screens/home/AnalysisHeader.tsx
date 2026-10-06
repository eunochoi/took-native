import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '../../components/Text';

export function AnalysisHeader({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3 py-2">
      <Text accessibilityRole="header" className="font-bold text-xl">
        {title}
      </Text>
      <Text className="text-theme-accent text-sm font-medium">{children}</Text>
    </View>
  );
}
