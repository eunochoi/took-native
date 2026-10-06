import { SECTION_TITLE_CLASS_NAME, BODY_DESCRIPTION_CLASS_NAME } from '../src/theme/classes';
import { BottomSheetPage } from '../src/components/BottomSheetPage';
import { View } from 'react-native';
import { Text } from '../src/components/Text';
import { PRIVACY_SECTIONS } from '../src/privacy/content';

export default function Privacy() {
  return (
    <BottomSheetPage backRoute="/setting" title="개인정보처리방침">
      <View className="pt-6 gap-6">
        {PRIVACY_SECTIONS.map((section) => (
          <View key={section.title} className="gap-3">
            <Text accessibilityRole="header" className={SECTION_TITLE_CLASS_NAME}>
              {section.title}
            </Text>
            <Text selectable className={BODY_DESCRIPTION_CLASS_NAME}>
              {section.text}
            </Text>
          </View>
        ))}
      </View>
    </BottomSheetPage>
  );
}
