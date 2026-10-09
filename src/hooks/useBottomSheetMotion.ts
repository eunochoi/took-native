import { useCallback, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  ReduceMotion,
  SlideInDown,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import tokens from '../theme/tokens.json';

type Phase = 'opening' | 'idle' | 'dragging' | 'returning' | 'closing';

// One touch owns either the scroll viewport or the sheet until that touch ends.
export function useBottomSheetMotion({
  rem,
  reducedMotion,
  scrollFade,
  contentKey,
  openingSession,
  onScrollOffset,
  onDismiss,
  onClosed,
  onOpened,
  scrollEnabled = true,
  externalScrollRef,
}: {
  rem: number;
  reducedMotion: boolean;
  scrollFade: boolean;
  contentKey?: string | number;
  openingSession: number;
  onScrollOffset: (offset: number) => void;
  onDismiss: (session: number) => void;
  onClosed: (session: number, finished: boolean) => void;
  onOpened: (session: number) => void;
  scrollEnabled?: boolean;
  externalScrollRef?: ReturnType<typeof useAnimatedRef<ScrollView>>;
}) {
  const ownScrollRef = useAnimatedRef<ScrollView>();
  const scrollRef = externalScrollRef ?? ownScrollRef;
  const scrollY = useSharedValue(0);
  const sheetY = useSharedValue(0);
  const measuredHeight = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const backdrop = useSharedValue(0);
  const phase = useSharedValue<Phase>('opening');
  const session = useSharedValue(0);
  const touchX = useSharedValue(0);
  const touchY = useSharedValue(0);
  const startSheetY = useSharedValue(0);
  const decided = useSharedValue(false);
  const motionPolicy = reducedMotion ? ReduceMotion.Always : ReduceMotion.System;
  useEffect(() => {
    scrollY.value = 0;
  }, [contentKey, scrollY]);

  const prepareOpen = useCallback(
    (nextSession: number, windowHeight: number) => {
      cancelAnimation(sheetY);
      cancelAnimation(backdrop);
      session.value = nextSession;
      phase.value = 'opening';
      measuredHeight.value = 0;
      viewportHeight.value = windowHeight;
      scrollY.value = 0;
      // Native entering animation owns opening. Never hide the sheet waiting for a layout event.
      sheetY.value = 0;
      backdrop.value = 0;
    },
    [sheetY, backdrop, session, phase, measuredHeight, viewportHeight, scrollY],
  );

  const onSheetLayout = useCallback(
    (event: LayoutChangeEvent) => {
      measuredHeight.value = event.nativeEvent.layout.height;
    },
    [measuredHeight],
  );

  const animateBackdropOpen = useCallback(() => {
    if (phase.value !== 'opening') return;
    backdrop.value = withTiming(1, {
      duration: tokens.motion.fade,
      reduceMotion: motionPolicy,
    });
  }, [phase, backdrop, motionPolicy]);

  const entering = useMemo(
    () => ({
      sheetEnter: SlideInDown.duration(tokens.motion.pickerOpen)
        .reduceMotion(motionPolicy)
        .withCallback(() => {
          'worklet';
          if (session.value === openingSession && phase.value === 'opening') {
            // A cancelled entry is terminal too; never leave navigation locked indefinitely.
            phase.value = 'idle';
            scheduleOnRN(onOpened, openingSession);
          }
        }),
    }),
    [motionPolicy, session, openingSession, phase, onOpened],
  );

  const animateClose = useCallback(
    (closingSession: number) => {
      phase.value = 'closing';
      cancelAnimation(sheetY);
      backdrop.value = withTiming(0, {
        duration: tokens.motion.pickerClose,
        reduceMotion: motionPolicy,
      });
      sheetY.value = withTiming(
        Math.max(sheetY.value, (measuredHeight.value || viewportHeight.value) + rem * 2),
        { duration: tokens.motion.pickerClose, reduceMotion: motionPolicy },
        (finished) => {
          scheduleOnRN(onClosed, closingSession, finished === true);
        },
      );
    },
    [phase, sheetY, backdrop, measuredHeight, viewportHeight, rem, motionPolicy, onClosed],
  );

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = Math.max(0, event.contentOffset.y);
        if (scrollFade) scheduleOnRN(onScrollOffset, scrollY.value);
      },
    },
    [scrollFade, onScrollOffset],
  );

  const restoreAfterBlockedClose = useCallback(() => {
    if (phase.value === 'opening') return;
    phase.value = 'returning';
    const returningSession = session.value;
    sheetY.value = withSpring(
      0,
      { damping: 24, stiffness: 240, overshootClamping: true, reduceMotion: motionPolicy },
      (finished) => {
        if (finished && session.value === returningSession && phase.value === 'returning')
          phase.value = 'idle';
      },
    );
  }, [phase, session, sheetY, motionPolicy]);

  const { panGesture, scrollGesture } = useMemo(() => {
    const restore = () => {
      'worklet';
      phase.value = 'returning';
      const returningSession = session.value;
      sheetY.value = withSpring(
        0,
        { damping: 24, stiffness: 240, overshootClamping: true, reduceMotion: motionPolicy },
        (finished) => {
          if (finished && session.value === returningSession && phase.value === 'returning')
            phase.value = 'idle';
        },
      );
    };
    const pan = Gesture.Pan()
      .enabled(scrollEnabled)
      .manualActivation(true)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .onTouchesDown((event, manager) => {
        const touch = event.allTouches[0];
        decided.value = false;
        // Fail immediately for touches begun below the top. Reaching zero later cannot take over.
        if (
          !touch ||
          event.numberOfTouches !== 1 ||
          (phase.value !== 'idle' && phase.value !== 'returning') ||
          scrollY.value > 1
        ) {
          decided.value = true;
          manager.fail();
          return;
        }
        touchX.value = touch.absoluteX;
        touchY.value = touch.absoluteY;
      })
      .onTouchesMove((event, manager) => {
        if (decided.value) return;
        const touch = event.allTouches[0];
        if (
          !touch ||
          event.numberOfTouches !== 1 ||
          (phase.value !== 'idle' && phase.value !== 'returning')
        ) {
          decided.value = true;
          manager.fail();
          return;
        }
        const dx = touch.absoluteX - touchX.value;
        const dy = touch.absoluteY - touchY.value;
        const slop = rem * 0.5;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < slop) return;
        decided.value = true;
        if (dy > 0 && dy > Math.abs(dx)) manager.activate();
        else manager.fail();
      })
      .onTouchesUp((_event, manager) => {
        if (!decided.value) manager.fail();
      })
      .onStart(() => {
        if (phase.value !== 'idle' && phase.value !== 'returning') return;
        cancelAnimation(sheetY);
        startSheetY.value = sheetY.value;
        phase.value = 'dragging';
        scrollY.value = 0;
        scrollTo(scrollRef, 0, 0, false);
      })
      .onUpdate((event) => {
        if (phase.value !== 'dragging') return;
        sheetY.value = Math.max(0, startSheetY.value + event.absoluteY - touchY.value);
      })
      .onEnd((_event, success) => {
        if (phase.value !== 'dragging') return;
        if (success && measuredHeight.value > 0 && sheetY.value >= measuredHeight.value * 0.25) {
          // Lock immediately on the UI thread; the existing JS close path owns callbacks.
          phase.value = 'closing';
          scheduleOnRN(onDismiss, session.value);
        } else restore();
      })
      .onFinalize(() => {
        // Interruptions (second finger, OS cancellation) restore rather than dismiss.
        if (phase.value === 'dragging') restore();
      });
    // The native scroll recognizer waits until the sheet pan fails. It never scrolls during a drag.
    const native = Gesture.Native().requireExternalGestureToFail(pan);
    return { panGesture: pan, scrollGesture: native };
  }, [
    phase,
    session,
    sheetY,
    measuredHeight,
    scrollY,
    scrollRef,
    touchX,
    touchY,
    startSheetY,
    decided,
    rem,
    motionPolicy,
    onDismiss,
    scrollEnabled,
  ]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      backdrop.value *
      (1 - Math.min(1, sheetY.value / Math.max(1, measuredHeight.value || viewportHeight.value))),
  }));

  return {
    ...entering,
    prepareOpen,
    animateBackdropOpen,
    animateClose,
    restoreAfterBlockedClose,
    onSheetLayout,
    panGesture,
    scrollGesture,
    scrollRef,
    onScroll,
    sheetStyle,
    backdropStyle,
  };
}
