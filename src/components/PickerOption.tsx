import { Pressable } from 'react-native';
import type { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import {
  SELECTION_BOX_CLASS_NAME,
  CHECKED_BOX_CLASS_NAME,
  UNCHECKED_BOX_CLASS_NAME,
} from '../theme/classes';

export function PickerOption({
  selected,
  keepUncheckedBorder = false,
  checkbox = false,
  compact = false,
  dense = false,
  disabled = false,
  accessibilityLabel,
  className,
  onPress,
  children,
}: {
  selected: boolean;
  keepUncheckedBorder?: boolean;
  checkbox?: boolean;
  compact?: boolean;
  dense?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  className?: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const stateClassName = selected ? CHECKED_BOX_CLASS_NAME : UNCHECKED_BOX_CLASS_NAME;
  return (
    <Pressable
      accessibilityRole={checkbox ? 'checkbox' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...(checkbox ? { checked: selected } : { selected }), disabled }}
      disabled={disabled}
      onPress={onPress}
      className={twMerge(
        SELECTION_BOX_CLASS_NAME,
        stateClassName,
        !selected && keepUncheckedBorder && 'border border-theme-border',
        dense
          ? 'gap-1 min-h-12 px-1 py-2'
          : compact
            ? 'gap-2 min-h-12 px-1 py-3'
            : 'gap-2 min-h-16 p-4',
        disabled ? 'opacity-40' : 'opacity-100',
        className,
      )}
    >
      {children}
    </Pressable>
  );
}
