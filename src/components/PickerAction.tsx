import { MUTED_DESCRIPTION_CLASS_NAME } from '../theme/classes';
import type { ComponentProps } from 'react';
import { AppIcon } from './AppIcon';
import { View, Pressable } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { Text } from './Text';

export function PickerAction({
  icon,
  title,
  description,
  note,
  danger = false,
  disabled = false,
  selected,
  onPress,
}: {
  icon: ComponentProps<typeof AppIcon>['name'];
  title: string;
  description: string;
  note?: string;
  danger?: boolean;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-16 flex-row items-center gap-4 rounded-2xl p-4 active:opacity-70 ${disabled ? 'opacity-40' : 'opacity-100'} bg-transparent border ${selected ? 'border-theme-accent' : 'border-theme-border'}`}
    >
      <AppIcon name={icon} size={iconSizes.lg} color={danger ? colors.danger : colors.accent} />
      <View className="flex-1 gap-1">
        <Text
          className={`text-base font-semibold ${danger ? 'text-theme-danger' : selected ? 'text-theme-accent' : 'text-theme-text-primary'}`}
        >
          {title}
        </Text>
        <Text className={MUTED_DESCRIPTION_CLASS_NAME}>{description}</Text>
        {!!note && (
          <Text className="mt-1 text-xs leading-relaxed text-theme-text-tertiary">{note}</Text>
        )}
      </View>
      <AppIcon name="chevron-right" size={iconSizes.md} color={colors.textTertiary} />
    </Pressable>
  );
}
