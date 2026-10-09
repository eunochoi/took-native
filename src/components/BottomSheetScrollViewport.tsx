import type { ComponentProps, ReactNode } from 'react';
import type { ScrollView } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { useBottomSheetMotion } from '../hooks/useBottomSheetMotion';
import type { useScrollFade } from '../hooks/useScrollFade';
import { AnimatedScrollView } from './AnimatedScrollView';
import { ScrollEdgeFade } from './ScrollEdgeFade';

export type BottomSheetScrollProps = ComponentProps<typeof AnimatedScrollView> & {
  ref: AnimatedRef<ScrollView>;
};

export function BottomSheetScrollViewport({
  motion,
  fade,
  fixedHeight,
  scrollEnabled,
  scrollFade,
  contentKey,
  bottomPadding,
  children,
  renderScrollView,
}: {
  motion: ReturnType<typeof useBottomSheetMotion>;
  fade: ReturnType<typeof useScrollFade>;
  fixedHeight: boolean;
  scrollEnabled: boolean;
  scrollFade: boolean;
  contentKey?: string | number;
  bottomPadding?: number;
  children?: ReactNode;
  renderScrollView?: (props: BottomSheetScrollProps) => ReactNode;
}) {
  const scrollProps: BottomSheetScrollProps = {
    ref: motion.scrollRef,
    scrollEnabled,
    onLayout: fade.onLayout,
    onContentSizeChange: fade.onContentSizeChange,
    onScroll: motion.onScroll,
    scrollEventThrottle: 16,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
    className: `${fixedHeight ? 'flex-1' : 'shrink'} min-h-0`,
    contentContainerClassName: 'gap-6 pt-6 pb-12',
    contentContainerStyle:
      bottomPadding === undefined ? undefined : { paddingBottom: bottomPadding },
    nestedScrollEnabled: true,
    bounces: false,
    overScrollMode: 'never',
    keyboardShouldPersistTaps: 'handled',
    keyboardDismissMode: 'none',
  };
  return (
    <View className={`${fixedHeight ? 'flex-1' : 'shrink'} min-h-0 overflow-hidden`}>
      <GestureDetector gesture={motion.scrollGesture}>
        {renderScrollView ? (
          renderScrollView(scrollProps)
        ) : (
          <AnimatedScrollView key={contentKey} {...scrollProps}>
            {children}
          </AnimatedScrollView>
        )}
      </GestureDetector>
      {scrollFade && (
        <>
          <ScrollEdgeFade edge="top" tone="surface" visible={fade.topVisible} />
          <ScrollEdgeFade
            edge="bottom"
            tone="surface"
            visible={fade.bottomVisible}
            includeBottomInset={false}
          />
        </>
      )}
    </View>
  );
}
