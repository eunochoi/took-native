import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeProvider';
import tokens from '../theme/tokens.json';

export function ScrollEdgeFade({
  edge,
  visible,
  includeBottomInset = true,
  outside = false,
}: {
  edge: 'top' | 'bottom';
  visible: boolean;
  includeBottomInset?: boolean;
  outside?: boolean;
}) {
  const { colors, rem, reducedMotion } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isBottom = edge === 'bottom';
  const fadeHeight = rem * 2;
  const toolbarHeight = isBottom ? 48 : 0;
  const bottomInset = isBottom && includeBottomInset ? insets.bottom : 0;
  const solidHeight = toolbarHeight + bottomInset;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`absolute inset-x-0 z-20 ${isBottom ? (outside ? 'bottom-full' : 'bottom-0') : outside ? 'top-full' : 'top-0'}`}
      style={{ height: fadeHeight + solidHeight }}
    >
      <Animated.View
        className="absolute inset-x-0 top-0"
        style={{
          height: fadeHeight,
          opacity: visible ? 1 : 0,
          transitionProperty: 'opacity',
          transitionDuration: `${reducedMotion ? 0 : tokens.motion.scrollFade}ms`,
          transitionTimingFunction: 'linear',
        }}
      >
        <LinearGradient
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
          start={isBottom ? { x: 0, y: 1 } : { x: 0, y: 0 }}
          end={isBottom ? { x: 0, y: 0 } : { x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {solidHeight > 0 && (
        <View
          className="absolute inset-x-0 bottom-0 bg-theme-surface"
          style={{ height: solidHeight }}
        />
      )}
    </View>
  );
}
