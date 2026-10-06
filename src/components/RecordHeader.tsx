import { useAppTheme } from '../theme/AppThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useRouter } from 'expo-router';
import { Text } from './Text';

export function RecordHeader({
  title,
  onBack,
  rightAction,
  backRoute = '/habit',
}: {
  title: string;
  backRoute?: '/habit' | '/sober' | '/diary' | '/';
  onBack?: () => void;
  rightAction?: ReactNode;
}) {
  const { colors, iconSizes } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center bg-theme-surface"
      style={{ paddingHorizontal: '5%', paddingTop: insets.top, height: 56 + insets.top }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
        className="h-11 w-8 justify-center"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace(backRoute)))}
      >
        <AppIcon name="chevron-left" size={iconSizes.md} color={colors.accent} />
      </Pressable>
      <Text
        numberOfLines={1}
        accessibilityRole="header"
        className="flex-1 text-center text-base font-semibold"
      >
        {title}
      </Text>
      <View className="w-8 items-center">{rightAction}</View>
    </View>
  );
}
