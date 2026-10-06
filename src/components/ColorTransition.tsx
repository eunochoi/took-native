import type { ComponentPropsWithRef } from 'react';
import { cssInterop } from 'nativewind';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAppTheme } from '../theme/AppThemeProvider';
import tokens from '../theme/tokens.json';

export const ColorView = cssInterop(
  function ColorView({ style, ...props }: ComponentPropsWithRef<typeof View>) {
    const { reducedMotion } = useAppTheme();
    return (
      <Animated.View
        {...props}
        style={[
          style,
          {
            transitionProperty: 'backgroundColor',
            transitionDuration: `${reducedMotion ? 0 : tokens.motion.colorTransition}ms`,
            transitionTimingFunction: 'ease-out',
          },
        ]}
      />
    );
  },
  { className: 'style' },
);
