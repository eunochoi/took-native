import { useCallback, useMemo } from 'react';
import { PanResponder } from 'react-native';
import { shiftMonth } from '../domain/date';

export function useMonthSwipe(month: string, onMonthChange: (month: string) => void) {
  const changeMonth = useCallback(
    (amount: number) => {
      const next = shiftMonth(month, amount);
      if (next >= '1900-01' && next <= '2100-12') onMonthChange(next);
    },
    [month, onMonthChange],
  );
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
  return { changeMonth, panHandlers: swipe.panHandlers };
}
