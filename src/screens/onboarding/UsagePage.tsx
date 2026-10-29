import { useI18n } from '../../i18n/react';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { Image, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
const navigationPreview = require('../../../assets/onboarding/navigation.png');

export function UsagePage({ imageWidth }: { imageWidth: number }) {
  const { t } = useI18n();
  const { rem, iconSizes } = useAppTheme();
  return (
    <View className="w-full grow justify-evenly gap-6">
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
              width: imageWidth,
              height:
                (imageWidth * Image.resolveAssetSource(navigationPreview).height) /
                Image.resolveAssetSource(navigationPreview).width,
            }}
          />
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.tapDescription')}
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
            {t('onboarding.reminderTitle')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.reminderDescription')}
          </Text>
          <View className="max-w-full flex-row items-center gap-2 rounded-full bg-theme-surface px-4 py-2">
            <AppIcon
              name="settings"
              size={iconSizes.sm}
              className="text-theme-accent"
              accessible={false}
            />
            <Text className="min-w-0 shrink text-center text-[10.5px] leading-[14px] text-theme-text-secondary">
              {t('onboarding.reminderSettings')}
            </Text>
          </View>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        {t('onboarding.reminderNotice')}
      </InfoNotice>
    </View>
  );
}
