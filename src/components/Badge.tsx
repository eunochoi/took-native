import { View } from 'react-native';
import { Text } from './Text';
import { BADGE_CLASS_NAME, BADGE_TEXT_CLASS_NAME } from '../theme/classes';

export function Badge({
  children,
  className = '',
}: {
  children: number | string;
  className?: string;
}) {
  return (
    <View className={`${BADGE_CLASS_NAME} ${className}`}>
      <Text className={BADGE_TEXT_CLASS_NAME}>{children}</Text>
    </View>
  );
}
