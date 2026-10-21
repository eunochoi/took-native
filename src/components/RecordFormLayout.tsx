import type { ReactNode, ComponentProps } from 'react';
import type { Href } from 'expo-router';
import { View } from 'react-native';
import { BottomSheetPage } from './BottomSheetPage';

export function RecordFormLayout({
  title,
  titleAction,
  backRoute,
  onBeforeClose,
  closeRequested = false,
  onClosed,
  footer,
  overlays,
  children,
  scrollEnabled = true,
  fillContent = false,
}: {
  title: string;
  titleAction?: ComponentProps<typeof BottomSheetPage>['titleAction'];
  backRoute: Href;
  onBeforeClose?: () => boolean;
  closeRequested?: boolean;
  onClosed?: () => void;
  footer: ReactNode;
  overlays?: ReactNode;
  children: ReactNode;
  scrollEnabled?: boolean;
  fillContent?: boolean;
}) {
  return (
    <>
      <BottomSheetPage
        title={title}
        titleAction={titleAction}
        backRoute={backRoute}
        onBeforeClose={onBeforeClose}
        closeRequested={closeRequested}
        onClosed={onClosed}
        footer={footer}
        scrollEnabled={scrollEnabled}
        fillContent={fillContent}
      >
        <View className={fillContent ? 'shrink min-h-0 gap-3' : 'gap-6'}>{children}</View>
      </BottomSheetPage>
      {overlays}
    </>
  );
}
