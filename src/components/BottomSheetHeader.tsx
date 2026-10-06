import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function BottomSheetHeader({
  title,
  titleIcon,
  rightAction,
  onClose,
}: {
  title: string;
  titleIcon?: ReactNode;
  rightAction?: ReactNode;
  onClose: () => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  return (
                  <View className="shrink-0 items-center ">
                    {rightAction && <View className="absolute right-0 top-0 z-10">{rightAction}</View>}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="닫기"
                      onPress={() => onClose()}
                      className="h-9 w-9 items-center justify-center rounded-full"
                      hitSlop={4}
                    >
                      <AppIcon name="chevron-down" size={iconSizes.lg} color={colors.accent} />
                    </Pressable>
                    <View className="self-stretch flex-row items-center justify-center gap-2 mx-5 ">
                      {titleIcon}
                      <Text
                        accessibilityRole="header"
                        className="shrink text-center text-xl font-semibold tracking-tight pb-2 mb-4 "
                      >
                        {title}
                      </Text>
                    </View>
                  </View>

  );
}
