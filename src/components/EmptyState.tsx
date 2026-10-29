import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Text } from './Text';
import { EMPTY_STATE_CLASS_NAME } from '../theme/classes';

const standingCat = require('../../assets/cats/cat-blue-standing.png');
const standingCatSize = Image.resolveAssetSource(standingCat);

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View className={EMPTY_STATE_CLASS_NAME}>
      <View className="h-14 w-14 items-center justify-center ios:curve-continuous rounded-full bg-theme-accent/10">
        {icon}
      </View>
      <View className="gap-1.5">
        <Text className="text-center text-lg font-bold">{title}</Text>
        <Text className="text-center text-sm leading-relaxed text-theme-text-secondary">
          {description}
        </Text>
      </View>
      <Image
        source={standingCat}
        resizeMode="contain"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-3 w-36 max-w-full shrink-0"
        style={{ height: 'auto', aspectRatio: standingCatSize.width / standingCatSize.height }}
      />
    </View>
  );
}
