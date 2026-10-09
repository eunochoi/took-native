import type { ComponentProps } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useIsFocused, useNavigationState, useRoute } from 'expo-router/react-navigation';
import { View } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { useModalTransition } from '../navigation/ModalNavigationProvider';

type Props = Omit<
  ComponentProps<typeof BottomSheetModal>,
  | 'visible'
  | 'presentation'
  | 'dismissOnBack'
  | 'onClose'
  | 'maxHeight'
  | 'fixedHeight'
  | 'onOpening'
  | 'onOpened'
  | 'dimBackdrop'
> & {
  backRoute: Href;
  closeRequested?: boolean;
  onClosed?: () => void;
};

// Navigation owns the page lifetime; the shared sheet owns its dismissal animation.
export function BottomSheetPage({
  backRoute,
  closeRequested = false,
  scrollFade = true,
  onBeforeClose,
  onClosed,
  ...props
}: Props) {
  const router = useRouter();
  const focused = useIsFocused();
  const { key } = useRoute();
  const hasParentSheet = useNavigationState((state) => {
    const index = state.routes.findIndex((route) => route.key === key);
    const previous = state.routes[index - 1];
    // The root stack's app screens are route sheets; tabs and built-in pages are not.
    return !!previous && !['(tabs)', '_sitemap', '+not-found'].includes(previous.name);
  });
  const { beginOpening, beginClosing, finishTransition } = useModalTransition();
  const token = useRef<number | null>(null);
  useLayoutEffect(
    () => () => {
      // Keep the closing lock until the route has actually left the stack.
      if (token.current !== null) finishTransition(key, token.current);
    },
    [key, finishTransition],
  );
  return (
    // Keep earlier sheets visible beneath the entering/leaving sheet, preserving their state.
    <View
      className="flex-1"
      pointerEvents={focused ? 'auto' : 'none'}
      accessibilityElementsHidden={!focused}
      importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'}
    >
      <BottomSheetModal
        {...props}
        visible={!closeRequested}
        presentation="screen"
        dimBackdrop={!hasParentSheet}
        dismissOnBack={focused}
        fixedHeight
        scrollFade={scrollFade}
        onOpening={() => {
          token.current = beginOpening(key);
        }}
        onOpened={() => {
          if (token.current !== null) finishTransition(key, token.current);
          token.current = null;
        }}
        onBeforeClose={() => {
          if (!focused || onBeforeClose?.() === false) return false;
          const closingToken = beginClosing(key);
          if (closingToken === null) return false;
          token.current = closingToken;
          return true;
        }}
        onClose={() => {
          try {
            if (router.canGoBack()) router.back();
            else router.replace(backRoute);
            onClosed?.();
          } catch (error) {
            if (token.current !== null) finishTransition(key, token.current);
            token.current = null;
            throw error;
          }
        }}
      />
    </View>
  );
}
