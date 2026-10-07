import type { ComponentProps } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useWindowDimensions } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';

type Props = Omit<
  ComponentProps<typeof BottomSheetModal>,
  'visible' | 'presentation' | 'dismissOnBack' | 'onClose' | 'maxHeight' | 'fixedHeight'
> & {
  backRoute: Href;
  closeRequested?: boolean;
};

// Navigation owns the page lifetime; the shared sheet owns its dismissal animation.
export function BottomSheetPage({
  backRoute,
  closeRequested = false,
  scrollFade = true,
  ...props
}: Props) {
  const router = useRouter();
  const focused = useIsFocused();
  const { height } = useWindowDimensions();
  return (
    <BottomSheetModal
      {...props}
      visible={!closeRequested}
      presentation="screen"
      dismissOnBack={focused}
      maxHeight={height * 0.9}
      fixedHeight
      scrollFade={scrollFade}
      onClose={() => (router.canGoBack() ? router.back() : router.replace(backRoute))}
    />
  );
}
