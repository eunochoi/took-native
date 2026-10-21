const SCROLL_EDGE_THRESHOLD = 6;

export function getScrollFadeState(offset: number, viewport: number, content: number) {
  const maximum = Math.max(0, content - viewport);
  const y = Math.min(maximum, Math.max(0, offset));
  const scrollable = viewport > 0 && maximum > SCROLL_EDGE_THRESHOLD;
  return {
    topVisible: scrollable && y > SCROLL_EDGE_THRESHOLD,
    bottomVisible: scrollable && maximum - y > SCROLL_EDGE_THRESHOLD,
  };
}
