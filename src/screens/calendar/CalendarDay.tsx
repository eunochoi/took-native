import type { ReactNode } from 'react';
import { getDay, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';

export function CalendarDay({
  date,
  outside,
  selected,
  today,
  onSelect,
  disabled = false,
  label,
  children,
  showSelectedIndicator = true,
}: {
  date: string;
  outside: boolean;
  selected: boolean;
  today: boolean;
  onSelect: () => void;
  disabled?: boolean;
  label?: string;
  children?: ReactNode;
  showSelectedIndicator?: boolean;
}) {
  const weekday = getDay(parseISO(date));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label ?? date, today ? '오늘' : ''].filter(Boolean).join(', ')}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      className={`flex-1 items-center justify-center rounded-lg ${disabled || outside ? 'opacity-30' : 'opacity-100'}`}
    >
      {children ?? (
        <Text
          className={`text-xs ${weekday === 6 ? 'text-theme-calendar-saturday' : weekday === 0 ? 'text-theme-calendar-sunday' : 'text-theme-text-secondary'}`}
        >
          {Number(date.slice(-2))}
        </Text>
      )}
      {showSelectedIndicator && selected && !outside && (
        <View className="absolute -bottom-[3px] h-1.5 w-1.5 rounded-full bg-theme-accent/80" />
      )}
      {today && !outside && (
        <View className="absolute -bottom-[3px] h-1.5 w-4 rounded-full bg-theme-accent" />
      )}
    </Pressable>
  );
}
