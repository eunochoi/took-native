import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomSheetMotion } from '../hooks/useBottomSheetMotion';
import { useScrollFade } from '../hooks/useScrollFade';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AnimatedScrollView } from './AnimatedScrollView';
import { AppIcon } from './AppIcon';
import { ScrollEdgeFade } from './ScrollEdgeFade';
import { Text } from './Text';

type ClosePicker = (afterClose?: () => void) => boolean;
export function BottomSheetModal({
  visible,
  title,
  titleIcon,
  onClose,
  children,
  maxHeight,
  fixedHeight = false,
  scrollFade = false,
  contentKey,
}: {
  visible: boolean;
  title: string;
  titleIcon?: ReactNode;
  onClose: () => void;
  children: ReactNode | ((closePicker: ClosePicker) => ReactNode);
  maxHeight?: number;
  fixedHeight?: boolean;
  scrollFade?: boolean;
  contentKey?: string | number;
}) {
  const { colors, rem: appRem, reducedMotion: reduceMotion, iconSizes } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const fade = useScrollFade();
  const { onScrollOffset } = fade;
  useEffect(() => onScrollOffset(0), [contentKey, onScrollOffset]);
  const sheetHeight = Math.max(0, Math.min(maxHeight ?? height * 0.85, height - insets.top));
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
        // onClose may unmount the picker; a completed close still owns its accepted action.
        if (generation.current === closingSession) action();
      });
  }, []);
  const dismissRef = useRef<(session: number) => void>(() => {});
  const dismiss = useCallback((currentSession: number) => dismissRef.current(currentSession), []);
  const motion = useBottomSheetMotion({
    rem: appRem,
    reducedMotion: reduceMotion,
    scrollFade,
    contentKey,
    openingSession: session,
    onScrollOffset,
    onDismiss: dismiss,
    onClosed: finishClose,
  });
  const motionRef = useRef(motion);
  motionRef.current = motion;
  const closePicker: ClosePicker = useCallback(
    (afterClose) => {
      if (!active.current || closing.current) return false;
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
    if (currentSession === generation.current) closePicker();
  };
  useLayoutEffect(() => {
    if (visible) {
      active.current = true;
      onScrollOffset(0);
      const nextSession = ++generation.current;
      closing.current = false;
      setClosingBody(false);
      afterCloseRef.current = undefined;
      motionRef.current.prepareOpen(nextSession, height);
      setSession(nextSession);
      setPresent(true);
      bodyMounted.current = shown.current;
      setBodyVisible(shown.current);
    } else {
      closePicker();
    }
  }, [visible, closePicker, onScrollOffset]);
  useLayoutEffect(() => {
    // Start after the backdrop mounts at opacity zero. Its opacity has a single animated owner.
    if (bodyVisible && !closing.current) motionRef.current.animateBackdropOpen();
  }, [bodyVisible, session]);
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => closePicker()}
      onShow={() => {
        Keyboard.dismiss();
        AccessibilityInfo.announceForAccessibility(title);
        if (!active.current || closing.current) return;
        shown.current = true;
        bodyMounted.current = true;
        setBodyVisible(true);
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 justify-end"
          style={{
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          {bodyVisible && (
            <Animated.View
              key={`backdrop-${session}`}
              style={motion.backdropStyle}
              className="absolute inset-0"
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="닫기"
                onPress={() => closePicker()}
                className="absolute inset-0 bg-theme-overlay/25"
              />
            </Animated.View>
          )}
          {bodyVisible && (
            <GestureDetector gesture={motion.panGesture}>
              <Animated.View
                key={`sheet-${session}`}
                entering={motion.sheetEnter}
                style={motion.sheetStyle}
                pointerEvents={closingBody ? 'none' : 'auto'}
                collapsable={false}
                className="w-full shrink"
              >
                <View
                  onLayout={motion.onSheetLayout}
                  accessibilityViewIsModal
                  className="w-full shrink rounded-t-3xl bg-theme-surface px-[5%] pt-2 shadow-xl"
                  style={{
                    maxHeight: sheetHeight,
                    height: fixedHeight ? sheetHeight : undefined,
                  }}
                >
                  <View className="shrink-0 items-center ">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="닫기"
                      onPress={() => closePicker()}
                      className="h-9 w-9 items-center justify-center rounded-full"
                      hitSlop={4}
                    >
                      <AppIcon name="chevron-down" size={iconSizes.lg} color={colors.accent} />
                    </Pressable>
                    <View className="self-stretch flex-row items-center justify-center gap-2 mx-5 ">
                      {titleIcon}
                      <Text
                        accessibilityRole="header"
                        className="shrink text-center text-xl font-semibold tracking-tight pb-2 mb-4 "
                      >
                        {title}
                      </Text>
                    </View>
                  </View>
                  <View className={`${fixedHeight ? 'flex-1' : 'shrink'} min-h-0 overflow-hidden`}>
                    <GestureDetector gesture={motion.scrollGesture}>
                      <AnimatedScrollView
                        ref={motion.scrollRef}
                        key={contentKey}
                        onLayout={fade.onLayout}
                        onContentSizeChange={fade.onContentSizeChange}
                        onScroll={motion.onScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={{
                          paddingBottom: appRem * 2 + insets.bottom,
                        }}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        className={`${fixedHeight ? 'flex-1' : 'shrink'} min-h-0`}
                        contentContainerClassName="gap-6"
                        nestedScrollEnabled
                        bounces={false}
                        overScrollMode="never"
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="none"
                      >
                        {typeof children === 'function' ? children(closePicker) : children}
                      </AnimatedScrollView>
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
                </View>
              </Animated.View>
            </GestureDetector>
          )}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
