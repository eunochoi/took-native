import { useEffect, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  View,
  useWindowDimensions,
  type ScrollView,
} from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { type AnimatedRef } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomSheetLifecycle, type CloseBottomSheet } from '../hooks/useBottomSheetLifecycle';
import { useScrollFade } from '../hooks/useScrollFade';
import { useAppTheme } from '../theme/AppThemeProvider';
import { BottomSheetScrollViewport } from './BottomSheetScrollViewport';
import { BottomSheetHeader } from './BottomSheetHeader';

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
  presentation = 'modal',
  rightAction,
  dismissOnBack = true,
  onBeforeClose,
  footer,
  scrollEnabled = true,
  scrollRef,
}: {
  visible: boolean;
  title: string;
  titleIcon?: ReactNode;
  onClose: () => void;
  children: ReactNode | ((closeSheet: CloseBottomSheet) => ReactNode);
  maxHeight?: number;
  fixedHeight?: boolean;
  scrollFade?: boolean;
  contentKey?: string | number;
  presentation?: 'modal' | 'screen';
  rightAction?: ReactNode;
  dismissOnBack?: boolean;
  onBeforeClose?: () => boolean;
  footer?: ReactNode;
  scrollEnabled?: boolean;
  scrollRef?: AnimatedRef<ScrollView>;
}) {
  const { rem: appRem, reducedMotion: reduceMotion } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const fade = useScrollFade();
  const { onScrollOffset } = fade;
  useEffect(() => onScrollOffset(0), [contentKey, onScrollOffset]);
  const sheetHeight = Math.max(0, Math.min(maxHeight ?? height * 0.85, height - insets.top));
  const { present, bodyVisible, closingBody, session, motion, closeSheet, onShow } =
    useBottomSheetLifecycle({
      visible,
      title,
      onClose,
      onBeforeClose,
      presentation,
      dismissOnBack,
      height,
      rem: appRem,
      reducedMotion: reduceMotion,
      scrollFade,
      contentKey,
      onScrollOffset,
      scrollEnabled,
      scrollRef,
    });
  const content = (
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
              onPress={() => closeSheet()}
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
                <BottomSheetHeader
                  title={title}
                  titleIcon={titleIcon}
                  rightAction={rightAction}
                  onClose={() => closeSheet()}
                />
                <BottomSheetScrollViewport
                  motion={motion}
                  fade={fade}
                  fixedHeight={fixedHeight}
                  scrollEnabled={scrollEnabled}
                  scrollFade={scrollFade}
                  contentKey={contentKey}
                  bottomPadding={appRem * 2 + (footer ? 0 : insets.bottom)}
                >
                  {typeof children === 'function' ? children(closeSheet) : children}
                </BottomSheetScrollViewport>
                {footer && (
                  <View className="mt-3 mb-4" style={{ paddingBottom: insets.bottom }}>
                    {footer}
                  </View>
                )}
              </View>
            </Animated.View>
          </GestureDetector>
        )}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
  if (presentation === 'screen') return present ? content : null;
  return (
    <Modal
      visible={present}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => closeSheet()}
      onShow={onShow}
    >
      {content}
    </Modal>
  );
}
