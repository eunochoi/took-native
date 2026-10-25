import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
const navigationPreview = require('../../../assets/onboarding/navigation.png');

export function UsagePage({ imageWidth }: { imageWidth: number }) {
  const { rem, iconSizes } = useAppTheme();
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          편리하게 사용해요
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          빠른 이동과 알림으로 기록을 더 편하게 챙겨요.
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <View className="items-center gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            아래 메뉴를 한 번 더 눌러요
          </Text>
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
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
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
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            잊지 않도록 알림을 받아요
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            일기·습관·거리두기를 잊지 않도록{'\n'}원하는 시간에 알려드려요.
          </Text>
          <View className="max-w-full flex-row items-center gap-2 rounded-full bg-theme-surface px-4 py-2">
            <AppIcon
              name="settings"
              size={iconSizes.sm}
              className="text-theme-accent"
              accessible={false}
            />
            <Text className="min-w-0 shrink text-center text-[10.5px] leading-[14px] text-theme-text-secondary">
              설정의 기록 알림에서 시간을 정해보세요.
            </Text>
          </View>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        알림 시간은 설정에서 언제든 바꿀 수 있어요.
      </InfoNotice>
    </View>
  );
}
