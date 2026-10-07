import { Children, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from '../../components/Text';

export function CalendarGrid({
  children,
  fillHeight = false,
  className,
  ...props
}: ViewProps & {
  children: ReactNode;
  fillHeight?: boolean;
}) {
  const days = Children.toArray(children);
  return (
    <View {...props} className={twMerge(fillHeight ? 'flex-1 min-h-0' : undefined, className)}>
      <View className="flex-row py-2">
        {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
          <Text
            key={day}
            className={`flex-1 text-center text-sm ${index === 5 ? 'text-theme-calendar-saturday' : index === 6 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`}
          >
            {day}
          </Text>
        ))}
      </View>
      <View className={fillHeight ? 'flex-1 min-h-0 gap-1' : 'gap-1'}>
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, row) => (
          <View
            key={row}
            className={fillHeight ? 'flex-1 min-h-0 flex-row gap-1' : 'flex-row gap-1'}
          >
            {days.slice(row * 7, row * 7 + 7)}
          </View>
        ))}
      </View>
    </View>
  );
}
