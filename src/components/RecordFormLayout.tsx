import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
import { View } from 'react-native';
import { BottomSheetPage } from './BottomSheetPage';

export function RecordFormLayout({
  title,
  backRoute,
  onBeforeClose,
  closeRequested = false,
  onClosed,
  footer,
  overlays,
  children,
  scrollEnabled = true,
}: {
  title: string;
  backRoute: Href;
  onBeforeClose?: () => boolean;
  closeRequested?: boolean;
  onClosed?: () => void;
  footer: ReactNode;
  overlays?: ReactNode;
  children: ReactNode;
  scrollEnabled?: boolean;
}) {
  return (
    <>
      <BottomSheetPage
        title={title}
        backRoute={backRoute}
        onBeforeClose={onBeforeClose}
        closeRequested={closeRequested}
        onClosed={onClosed}
        footer={footer}
        scrollEnabled={scrollEnabled}
      >
        <View className="gap-6">{children}</View>
      </BottomSheetPage>
      {overlays}
    </>
  );
}
