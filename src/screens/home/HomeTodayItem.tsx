import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';

export function HomeTodayItem({
  title,
  status,
  pending,
  disabled,
  accessibilityLabel,
  onPress,
  children,
}: {
  title: string;
  status: string;
  pending: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={pending ? `${title} 확인 중` : accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      className="min-w-0 items-center gap-2 px-1 active:opacity-70"
    >
      <Text className="text-center text-sm leading-5 font-semibold text-theme-text-secondary">
        {title}
      </Text>
      <View
        className="h-16 w-full items-center justify-center"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {pending ? <View className="h-14 w-14 rounded-full bg-theme-skeleton" /> : children}
      </View>
      <View className="min-h-5 w-full items-center justify-start">
        {pending ? (
          <View className="h-5 w-3/4 rounded-lg bg-theme-skeleton" />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            ellipsizeMode="tail"
            className="w-full text-center text-sm leading-5 text-theme-text-secondary"
          >
            {status}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
