import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';

export function FormSubmitButton({
  label,
  loading = false,
  disabled,
  className,
  accessibilityState,
  ...props
}: Omit<PressableProps, 'children'> & { label: string; loading?: boolean }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: !!disabled, busy: loading }}
      disabled={disabled}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-theme-accent px-5 ${disabled ? 'opacity-50' : 'opacity-100'} ${className ?? ''}`}
    >
      {loading && <ActivityIndicator size="small" color="white" />}
      <Text className="text-base text-theme-text-on-accent">{label}</Text>
    </Pressable>
  );
}
