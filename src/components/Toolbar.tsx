import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { View } from 'react-native';

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <View className="my-1 h-10 max-w-full min-w-0 self-start flex-row items-stretch overflow-hidden ios:curve-continuous rounded-full border border-theme-border/60 bg-theme-border-muted/60 pr-0.5">
      {Children.toArray(children).map((child, index) => (
        <Fragment key={isValidElement(child) ? child.key : index}>
          {index > 0 && (
            <View
              pointerEvents="none"
              accessible={false}
              className="mx-0.5 h-6 w-px shrink-0 self-center bg-theme-border/60"
            />
          )}
          {child}
        </Fragment>
      ))}
    </View>
  );
}
