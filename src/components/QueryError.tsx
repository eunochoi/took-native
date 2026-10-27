import { translateErrorMessage } from '../i18n/errors';
import { useI18n } from '../i18n/react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from './Text';

export function QueryError({
  message,
  onRetry,
  className,
  retryAccessibilityLabel,
}: {
  message?: string;
  onRetry: () => void;
  className?: string;
  retryAccessibilityLabel?: string;
}) {
  const { t, language } = useI18n();
  return (
    <View className={twMerge('items-center justify-center gap-3', className)}>
      {message && (
        <Text accessibilityRole="alert" className="text-center text-sm text-theme-text-secondary">
          {translateErrorMessage(message, language)}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryAccessibilityLabel ?? t('common.retry')}
        className="min-h-11 justify-center active:opacity-70"
        onPress={onRetry}
      >
        <Text className="text-base text-theme-accent">{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
