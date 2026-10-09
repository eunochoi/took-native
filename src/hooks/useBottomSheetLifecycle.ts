import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Keyboard, type ScrollView } from 'react-native';
import type { AnimatedRef } from 'react-native-reanimated';
import { useBottomSheetMotion } from './useBottomSheetMotion';

export type CloseBottomSheet = (afterClose?: () => void) => boolean;

type Options = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onBeforeClose?: () => boolean;
  onOpening?: () => void;
  onOpened?: () => void;
  presentation: 'modal' | 'screen';
  dismissOnBack: boolean;
  height: number;
  rem: number;
  reducedMotion: boolean;
  scrollFade: boolean;
  contentKey?: string | number;
  onScrollOffset: (offset: number) => void;
  scrollEnabled: boolean;
  scrollRef?: AnimatedRef<ScrollView>;
};

// Keep the window and body mounted until the closing animation has completed.
export function useBottomSheetLifecycle({
  visible,
  title,
  onClose,
  onBeforeClose,
  onOpening,
  onOpened,
  presentation,
  dismissOnBack,
  height,
  rem,
  reducedMotion,
  scrollFade,
  contentKey,
  onScrollOffset,
  scrollEnabled,
  scrollRef,
}: Options) {
  const [present, setPresent] = useState(visible);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [closingBody, setClosingBody] = useState(false);
  const [session, setSession] = useState(0);
  const generation = useRef(0);
  const shown = useRef(false);
  const bodyMounted = useRef(false);
  const closing = useRef(false);
  const active = useRef(visible);
  const alive = useRef(true);
  const afterCloseRef = useRef<(() => void) | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const beforeCloseRef = useRef(onBeforeClose);
  beforeCloseRef.current = onBeforeClose;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const onOpeningRef = useRef(onOpening);
  onOpeningRef.current = onOpening;
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      afterCloseRef.current = undefined;
    };
  }, []);
  const finishClose = useCallback((closingSession: number, finished: boolean) => {
    if (!alive.current || generation.current !== closingSession || !closing.current) return;
    const action = finished ? afterCloseRef.current : undefined;
    afterCloseRef.current = undefined;
    shown.current = false;
    active.current = false;
    closing.current = false;
    bodyMounted.current = false;
    setBodyVisible(false);
    setPresent(false);
    onCloseRef.current();
    if (action)
      requestAnimationFrame(() => {
        // onClose may unmount the sheet; a completed close still owns its accepted action.
        if (generation.current === closingSession) action();
      });
  }, []);
  const dismissRef = useRef<(session: number) => void>(() => {});
  const dismiss = useCallback((currentSession: number) => dismissRef.current(currentSession), []);
  const finishOpen = useCallback((openingSession: number) => {
    if (!alive.current || generation.current !== openingSession || closing.current) return;
    onOpenedRef.current?.();
    // A save can request dismissal before the entering animation has finished.
    if (!visibleRef.current) dismissRef.current(openingSession);
  }, []);
  const motion = useBottomSheetMotion({
    rem,
    reducedMotion,
    scrollFade,
    contentKey,
    openingSession: session,
    onScrollOffset,
    onDismiss: dismiss,
    onClosed: finishClose,
    onOpened: finishOpen,
    scrollEnabled,
    externalScrollRef: scrollRef,
  });
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const closeSheet: CloseBottomSheet = useCallback(
    (afterClose) => {
      if (!active.current || closing.current) return false;
      if (beforeCloseRef.current?.() === false) {
        motionRef.current.restoreAfterBlockedClose();
        return false;
      }
      closing.current = true;
      afterCloseRef.current = afterClose;
      setClosingBody(true);
      // A window closed before onShow has no animated children to wait for.
      if (!bodyMounted.current) finishClose(generation.current, true);
      else motionRef.current.animateClose(generation.current);
      return true;
    },
    [finishClose],
  );
  dismissRef.current = (currentSession) => {
    if (currentSession === generation.current) closeSheet();
  };
  useLayoutEffect(() => {
    if (visible) {
      active.current = true;
      onScrollOffset(0);
      const nextSession = ++generation.current;
      closing.current = false;
      setClosingBody(false);
      afterCloseRef.current = undefined;
      onOpeningRef.current?.();
      motionRef.current.prepareOpen(nextSession, height);
      setSession(nextSession);
      setPresent(true);
      if (presentation === 'screen') shown.current = true;
      bodyMounted.current = shown.current;
      setBodyVisible(shown.current);
    } else {
      closeSheet();
    }
  }, [visible, closeSheet, onScrollOffset, presentation]);
  useEffect(() => {
    if (presentation !== 'screen' || !visible || !dismissOnBack) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true;
    });
    return () => subscription.remove();
  }, [presentation, visible, dismissOnBack, closeSheet]);
  useLayoutEffect(() => {
    // Start after the backdrop mounts at opacity zero. Its opacity has a single animated owner.
    if (bodyVisible && !closing.current) motionRef.current.animateBackdropOpen();
  }, [bodyVisible, session]);

  const onShow = useCallback(() => {
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility(title);
    if (!active.current || closing.current) return;
    shown.current = true;
    bodyMounted.current = true;
    setBodyVisible(true);
  }, [title]);
  return { present, bodyVisible, closingBody, session, motion, closeSheet, onShow };
}
