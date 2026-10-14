import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function BottomSheetHeader({
  title,
  titleIcon,
  titleAction,
  menuAction,
  onClose,
}: {
  title?: string;
  titleIcon?: ReactNode;
  titleAction?: {
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
  };
  menuAction?: ReactNode;
  onClose?: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <View className="shrink-0 items-center ">
      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={() => onClose()}
          className="h-9 w-9 items-center justify-center rounded-full"
          hitSlop={4}
        >
          <AppIcon name="chevron-down" size={iconSizes.lg} color={colors.accent} />
        </Pressable>
      )}
      {(title || titleIcon || menuAction) && (
        <View className="self-stretch flex-row items-center gap-2 py-1">
          {menuAction && <View className="-ml-2 w-11 shrink-0" />}
          <View className="flex-1 min-w-0 flex-row items-center justify-center gap-2">
            {titleIcon}
            {titleAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={titleAction.accessibilityLabel}
                accessibilityState={{ disabled: !!titleAction.disabled }}
                disabled={titleAction.disabled}
                onPress={() => {
                  if (!titleAction.disabled) titleAction.onPress();
                }}
                className="min-h-11 min-w-0 shrink flex-row items-center justify-center gap-1.5 px-2 active:opacity-70"
              >
                <View style={{ width: iconSizes.md }} className="shrink-0" accessible={false} />
                <Text
                  numberOfLines={1}
                  className="min-w-0 shrink text-center text-lg font-semibold tracking-tight"
                >
                  {title}
                </Text>
                <View
                  style={{ width: iconSizes.md }}
                  className="shrink-0 items-center"
                  accessible={false}
                >
                  <AppIcon
                    name="chevron-right"
                    size={iconSizes.md}
                    className="text-theme-text-secondary"
                  />
                </View>
              </Pressable>
            ) : (
              <Text
                accessibilityRole="header"
                className="shrink text-center text-lg font-semibold tracking-tight"
              >
                {title}
              </Text>
            )}
          </View>
          {menuAction && <View className="-mr-2 w-11 shrink-0 items-center">{menuAction}</View>}
        </View>
      )}
    </View>
  );
}
