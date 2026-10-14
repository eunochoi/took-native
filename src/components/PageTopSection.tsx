import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BODY_DESCRIPTION_CLASS_NAME } from '../theme/classes';
import { ColorView } from './ColorTransition';
import { Text } from './Text';

export function PageTopSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <ColorView className="h-[170px] shrink-0 bg-theme-surface">
      <View className="px-[5%] min-w-0 flex-1 gap-6 justify-end">
        <View className="gap-1.5 items-start">
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-3xl font-bold leading-tight tracking-tight"
          >
            {title}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" className={BODY_DESCRIPTION_CLASS_NAME}>
            {description}
          </Text>
        </View>
        <View>{children}</View>
      </View>
    </ColorView>
  );
}
