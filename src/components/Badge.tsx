import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { BADGE_CLASS_NAME, BADGE_TEXT_CLASS_NAME } from '../theme/classes';
import { Text } from './Text';

export function Badge({
  children,
  className = '',
}: {
  children: number | string;
  className?: string;
}) {
  return (
    <View className={twMerge(BADGE_CLASS_NAME, className)}>
      <Text numberOfLines={1} adjustsFontSizeToFit className={BADGE_TEXT_CLASS_NAME}>
        {children}
      </Text>
    </View>
  );
}
