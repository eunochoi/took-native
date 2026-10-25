import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
const navigationPreview = require('../../../assets/onboarding/navigation.png');

export function UsagePage({ imageWidth }: { imageWidth: number }) {
  const { rem, iconSizes } = useAppTheme();
  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          편리하게 사용해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          빠른 이동과 알림으로 기록을 더 편하게 챙겨요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <View className="items-center gap-2">
          <Text className="text-center text-base font-semibold">아래 메뉴를 한 번 더 눌러요</Text>
          <Image
            source={navigationPreview}
            accessibilityLabel="현재 메뉴를 원형 점선으로 표시한 네비게이션 바"
            resizeMode="contain"
            style={{
              width: imageWidth,
              height:
                (imageWidth * Image.resolveAssetSource(navigationPreview).height) /
                Image.resolveAssetSource(navigationPreview).width,
            }}
          />
          <Text className="text-center text-sm text-theme-text-secondary">
            지금 보고 있는 메뉴를 다시 누르면{'\n'}화면 맨 위로 이동해요.
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-theme-accent-light">
            <AppIcon
              name="notifications"
              size={rem * 1.75}
              className="text-theme-accent"
              accessible={false}
            />
          </View>
          <Text className="text-center text-base font-semibold">잊지 않도록 알림을 받아요</Text>
          <Text className="text-center text-sm text-theme-text-secondary">
            일기·습관·거리두기를 잊지 않도록{'\n'}원하는 시간에 알려드려요.
          </Text>
          <View className="max-w-full flex-row items-center gap-2 rounded-full bg-theme-surface px-4 py-2">
            <AppIcon
              name="settings"
              size={iconSizes.sm}
              className="text-theme-accent"
              accessible={false}
            />
            <Text className="min-w-0 shrink text-center text-xs text-theme-text-secondary">
              설정의 기록 알림에서 시간을 정해보세요.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
