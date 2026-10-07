import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from './Text';

export function QueryError({
  message,
  onRetry,
  className,
  retryAccessibilityLabel = '다시 시도',
}: {
  message?: string;
  onRetry: () => void;
  className?: string;
  retryAccessibilityLabel?: string;
}) {
  return (
    <View className={twMerge('items-center justify-center gap-3', className)}>
      {message && (
        <Text accessibilityRole="alert" className="text-center text-sm text-theme-text-secondary">
          {message}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryAccessibilityLabel}
        className="min-h-11 justify-center active:opacity-70"
        onPress={onRetry}
      >
        <Text className="text-base text-theme-accent">다시 시도</Text>
      </Pressable>
    </View>
  );
}
