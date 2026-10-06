import type { ReactNode } from 'react';
import { View } from 'react-native';
import { TOOLBAR_SECTION_CLASS_NAME } from '../theme/classes';

export function Toolbar({ children }: { children: ReactNode }) {
  return <View className={TOOLBAR_SECTION_CLASS_NAME}>{children}</View>;
}
