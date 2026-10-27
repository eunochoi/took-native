import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { ColorView } from '../../src/components/ColorTransition';
import { Wordmark } from '../../src/components/Wordmark';
import { DIARY_EMOTION_GROUPS } from '../../src/domain/diaryFilters';
import { diaryQueries, useToday } from '../../src/queries';
import { HomeAnalysisCard } from '../../src/screens/home/HomeAnalysisCard';
import { HomeGreeting } from '../../src/screens/home/HomeGreeting';
import { HomeTodaySection } from '../../src/screens/home/HomeTodaySection';
import { useAppTheme } from '../../src/theme/AppThemeProvider';

const cats = {
  neutral: require('../../assets/cats/cat-blue.png'),
  positive: require('../../assets/cats/cat-blue-p.png'),
  negative: require('../../assets/cats/cat-blue-n.png'),
};

export default function Home() {
  const today = useToday();
  const db = useSQLiteContext();
  const diary = useQuery(diaryQueries.byDate(db, today));
  const emotion = diary.isError ? -1 : (diary.data?.emotion ?? -1);
  const cat = (DIARY_EMOTION_GROUPS.positive.emotions as readonly number[]).includes(emotion)
    ? cats.positive
    : (DIARY_EMOTION_GROUPS.negative.emotions as readonly number[]).includes(emotion)
      ? cats.negative
      : cats.neutral;
  const catSize = Image.resolveAssetSource(cat);
  const { mode, rem: appRem, navigationBottom, navigationHeight } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const overflowing = contentHeight > viewportHeight + 1;
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
        onContentSizeChange={(_width, height) => setContentHeight(height)}
        scrollEnabled={overflowing}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View
          className="w-full px-[5%] flex justify-between"
          style={{
            minHeight: viewportHeight,
            paddingBottom: navigationBottom + navigationHeight + appRem,
          }}
        >
          <View className="mt-8 shrink-0 flex-row items-center">
            <Wordmark size={appRem * 2.25} mode={mode} />
          </View>
          <HomeGreeting />

          <View className="gap-3 shrink-0">
            <HomeTodaySection today={today} />
            <HomeAnalysisCard today={today} />
          </View>
          <Image
            source={cat}
            accessibilityLabel="hiding-cat"
            resizeMode="contain"
            style={{
              height: 'auto',
              aspectRatio: catSize.width / catSize.height,
            }}
            className="-mt-6 mx-auto w-4/5 max-h-full shrink"
          />
        </View>
      </ScrollView>
    </ColorView>
  );
}
