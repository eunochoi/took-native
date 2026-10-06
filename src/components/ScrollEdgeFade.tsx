import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/AppThemeProvider';
import tokens from '../theme/tokens.json';

const alphas = ['FF', 'F7', 'D6', '80', '29', '08', '00'];
const locations = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;

export function ScrollEdgeFade({
  edge,
  visible,
  tone = 'accent-light',
  includeBottomInset = true,
}: {
  edge: 'top' | 'bottom';
  tone?: 'accent-light' | 'surface';
  includeBottomInset?: boolean;
  visible: boolean;
}) {
  const { colors, rem: appRem, reducedMotion } = useAppTheme();
  const insets = useSafeAreaInsets();
  const stops = alphas.map(
    (alpha) => `${tone === 'surface' ? colors.surface : colors.accentLight}${alpha}`,
  );
  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`absolute inset-x-0 z-20 ${edge === 'top' ? 'top-0' : 'bottom-0'}`}
      style={{
        height: appRem * 3 + (edge === 'bottom' && includeBottomInset ? insets.bottom : 0),
        opacity: visible ? 1 : 0,
        transitionProperty: 'opacity',
        transitionDuration: `${reducedMotion ? 0 : tokens.motion.fade}ms`,
        transitionTimingFunction: 'ease-in-out',
      }}
    >
      <LinearGradient
        colors={stops as [string, string, ...string[]]}
        locations={locations}
        start={edge === 'top' ? { x: 0, y: 0 } : { x: 0, y: 1 }}
        end={edge === 'top' ? { x: 0, y: 1 } : { x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
