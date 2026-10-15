import { useEffect, type ReactNode, type ComponentProps } from 'react';
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
import { BottomSheetHeader } from './BottomSheetHeader';
import {
  BottomSheetScrollViewport,
  type BottomSheetScrollProps,
} from './BottomSheetScrollViewport';
import { NoticeHost } from './NoticeProvider';

export function BottomSheetModal({
  visible,
  title,
  titleIcon,
  titleAction,
  onClose,
  children,
  renderScrollView,
  renderBody,
  maxHeight,
  fixedHeight = false,
  scrollFade = false,
  contentKey,
  contentBottomPadding,
  presentation = 'modal',
  dimBackdrop = true,
  menuAction,
  dismissOnBack = true,
  dismissible = true,
  onBeforeClose,
  onOpening,
  onOpened,
  footer,
  scrollEnabled = true,
  fillContent = false,
  scrollRef,
}: {
  visible: boolean;
  title?: string;
  titleIcon?: ReactNode;
  titleAction?: ComponentProps<typeof BottomSheetHeader>['titleAction'];
  onClose: () => void;
  children?: ReactNode | ((closeSheet: CloseBottomSheet) => ReactNode);
  maxHeight?: number;
  fixedHeight?: boolean;
  scrollFade?: boolean;
  contentKey?: string | number;
  contentBottomPadding?: number;
  presentation?: 'modal' | 'screen';
  dimBackdrop?: boolean;
  menuAction?: ReactNode;
  dismissOnBack?: boolean;
  dismissible?: boolean;
  onBeforeClose?: () => boolean;
  onOpening?: () => void;
  onOpened?: () => void;
  footer?: ReactNode | ((closeSheet: CloseBottomSheet) => ReactNode);
  scrollEnabled?: boolean;
  fillContent?: boolean;
  scrollRef?: AnimatedRef<ScrollView>;
  renderScrollView?: (props: BottomSheetScrollProps) => ReactNode;
  renderBody?: (closeSheet: CloseBottomSheet) => ReactNode;
}) {
  const { rem: appRem, reducedMotion: reduceMotion } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const fade = useScrollFade();
  const { onScrollOffset } = fade;
  useEffect(() => onScrollOffset(0), [contentKey, onScrollOffset]);
  const sheetHeight = Math.max(0, Math.min(maxHeight ?? height * 0.95, height - insets.top));
  const { present, bodyVisible, closingBody, session, motion, closeSheet, onShow } =
    useBottomSheetLifecycle({
      visible,
      title: title ?? '',
      onClose,
      onBeforeClose,
      onOpening,
      onOpened,
      presentation,
      dismissOnBack,
      dismissible,
      height,
      rem: appRem,
      reducedMotion: reduceMotion,
      scrollFade,
      contentKey,
      onScrollOffset,
      scrollEnabled,
      headerOnlyDrag: fillContent,
      scrollRef,
    });
  const header = (
    <BottomSheetHeader
      title={title}
      titleIcon={titleIcon}
      titleAction={titleAction}
      menuAction={menuAction}
      onClose={dismissible ? () => closeSheet() : undefined}
    />
  );
  const sheet = (
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
        className={`w-full shrink rounded-t-3xl border-[1px] border-theme-border bg-theme-surface ${renderBody ? '' : 'px-[5%]'} pt-2 shadow-2xl shadow-theme-overlay/60`}
        style={{
          maxHeight: sheetHeight,
          height: fixedHeight ? sheetHeight : undefined,
        }}
      >
        {fillContent ? (
          <GestureDetector gesture={motion.panGesture}>
            <View collapsable={false}>{header}</View>
          </GestureDetector>
        ) : (
          header
        )}
        {renderBody ? (
          renderBody(closeSheet)
        ) : fillContent ? (
          <View className="flex-1 min-h-0 pt-6 pb-4">
            {typeof children === 'function' ? children(closeSheet) : children}
          </View>
        ) : (
          <BottomSheetScrollViewport
            motion={motion}
            renderScrollView={renderScrollView}
            fade={fade}
            fixedHeight={fixedHeight}
            scrollEnabled={scrollEnabled}
            scrollFade={scrollFade}
            contentKey={contentKey}
            bottomPadding={
              contentBottomPadding ??
              (!footer && insets.bottom > 0 ? appRem * 3 + insets.bottom : undefined)
            }
          >
            {typeof children === 'function' ? children(closeSheet) : children}
          </BottomSheetScrollViewport>
        )}
        {footer && (
          <View
            className="pb-4"
            style={insets.bottom > 0 ? { paddingBottom: appRem + insets.bottom } : undefined}
          >
            {typeof footer === 'function' ? footer(closeSheet) : footer}
          </View>
        )}
      </View>
    </Animated.View>
  );
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
              accessible={dismissible}
              disabled={!dismissible}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={() => closeSheet()}
              className={`absolute inset-0 ${dimBackdrop ? 'bg-theme-overlay/25' : ''}`}
            />
          </Animated.View>
        )}
        {bodyVisible &&
          (fillContent ? (
            sheet
          ) : (
            <GestureDetector gesture={motion.panGesture}>{sheet}</GestureDetector>
          ))}
        {presentation === 'modal' && <NoticeHost modal active={present} />}
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
      onRequestClose={() => {
        if (dismissOnBack && dismissible) closeSheet();
      }}
      onShow={onShow}
    >
      {content}
    </Modal>
  );
}
