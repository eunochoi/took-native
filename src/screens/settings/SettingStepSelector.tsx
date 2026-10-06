import { AppIcon } from '../../components/AppIcon';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function SettingStepSelector<T extends string>({
  value,
  values,
  labels,
  label,
  disabled,
  onChange,
}: {
  value: T;
  values: readonly T[];
  labels: Record<T, string>;
  label: string;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  const index = values.indexOf(value);
  return (
    <View className="flex-row items-center justify-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 이전`}
        accessibilityState={{ disabled: disabled || index === 0 }}
        disabled={disabled || index === 0}
        hitSlop={8}
        onPress={() => onChange(values[index - 1])}
        className={`items-center justify-center ${disabled || index === 0 ? 'opacity-30' : 'opacity-100'} active:opacity-65`}
      >
        <AppIcon
          name="chevron-left"
          size={iconSizes.lg}
          color={index === 0 ? colors.textDisabled : colors.accent}
        />
      </Pressable>
      <Text
        accessibilityLiveRegion="polite"
        className="min-w-12 text-center text-base text-theme-accent"
      >
        {labels[value]}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 다음`}
        accessibilityState={{ disabled: disabled || index === values.length - 1 }}
        disabled={disabled || index === values.length - 1}
        hitSlop={8}
        onPress={() => onChange(values[index + 1])}
        className={`items-center justify-center ${disabled || index === values.length - 1 ? 'opacity-30' : 'opacity-100'} active:opacity-65`}
      >
        <AppIcon
          name="chevron-right"
          size={iconSizes.lg}
          color={index === values.length - 1 ? colors.textDisabled : colors.accent}
        />
      </Pressable>
    </View>
  );
}
