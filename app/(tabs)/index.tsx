import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useIsFocused } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ColorView } from '../../src/components/ColorTransition';
import { EmotionImage } from '../../src/components/EmotionImage';
import { Text } from '../../src/components/Text';
import { Wordmark } from '../../src/components/Wordmark';
import { useToday } from '../../src/queries';
import { TodayRecordSection } from '../../src/screens/home/TodayRecordSection';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import tokens from '../../src/theme/tokens.json';

const greeting = {
  '0%': { transform: [{ rotate: '5deg' }] },
  '10%': { transform: [{ rotate: '15deg' }] },
  '20%': { transform: [{ rotate: '-3deg' }] },
  '32%': { transform: [{ rotate: '13deg' }] },
  '42%': { transform: [{ rotate: '-1deg' }] },
  '52%': { transform: [{ rotate: '10deg' }] },
  '64%': { transform: [{ rotate: '2deg' }] },
  '78%': { transform: [{ rotate: '7deg' }] },
  '94%': { transform: [{ rotate: '5deg' }] },
  '100%': { transform: [{ rotate: '5deg' }] },
} as const;
const cat = require('../../assets/cats/hiding-cat-home.png');
const catSize = Image.resolveAssetSource(cat);

export default function Home() {
  const today = useToday();
  const {
    colors,
    mode,
    rem: appRem,
    reducedMotion,
    navigationBottom,
    navigationHeight,
  } = useAppTheme();
  const focused = useIsFocused();
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
        <View className="w-full" style={{ height: viewportHeight > 0 ? pageHeight : undefined }}>
          <View
            className="shrink-0 px-[5%] pt-[5%]"
            onLayout={({ nativeEvent }) => setContentHeight(nativeEvent.layout.height)}
          >
            <View className="mb-10 shrink-0 flex-row items-center gap-2">
              <Wordmark size={appRem * 3.25} accentColor={colors.accent} mode={mode} />
            </View>
            <View className="mb-10 shrink-0 gap-3">
              <View className="gap-1">
                <Text className="px-0.5 text-theme-accent-deep font-semibold text-lg">
                  {format(parseISO(today), 'M월 d일 EEEE', {
                    locale: ko,
                  })}
                </Text>
                <Text className="font-bold text-3xl">오늘도 툭!!</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="font-bold text-3xl">나답게 쌓는 하루</Text>
                  <Animated.View
                    key={focused && !reducedMotion ? 'moving' : 'idle'}
                    className="h-9 w-9 shrink-0 items-center justify-center"
                    style={{
                      transform: [{ rotate: '5deg' }],
                      animationName: focused && !reducedMotion ? greeting : undefined,
                      animationDuration: `${tokens.motion.greeting}ms`,
                      animationTimingFunction: 'ease-in-out',
                    }}
                  >
                    <EmotionImage emotion={1} size={appRem * 2.25} iconStyle="basic" />
                  </Animated.View>
                </View>
              </View>
              <Text className="px-0.5 text-theme-accent-deep text-base font-semibold">
                #감정기록 #습관관리 #거리두기
              </Text>
            </View>
            <View className="shrink-0">
              <TodayRecordSection today={today} />
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
