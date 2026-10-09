import type { ComponentProps } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useIsFocused, useRoute } from 'expo-router/react-navigation';
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
    <BottomSheetModal
      {...props}
      visible={!closeRequested}
      presentation="screen"
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
  );
}
