import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollFade } from '../hooks/useScrollFade';
import { ScrollEdgeFade } from './ScrollEdgeFade';

export function RecordFormLayout({
  header,
  footer,
  overlays,
  children,
  scrollEnabled = true,
}: {
  header: ReactNode;
  footer: ReactNode;
  overlays?: ReactNode;
  children: ReactNode;
  scrollEnabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const fade = useScrollFade();
  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-theme-surface">
      {header}
      <View className="flex-1 min-h-0">
        <ScrollView
          className="flex-1"
          scrollEnabled={scrollEnabled}
          onScroll={fade.onScroll}
          onLayout={fade.onLayout}
          onContentSizeChange={fade.onContentSizeChange}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-6 pt-6 pb-6 px-[5%]"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          {children}
        </ScrollView>
        <ScrollEdgeFade edge="top" visible={fade.topVisible} tone="surface" />
        <ScrollEdgeFade
          edge="bottom"
          visible={fade.bottomVisible}
          tone="surface"
          includeBottomInset={false}
        />
      </View>
      <View className="mt-3 mb-4 px-[5%]" style={{ paddingBottom: insets.bottom }}>
        {footer}
      </View>
      {overlays}
    </KeyboardAvoidingView>
  );
}
