import { getDay, parseISO } from 'date-fns';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { Text } from '../../components/Text';
import { isDate } from '../../domain/date';

export function CalendarDay({
  date,
  month,
  today,
  selected,
  onSelect,
  onMonthChange,
  disabled = false,
  dimmed = false,
  label,
  children,
  showTodayIndicator = true,
  showSelectedIndicator = true,
  fillHeight = false,
  className,
  contentClassName,
  textClassName,
}: {
  date: string;
  month: string;
  today: string;
  selected?: string;
  onSelect?: (date: string) => void;
  onMonthChange?: (month: string) => void;
  disabled?: boolean;
  dimmed?: boolean;
  label?: string;
  children?: ReactNode;
  showTodayIndicator?: boolean;
  showSelectedIndicator?: boolean;
  fillHeight?: boolean;
  className?: string;
  contentClassName?: string;
  textClassName?: string;
}) {
  const outside = date.slice(0, 7) !== month;
  const isToday = date === today;
  const isSelected = date === selected;
  const weekday = getDay(parseISO(date));
  const unavailable = disabled || !isDate(date) || (!onSelect && !onMonthChange);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label ?? date, isToday ? '오늘' : ''].filter(Boolean).join(', ')}
      accessibilityState={{ selected: isSelected, disabled: unavailable }}
      disabled={unavailable}
      onPress={() => {
        if (unavailable) return;
        if (outside && onMonthChange) onMonthChange(date.slice(0, 7));
        else onSelect?.(date);
      }}
      className={twMerge(
        'flex-1 items-center justify-center rounded-lg',
        fillHeight ? 'min-h-0' : 'aspect-[1/1.25]',
        dimmed || outside ? 'opacity-30' : 'opacity-100',
        className,
      )}
    >
      {children ?? (
        <View
          key={"default-day"}
          className={twMerge('w-3/5 aspect-square items-center justify-center', contentClassName)}
        >
          <Text
            className={twMerge(
              `text-xs ${weekday === 6 ? 'text-theme-calendar-saturday' : weekday === 0 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`,
              textClassName,
              showSelectedIndicator &&
                isSelected &&
                !outside &&
                'bg-theme-accent text-theme-text-on-accent w-7 h-7 leading-7 text-center rounded-full',
            )}
          >
            {Number(date.slice(-2))}
          </Text>
        </View>
      )}
      {showTodayIndicator && isToday && !outside && (
        <View className="absolute -bottom-[3px] h-1.5 w-4 rounded-full bg-theme-accent" />
      )}
    </Pressable>
  );
}
