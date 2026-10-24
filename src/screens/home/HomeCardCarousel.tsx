import { Fragment, useState, type ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeProvider';

export type HomeCardId = 'diary' | 'habit' | 'distance' | 'archive';

export function HomeCardCarousel({
  order,
  renderCard,
}: {
  order: readonly HomeCardId[];
  renderCard: (id: HomeCardId, size: number) => ReactNode;
}) {
  const { rem: appRem } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const inset = contentWidth * 0.05;
  const gap = appRem * 0.75;
  // Match EmotionStats: two whole cards and 20% of the next, after the inset and two gaps.
  const measuredSize = contentWidth > 0 ? (contentWidth * 0.95 - appRem * 1.5) / 2.2 : appRem * 10;
  const cardSize = Math.max(measuredSize, appRem * 7.5 * Math.max(1, fontScale));
  const maxOffset = Math.max(
    0,
    inset * 2 + order.length * cardSize + Math.max(0, order.length - 1) * gap - contentWidth,
  );
  const snapOffsets = [
    ...new Set(order.map((_, index) => Math.min(index * (cardSize + gap), maxOffset))),
  ];

  return (
    <ScrollView
      horizontal
      // Undo the parent's 5% page padding relative to its 90%-wide content.
      className="-mx-[5.555556%]"
      onLayout={({ nativeEvent }) => setContentWidth(nativeEvent.layout.width)}
      contentContainerClassName="flex-row items-center gap-3"
      contentContainerStyle={{ paddingHorizontal: inset }}
      showsHorizontalScrollIndicator={false}
      snapToOffsets={snapOffsets}
      decelerationRate="fast"
      disableIntervalMomentum
      directionalLockEnabled
      nestedScrollEnabled
      bounces={false}
      overScrollMode="never"
    >
      {order.map((id) => (
        <Fragment key={id}>{renderCard(id, cardSize)}</Fragment>
      ))}
    </ScrollView>
  );
}
