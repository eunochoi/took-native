import { useI18n } from '../i18n/react';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function BottomSheetHeader({
  title,
  titleIcon,
  titleAction,
  headerAction,
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
  headerAction?: ReactNode;
  menuAction?: ReactNode;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const { iconSizes } = useAppTheme();
  return (
    <View className="shrink-0 items-center ">
      {onClose && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={() => onClose()}
          className="h-9 w-9 items-center justify-center ios:curve-continuous rounded-full"
          hitSlop={4}
        >
          <View className="h-1 w-8 ios:curve-continuous rounded-full bg-theme-accent" />
        </Pressable>
      )}
      {(title || titleIcon || menuAction || headerAction) && (
        <View
          className={`relative self-stretch flex-row items-center gap-2 py-1 ${headerAction ? 'px-20' : ''}`}
        >
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
          {headerAction && <View className="absolute right-0 items-center">{headerAction}</View>}
        </View>
      )}
    </View>
  );
}
