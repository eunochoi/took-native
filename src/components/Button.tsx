import { type PressableProps, Pressable } from 'react-native';
import { Text } from './Text';
export function Button({
  label,
  subtle,
  outline = false,
  danger,
  selected,
  className,
  labelWeight = 'semibold',
  ...props
}: PressableProps & {
  label: string;
  subtle?: boolean;
  outline?: boolean;
  danger?: boolean;
  selected?: boolean;
  labelWeight?: 'normal' | 'semibold';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!props.disabled, selected }}
      {...props}
      className={`min-h-12 items-center justify-center rounded-full px-5 py-3 active:opacity-65 ${props.disabled ? 'opacity-40' : 'opacity-100'} ${outline ? `bg-transparent border ${danger ? 'border-theme-danger' : subtle && !selected ? 'border-theme-border' : 'border-theme-accent'}` : selected ? 'bg-theme-accent' : danger ? 'bg-theme-danger' : subtle ? 'bg-theme-surface-muted' : 'bg-theme-accent'} ${className ?? ''}`}
    >
      <Text
        className={`text-base ${labelWeight === 'normal' ? 'font-normal' : 'font-semibold'} ${outline ? (danger ? 'text-theme-danger' : subtle && !selected ? 'text-theme-text-primary' : 'text-theme-accent') : selected || danger || !subtle ? 'text-theme-text-on-accent' : 'text-theme-text-primary'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
