import type { ViewProps } from 'react-native';
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
    <ColorView className="shrink-0 min-w-0 gap-1 items-start pt-8 pb-1 px-[5%]" onLayout={onLayout}>
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
    </ColorView>
  );
}
