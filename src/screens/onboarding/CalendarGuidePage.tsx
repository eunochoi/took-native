import { useI18n } from '../../i18n/react';
import { MUTED_CARD_BORDER_CLASS_NAME } from '../../theme/classes';
import { View } from 'react-native';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import { CalendarHabitProgress } from '../calendar/CalendarHabitProgress';
import { CalendarRecordCounts } from '../calendar/CalendarRecordCounts';

export function CalendarGuidePage() {
  const { t } = useI18n();
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.calendarTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.calendarDescription')}
        </Text>
      </View>
      <View
        className={`${MUTED_CARD_BORDER_CLASS_NAME} gap-5 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4`}
      >
        <View className="gap-4">
          <View className="gap-2">
            <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
              {t('onboarding.progressTitle')}
            </Text>
            <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
              {t('onboarding.progressDescription')}
            </Text>
          </View>
          {[
            { label: t('onboarding.lowBand'), done: 1, total: 5 },
            { label: t('onboarding.mediumBand'), done: 2, total: 4 },
            { label: t('onboarding.highBand'), done: 4, total: 4 },
          ].map(({ label, done, total }) => (
            <View key={label} className="gap-1.5">
              <Text className="text-[14px] leading-[21px] text-theme-text-secondary">{label}</Text>
              <CalendarHabitProgress done={done} total={total} />
            </View>
          ))}
          <Text className="text-center text-[10.5px] leading-[14px] text-theme-text-secondary">
            {t('onboarding.zeroProgress')}
          </Text>
        </View>
        <View className="h-px bg-theme-border/50" />
        <View className="gap-3">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('onboarding.toolbarNumbers')}
          </Text>
          <View className="items-center">
            <CalendarRecordCounts
              diaryCount={12}
              counts={{ low: 2, medium: 5, high: 8 }}
              textSize="base"
              textClassName="text-[14px] leading-[21px]"
            />
          </View>
          <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
            {t('onboarding.toolbarDescription')}
          </Text>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        {t('onboarding.freeNotice')}
      </InfoNotice>
    </View>
  );
}
