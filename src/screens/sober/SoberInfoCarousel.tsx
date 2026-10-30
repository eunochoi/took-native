import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useI18n } from '../../i18n/react';

export function SoberInfoCarousel({
  pages,
  color,
}: {
  pages: [ReactNode, ReactNode];
  color: string;
}) {
  const { t } = useI18n();
  const carousel = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [heights, setHeights] = useState<number[]>([]);
  useEffect(() => {
    carousel.current?.scrollTo({ x: page * width, animated: false });
  }, [width]);
  const height = Math.max(0, ...heights);
  return (
    <View
      className="gap-1 -mb-3"
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <ScrollView
        ref={carousel}
        horizontal
        pagingEnabled
        directionalLockEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="items-stretch"
        style={height ? { height } : undefined}
        onMomentumScrollEnd={({ nativeEvent }) => {
          if (width)
            setPage(Math.max(0, Math.min(1, Math.round(nativeEvent.contentOffset.x / width))));
        }}
      >
        {pages.map((content, index) => (
          <View
            key={index}
            style={{ width }}
            className="justify-center"
            accessibilityElementsHidden={page !== index}
            importantForAccessibility={page !== index ? 'no-hide-descendants' : 'auto'}
          >
            <View
              className="py-0"
              onLayout={({ nativeEvent }) => {
                const measured = nativeEvent.layout.height;
                setHeights((previous) =>
                  previous[index] === measured
                    ? previous
                    : Object.assign([...previous], { [index]: measured }),
                );
              }}
            >
              {content}
            </View>
          </View>
        ))}
      </ScrollView>
      <View className="flex-row justify-center">
        {[t('sober.currentDuration'), t('sober.recordSummary')].map((label, index) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: page === index }}
            onPress={() => {
              setPage(index);
              carousel.current?.scrollTo({ x: index * width, animated: true });
            }}
            className="h-8 w-8 items-center justify-center active:opacity-65"
          >
            <View
              className={`h-2 w-2 rounded-full ${index === 0 ? 'self-end mr-1' : 'self-start ml-1'} ${page === index ? 'opacity-100' : 'opacity-25'}`}
              style={{ backgroundColor: color }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
