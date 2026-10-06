import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

export const AnimatedScrollView = cssInterop(Animated.ScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
