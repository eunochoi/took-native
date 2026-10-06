import { cssInterop } from 'nativewind';
import { Pressable } from 'react-native-gesture-handler';

export const GesturePressable = cssInterop(Pressable, { className: 'style' });
