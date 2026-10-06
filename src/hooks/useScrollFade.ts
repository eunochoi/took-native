import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { getScrollFadeState } from './scrollFade';

export function useScrollFade() {
  const metrics = useRef({ offset: 0, viewport: 0, content: 0 });
  const [visible, setVisible] = useState({ topVisible: false, bottomVisible: false });
  const update = useCallback(() => {
    const { offset, viewport, content } = metrics.current;
    const next = getScrollFadeState(offset, viewport, content);
    setVisible((last) =>
      next.topVisible === last.topVisible && next.bottomVisible === last.bottomVisible
        ? last
        : next,
    );
  }, []);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      metrics.current.offset = Math.max(0, contentOffset.y);
      metrics.current.viewport = layoutMeasurement.height;
      metrics.current.content = contentSize.height;
      update();
    },
    [update],
  );
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      metrics.current.viewport = event.nativeEvent.layout.height;
      update();
    },
    [update],
  );
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metrics.current.content = height;
      update();
    },
    [update],
  );
  const onScrollOffset = useCallback(
    (offset: number) => {
      metrics.current.offset = Math.max(0, offset);
      update();
    },
    [update],
  );
  return { ...visible, onScroll, onScrollOffset, onLayout, onContentSizeChange };
}
