import { useI18n } from '../../i18n/react';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { Image, View } from 'react-native';
import { Text } from '../../components/Text';
import { InfoNotice } from '../../components/InfoNotice';
const widgetPreview = require('../../../assets/widgets/sober-preview.png');

export function WidgetPage({ imageWidth }: { imageWidth: number }) {
  const { t } = useI18n();
  return (
    <View className="w-full grow justify-evenly gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.widgetTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.widgetDescription')}
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <Image
          source={widgetPreview}
          accessibilityLabel={t('onboarding.widgetImage')}
          resizeMode="contain"
          className="h-36 self-center"
          style={{ width: imageWidth }}
        />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.widgetAdd')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.widgetAddDescription')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.widgetChoose')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.widgetChooseDescription')}
          </Text>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        {t('onboarding.widgetNotice')}
      </InfoNotice>
    </View>
  );
}
