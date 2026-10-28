import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { ColorView, SurfaceGradient } from './ColorTransition';

export function Toolbar({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View className="w-full shrink-0">
      <ColorView background="surface" className="h-10 w-full shrink-0 bg-theme-surface px-[5%]">
        <View className="min-w-0 flex-1 flex-row items-stretch gap-6 px-0.5">{children}</View>
      </ColorView>
      <SurfaceGradient
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="-mt-px h-8 w-full"
        colors={[
          colors.surface,
          `${colors.surface}F8`,
          `${colors.surface}E4`,
          `${colors.surface}C8`,
          `${colors.surface}A5`,
          `${colors.surface}80`,
          `${colors.surface}5A`,
          `${colors.surface}37`,
          `${colors.surface}1B`,
          `${colors.surface}07`,
          `${colors.surface}00`,
        ]}
        locations={[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
    </View>
  );
}
