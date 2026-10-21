import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { getScrollFadeState } from './scrollFade';

export function useScrollFade() {
  const metrics = useRef({ offset: 0, viewport: 0, content: 0 });
  const [visible, setVisible] = useState({ topVisible: false, bottomVisible: false });
  const update = useCallback((values: Partial<typeof metrics.current>) => {
    Object.assign(metrics.current, values);
    const { offset, viewport, content } = metrics.current;
    const next = getScrollFadeState(offset, viewport, content);
    setVisible((last) =>
      next.topVisible === last.topVisible && next.bottomVisible === last.bottomVisible
        ? last
        : next,
    );
  }, []);
  const onScrollOffset = useCallback((offset: number) => update({ offset }), [update]);
  return {
    ...visible,
    onScrollOffset,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      onScrollOffset(event.nativeEvent.contentOffset.y),
    onLayout: (event: LayoutChangeEvent) => update({ viewport: event.nativeEvent.layout.height }),
    onContentSizeChange: (_width: number, content: number) => update({ content }),
  };
}
