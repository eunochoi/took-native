import type { ComponentPropsWithRef } from 'react';
import type { LinearGradientProps } from 'expo-linear-gradient';
import { requireNativeView } from 'expo';
import { cssInterop } from 'nativewind';
import { View, type ViewProps } from 'react-native';
import Animated, {
  convertToRGBA,
  processColor,
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useAppTheme } from '../theme/AppThemeProvider';

type NativeGradientProps = ViewProps & {
  colors: ReturnType<typeof processColor>[];
  locations?: readonly number[] | null;
  startPoint?: readonly number[] | null;
  endPoint?: readonly number[] | null;
  dither?: boolean;
};
// Animated colors are already ARGB; the JS LinearGradient wrapper would process them again.
const NativeGradient = requireNativeView<NativeGradientProps>('ExpoLinearGradient');
const AnimatedGradient = Animated.createAnimatedComponent(NativeGradient);
const fadeAlphas = [
  1, 248 / 255, 228 / 255, 200 / 255, 165 / 255, 128 / 255,
  90 / 255, 55 / 255, 27 / 255, 7 / 255, 0,
];
export const SurfaceGradient = cssInterop(
  function SurfaceGradient({ colors, start, end, ...props }: LinearGradientProps) {
    const { backgroundColors } = useAppTheme();
    const animatedProps = useAnimatedProps<NativeGradientProps>(
      () => {
        const [r, g, b] = convertToRGBA(backgroundColors.surface.value);
        return {
          colors: fadeAlphas.map(
            (alpha) => processColor(
              `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`,
            ),
          ),
        };
      },
      [],
    );
    return (
      <AnimatedGradient
        {...props}
        colors={colors.map((color) => processColor(color))}
        startPoint={start ? (Array.isArray(start) ? start : [start.x, start.y]) : undefined}
        endPoint={end ? (Array.isArray(end) ? end : [end.x, end.y]) : undefined}
        animatedProps={animatedProps}
      />
    );
  },
  { className: 'style' },
);

export const ColorView = cssInterop(
  function ColorView({
    style,
    background,
    ...props
  }: ComponentPropsWithRef<typeof View> & { background?: 'surface' | 'accentLight' }) {
    const { backgroundColors } = useAppTheme();
    const animatedStyle = useAnimatedStyle(() =>
      background ? { backgroundColor: backgroundColors[background].value } : {},
    );
    return <Animated.View {...props} style={[style, animatedStyle]} />;
  },
  { className: 'style' },
);
