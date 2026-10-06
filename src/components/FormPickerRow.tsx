import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { AppIcon } from './AppIcon';
import { Text } from './Text';
import { useAppTheme } from '../theme/AppThemeProvider';

export function FormPickerRow({
  label,
  accessibilityLabel,
  leading,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  leading?: ReactNode;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 flex-row items-center gap-3 bg-transparent px-2 py-2 active:opacity-70 ${disabled ? 'opacity-40' : 'opacity-100'}`}
    >
      {leading}
      <Text className="flex-1 text-base text-theme-text-primary">{label}</Text>
      <AppIcon name="chevron-right" size={iconSizes.md} color={colors.textSecondary} />
    </Pressable>
  );
}
