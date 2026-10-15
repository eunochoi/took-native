import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { Text } from './Text';

export function FilterSheet({
  title,
  children,
  onClose,
  onReset,
  onApply,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const { iconSizes, rem } = useAppTheme();
  return (
    <BottomSheetModal
      visible
      title={title}
      scrollFade
      contentBottomPadding={rem}
      onClose={onClose}
      footer={(close) => (
        <View className="gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 초기화"
            onPress={onReset}
            className="min-h-12 self-center flex-row items-center justify-center gap-1.5 px-4 active:opacity-70"
          >
            <AppIcon name="restart-alt" size={iconSizes.md} className="text-theme-accent" />
            <Text className="text-base text-theme-text-secondary">초기화</Text>
          </Pressable>
          <Button
            className="w-full"
            label="적용하기"
            accessibilityLabel={`${title} 적용`}
            onPress={() => close(onApply)}
          />
        </View>
      )}
    >
      <View className="gap-6">{children}</View>
    </BottomSheetModal>
  );
}
