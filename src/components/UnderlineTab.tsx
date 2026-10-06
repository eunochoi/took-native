import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { Text } from './Text';

export function UnderlineTab({
  selected,
  children,
  ...props
}: Omit<PressableProps, 'children'> & { selected: boolean; children: ReactNode }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ ...props.accessibilityState, selected }}
      className={`pb-1 border-b-2 ${selected ? 'border-b-theme-accent' : 'border-b-transparent'}`}
    >
      <Text
        className={`text-base ${selected ? 'text-theme-text-primary' : 'text-theme-text-tertiary'}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}
