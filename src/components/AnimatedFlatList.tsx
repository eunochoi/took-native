import { cssInterop } from 'nativewind';
import Animated from 'react-native-reanimated';

export const AnimatedFlatList = cssInterop(Animated.FlatList, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
  columnWrapperClassName: 'columnWrapperStyle',
}) as typeof Animated.FlatList;
