import { Image, View } from 'react-native';
import { Text } from './Text';
import { EMPTY_STATE_CLASS_NAME } from '../theme/classes';

const standingCat = require('../../assets/cats/cat-blue-standing.png');
const standingCatSize = Image.resolveAssetSource(standingCat);

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <View className={EMPTY_STATE_CLASS_NAME}>
      <Image
        source={standingCat}
        resizeMode="contain"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-20 w-36 max-w-full shrink-0"
        style={{ height: 'auto', aspectRatio: standingCatSize.width / standingCatSize.height }}
      />
      <View className="gap-1.5">
        <Text className="text-center text-lg font-bold">{title}</Text>
        <Text className="text-center text-sm leading-relaxed text-theme-text-secondary">
          {description}
        </Text>
      </View>
    </View>
  );
}
