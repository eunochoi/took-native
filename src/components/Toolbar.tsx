import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ColorView } from './ColorTransition';
import { ScrollEdgeFade } from './ScrollEdgeFade';

export function Toolbar({
  children,
  fadeVisible = false,
}: {
  children: ReactNode;
  fadeVisible?: boolean;
}) {
  return (
    <ColorView className="h-12 w-full shrink-0 bg-theme-surface px-[5%] py-1.5">
      <View className="min-w-0 flex-1 flex-row items-stretch gap-6 px-0.5">{children}</View>
      <ScrollEdgeFade edge="top" visible={fadeVisible} outside />
    </ColorView>
  );
}
