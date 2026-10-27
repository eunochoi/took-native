import { useI18n } from '../../i18n/react';
import { Children, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from '../../components/Text';

export function CalendarGrid({
  children,
  fillHeight = false,
  minimumRows = 0,
  minimumRowHeight,
  className,
  ...props
}: ViewProps & {
  children: ReactNode;
  fillHeight?: boolean;
  minimumRows?: number;
  minimumRowHeight?: number;
}) {
  const { t } = useI18n();

  const days = Children.toArray(children);
  const sizingClassName = minimumRowHeight === undefined ? 'flex-1 min-h-0' : 'grow';
  return (
    <View {...props} className={twMerge(fillHeight ? sizingClassName : undefined, className)}>
      <View className="h-10 mb-1.5 flex-row items-center">
        {[
          t('calendar.mon'),
          t('calendar.tue'),
          t('calendar.wed'),
          t('calendar.thu'),
          t('calendar.fri'),
          t('calendar.sat'),
          t('calendar.sun'),
        ].map((day, index) => (
          <Text
            key={day}
            className={`flex-1 text-center text-sm ${index === 5 ? 'text-theme-calendar-saturday' : index === 6 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`}
          >
            {day}
          </Text>
        ))}
      </View>
      <View className={fillHeight ? `${sizingClassName} gap-1` : 'gap-1'}>
        {Array.from({ length: Math.max(minimumRows, Math.ceil(days.length / 7)) }, (_, row) => (
          <View
            key={row}
            className={fillHeight ? `${sizingClassName} flex-row gap-1` : 'flex-row gap-1'}
            style={
              fillHeight && minimumRowHeight !== undefined
                ? { minHeight: minimumRowHeight }
                : undefined
            }
          >
            {days.slice(row * 7, row * 7 + 7)}
          </View>
        ))}
      </View>
    </View>
  );
}
