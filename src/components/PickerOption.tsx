import { Pressable } from 'react-native';
import type { ReactNode } from 'react';

export function PickerOption({
  selected,
  compact = false,
  dense = false,
  selectionOnly = false,
  disabled = false,
  accessibilityLabel,
  onPress,
  children,
}: {
  selected: boolean;
  compact?: boolean;
  dense?: boolean;
  selectionOnly?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`items-center justify-center ${dense ? 'gap-1' : 'gap-2'} border bg-transparent ${selectionOnly ? 'rounded-theme' : 'rounded-2xl'} active:opacity-70 ${disabled ? 'opacity-40' : 'opacity-100'} ${dense ? 'min-h-12 px-1 py-2' : compact ? 'min-h-12 px-1 py-3' : 'min-h-16 p-4'} ${selected ? 'border-theme-accent' : selectionOnly ? 'border-transparent' : 'border-theme-border'}`}
    >
      {children}
    </Pressable>
  );
}
