import { useMemo } from 'react';
import { PanResponder } from 'react-native';

export function useMonthSwipe(changeMonth: (amount: number) => void) {
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.numberActiveTouches === 1 &&
          Math.abs(gesture.dx) > 10 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) >= 80 && Math.abs(gesture.dx) >= Math.abs(gesture.dy) * 1.5)
            changeMonth(gesture.dx > 0 ? -1 : 1);
        },
      }),
    [changeMonth],
  );
  return { panHandlers: swipe.panHandlers };
}
