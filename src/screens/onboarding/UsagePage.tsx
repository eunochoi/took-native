import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
import { formatSoberDuration } from '../../i18n/sober';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
const navigationPreview = require('../../../assets/onboarding/navigation.png');

export function UsagePage({ imageWidth }: { imageWidth: number }) {
  const { t, language } = useI18n();
  const { rem, iconSizes } = useAppTheme();
  const previewWidth = Math.min(imageWidth, rem * 15);
  return (
    <View className="w-full grow justify-evenly gap-4">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.usageTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.usageDescription')}
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <View className="items-center gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.tapAgain')}
          </Text>
          <Image
            source={navigationPreview}
            accessibilityLabel={t('onboarding.navigationImage')}
            resizeMode="contain"
            style={{
              width: previewWidth,
              height:
                (previewWidth * Image.resolveAssetSource(navigationPreview).height) /
                Image.resolveAssetSource(navigationPreview).width,
            }}
          />
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.tapDescription')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="items-center gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.durationTitle')}
          </Text>
          <View
            accessible
            accessibilityLabel={t('onboarding.durationPreview')}
            className="max-w-full flex-row flex-wrap justify-center items-center gap-2 rounded-xl bg-theme-surface px-3 py-2"
          >
            <AppIcon
              name="sober"
              size={iconSizes.md}
              className="text-theme-accent"
              accessible={false}
            />
            <Text className="text-[14px] font-semibold">
              {formatSoberDuration((2 * 24 + 3) * 3600000 + 4 * 60000, language)}
            </Text>
            <AppIcon
              name="arrow-forward"
              size={iconSizes.sm}
              className="text-theme-text-tertiary"
              accessible={false}
            />
            <Text className="text-[14px] font-semibold text-theme-accent">
              {t('sober.hoursMinutes', { value: 51, count: 4 })}
            </Text>
          </View>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.durationDescription')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="items-center gap-2">
          <View className="flex-row items-center justify-center gap-2">
            <AppIcon
              name="notifications"
              size={iconSizes.md}
              className="text-theme-accent"
              accessible={false}
            />
            <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
              {t('onboarding.reminderTitle')}
            </Text>
          </View>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.reminderDescription')}
          </Text>
        </View>
      </View>
    </View>
  );
}
