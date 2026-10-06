import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <View className="my-1 max-w-full min-w-0 self-start flex-row items-center overflow-hidden rounded-full border border-theme-border/50 bg-theme-surface/70">
      {Children.toArray(children).map((child, index) => (
        <Fragment key={isValidElement(child) ? child.key : index}>
          {index > 0 && (
            <View
              pointerEvents="none"
              accessible={false}
              className="h-4 w-px shrink-0 bg-theme-accent/20"
            />
          )}
          {child}
        </Fragment>
      ))}
    </View>
  );
}
