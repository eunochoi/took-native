import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function BottomSheetHeader({
  title,
  titleIcon,
  menuAction,
  onClose,
}: {
  title: string;
  titleIcon?: ReactNode;
  menuAction?: ReactNode;
  onClose: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
    <View className="shrink-0 items-center ">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={() => onClose()}
        className="h-9 w-9 items-center justify-center rounded-full"
        hitSlop={4}
      >
        <AppIcon name="chevron-down" size={iconSizes.lg} color={colors.accent} />
      </Pressable>
      <View className="self-stretch flex-row items-center gap-2 pb-2 mb-4">
        {menuAction && <View className="w-11 shrink-0" />}
        <View className="flex-1 min-w-0 flex-row items-center justify-center gap-2">
          {titleIcon}
          <Text
            accessibilityRole="header"
            className="shrink text-center text-lg font-semibold tracking-tight"
          >
            {title}
          </Text>
        </View>
        {menuAction && <View className="-mr-2 w-11 shrink-0 items-center">{menuAction}</View>}
      </View>
    </View>
  );
}
