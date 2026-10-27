import { useI18n } from '../src/i18n/react';
import { SECTION_TITLE_CLASS_NAME, BODY_TEXT_CLASS_NAME } from '../src/theme/classes';
import { BottomSheetPage } from '../src/components/BottomSheetPage';
import { View } from 'react-native';
import { Text } from '../src/components/Text';
import { PRIVACY_SECTIONS } from '../src/privacy/content';

export default function Privacy() {
  const { t } = useI18n();
  return (
    <BottomSheetPage backRoute="/setting" title={t('settings.privacy')}>
      <View className="gap-6">
        {PRIVACY_SECTIONS.map((section) => (
          <View key={section} className="gap-3">
            <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
              {t(`privacy.${section}Title`)}
            </Text>
            <Text className={`px-1 ${BODY_TEXT_CLASS_NAME}`}>{t(`privacy.${section}Text`)}</Text>
          </View>
        ))}
      </View>
    </BottomSheetPage>
  );
}
