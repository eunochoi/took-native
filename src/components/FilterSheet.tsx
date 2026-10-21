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
  resetInHeader = false,
}: {
  resetInHeader?: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
}) {
  const { iconSizes } = useAppTheme();
  const resetButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="선택 초기화"
      onPress={onReset}
      hitSlop={resetInHeader ? 6 : undefined}
      className={
        resetInHeader
          ? 'min-h-9 flex-row items-center justify-center gap-1 px-1 active:opacity-70'
          : 'min-h-12 self-center flex-row items-center justify-center gap-1.5 px-4 active:opacity-70'
      }
    >
      <AppIcon name="restart-alt" size={iconSizes.md} className="text-theme-accent" />
      <Text
        className={
          resetInHeader
            ? 'text-sm text-theme-text-secondary'
            : 'text-base text-theme-text-secondary'
        }
      >
        초기화
      </Text>
    </Pressable>
  );
  return (
    <BottomSheetModal
      visible
      title={title}
      headerAction={resetInHeader ? resetButton : undefined}
      scrollFade
      onClose={onClose}
      footer={(close) => (
        <View className="gap-4">
          {!resetInHeader && resetButton}
          <Button
            className="w-full"
            label="적용하기"
            accessibilityLabel={`${title} 적용`}
            onPress={() => close(onApply)}
          />
        </View>
      )}
    >
      <View className="gap-7">{children}</View>
    </BottomSheetModal>
  );
}
