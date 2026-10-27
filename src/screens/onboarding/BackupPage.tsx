import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';

export function BackupPage({ onOpenWeb }: { onOpenWeb: () => void }) {
  const { t } = useI18n();
  const { iconSizes } = useAppTheme();
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.backupTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.backupDescription')}
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-6`}
      >
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.localTitle')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.localDescription')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.backupRestore')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.restoreDescription')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-2">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.webTitle')}
          </Text>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.webDescription')}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('settings.webOpen')}
            onPress={onOpenWeb}
            className="min-h-12 flex-row items-center justify-center gap-2 ios:curve-continuous rounded-xl active:opacity-65"
          >
            <Text className="text-[14px] leading-[21px] font-semibold text-theme-accent">
              {t('settings.webOpen')}
            </Text>
            <AppIcon name="arrow-forward" size={iconSizes.sm} className="text-theme-accent" />
          </Pressable>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        {t('onboarding.webNotice')}
      </InfoNotice>
    </View>
  );
}
