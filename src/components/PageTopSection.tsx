import { View, type ViewProps } from 'react-native';
import { TOP_HASHTAG_CLASS_NAME } from '../theme/classes';
import { ColorView } from './ColorTransition';
import { Text } from './Text';

export function PageTopSection({
  title,
  hashtags,
  onLayout,
}: {
  title: string;
  hashtags: string;
  onLayout?: ViewProps['onLayout'];
}) {
  return (
    <ColorView className="h-[100px] shrink-0" onLayout={onLayout}>
      <View className="pb-1 px-[5%] min-w-0 flex-1 justify-end">
        <View className="gap-1 items-start">
          <Text numberOfLines={1} ellipsizeMode="tail" className={TOP_HASHTAG_CLASS_NAME}>
            {hashtags}
          </Text>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            className="text-4xl font-bold leading-tight tracking-tight"
          >
            {title}
          </Text>
        </View>
      </View>
    </ColorView>
  );
}
