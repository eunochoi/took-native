import { SECTION_TITLE_CLASS_NAME, BODY_DESCRIPTION_CLASS_NAME } from '../src/theme/classes';
import { RecordHeader } from '../src/components/RecordHeader';
import { ScrollView, View } from 'react-native';
import { ScrollEdgeFade } from '../src/components/ScrollEdgeFade';
import { Text } from '../src/components/Text';
import { useScrollFade } from '../src/hooks/useScrollFade';
import { PRIVACY_SECTIONS } from '../src/privacy/content';

export default function Privacy() {
  const fade = useScrollFade();
  return (
    <View className="flex-1 bg-theme-surface">
      <RecordHeader backRoute="/" title="개인정보처리방침" />
      <View className="flex-1">
        <ScrollView
          onScroll={fade.onScroll}
          onLayout={fade.onLayout}
          onContentSizeChange={fade.onContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="pt-6 pb-screen-content-bottom gap-6"
          contentContainerStyle={{ paddingHorizontal: '5%' }}
        >
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
        </ScrollView>
        <ScrollEdgeFade edge="top" visible={fade.topVisible} tone="surface" />
        <ScrollEdgeFade
          edge="bottom"
          visible={fade.bottomVisible}
          tone="surface"
          includeBottomInset={false}
        />
      </View>
    </View>
  );
}
