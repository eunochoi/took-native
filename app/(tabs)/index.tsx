import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { ColorView } from '../../src/components/ColorTransition';
import { Wordmark } from '../../src/components/Wordmark';
import { useToday } from '../../src/queries';
import { HomeAnalysisCard } from '../../src/screens/home/HomeAnalysisCard';
import { HomeGreeting } from '../../src/screens/home/HomeGreeting';
import { HomeTodaySection } from '../../src/screens/home/HomeTodaySection';
import { useAppTheme } from '../../src/theme/AppThemeProvider';

const cat = require('../../assets/cats/hiding-cat-home.png');
const catSize = Image.resolveAssetSource(cat);

export default function Home() {
  const today = useToday();
  const { colors, mode, rem: appRem, navigationBottom, navigationHeight } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const pageHeight = Math.max(
    viewportHeight,
    contentHeight + navigationBottom + navigationHeight + appRem,
  );
  const overflowing = pageHeight > viewportHeight + 1;
  useEffect(() => {
    if (viewportHeight > 0 && !overflowing) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [viewportHeight, overflowing]);

  return (
    <ColorView className="flex-1 min-h-0 overflow-hidden bg-theme-accent-light">
      <ScrollView
        ref={scrollRef}
        className="flex-1 min-h-0"
        contentContainerClassName="grow"
        onLayout={({ nativeEvent }) => setViewportHeight(nativeEvent.layout.height)}
        scrollEnabled={overflowing}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="w-full"
          style={{
            height: viewportHeight > 0 ? pageHeight : undefined,
            paddingBottom: navigationBottom,
          }}
        >
          <View
            className="shrink-0 px-[5%]"
            onLayout={({ nativeEvent }) => setContentHeight(nativeEvent.layout.height)}
          >
            <View className="mt-8 shrink-0 flex-row items-center">
              <Wordmark size={appRem * 3} accentColor={colors.accent} mode={mode} />
            </View>
            <HomeGreeting today={today} />
            <View className="gap-3 shrink-0">
              <HomeTodaySection today={today} />
              <HomeAnalysisCard today={today} />
            </View>
          </View>
          <View pointerEvents="none" className="flex-1 min-h-0 justify-end overflow-hidden px-[5%]">
            <Image
              source={cat}
              accessibilityLabel="hiding-cat"
              resizeMode="contain"
              style={{
                height: 'auto',
                aspectRatio: catSize.width / catSize.height,
              }}
              className="mx-auto w-full max-h-full shrink"
            />
          </View>
        </View>
      </ScrollView>
    </ColorView>
  );
}
