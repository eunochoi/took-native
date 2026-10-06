import { useAppTheme } from '../../theme/AppThemeProvider';
import { type ReactNode, type ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { format, parseISO } from 'date-fns';
import { calendarDays } from '../../domain/calendar';
import { useMonthSwipe } from '../../hooks/useMonthSwipe';
import { Text } from '../../components/Text';
import { CalendarDay } from './CalendarDay';

export function MonthCalendar({
  month,
  onMonthChange,
  selected,
  onSelect,
  today,
  renderDay,
  canSelect,
  headingWeight = 'semibold',
  headerTitle,
  headerContent,
  fillHeight = false,
}: {
  fillHeight?: boolean;
  headingWeight?: 'normal' | 'semibold';
  headerTitle?: string;
  headerContent?: ReactNode;
  month: string;
  onMonthChange: (month: string) => void;
  selected: string;
  onSelect: (date: string) => void;
  today: string;
  renderDay?: (props: Omit<ComponentProps<typeof CalendarDay>, 'children'>) => ReactNode;
  canSelect?: (date: string) => boolean;
}) {
  const { colors, iconSizes, rem: appRem } = useAppTheme();
  const days = calendarDays(month);
  const rows = days.length / 7;
  const swipe = useMonthSwipe(month, onMonthChange);
  return (
    <View className={fillHeight ? 'flex-1 min-h-0 gap-4' : 'gap-4'}>
      {headerTitle ? (
        <View className="flex-row items-baseline justify-between gap-1">
          <Text accessibilityRole="header" className="text-lg font-bold">
            {headerTitle}
          </Text>
          <View className="flex-row items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              disabled={month <= '1900-01'}
              onPress={() => swipe.changeMonth(-1)}
              className="h-9 w-8 items-center justify-center"
            >
              <AppIcon name="chevron-left" size={iconSizes.lg} color={colors.accent} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${month}, 이번 달로 이동`}
              onPress={() => onMonthChange(today.slice(0, 7))}
              className="px-1 py-2"
            >
              <Text className="text-sm font-medium text-theme-accent">
                {format(parseISO(`${month}-01`), 'yyyy년 M월')}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              disabled={month >= '2100-12'}
              onPress={() => swipe.changeMonth(1)}
              className="h-9 w-8 items-center justify-center"
            >
              <AppIcon name="chevron-right" size={iconSizes.lg} color={colors.accent} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-row justify-between gap-3">
          <Text
            accessibilityRole="header"
            className={`py-2 text-xl ${headingWeight === 'normal' ? 'font-normal' : 'font-semibold'}`}
          >
            {format(parseISO(`${month}-01`), 'yyyy년 M월')}
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              disabled={month === '1900-01'}
              onPress={() => swipe.changeMonth(-1)}
              className={`w-10 items-center justify-center rounded-xl ${month === '1900-01' ? 'opacity-30' : 'opacity-100'}`}
            >
              <AppIcon name="chevron-left" size={appRem * 1.5} color={colors.tertiary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="오늘로 이동"
              onPress={() => onSelect(today)}
              className="w-10 items-center justify-center rounded-xl"
            >
              <Text
                className={`text-base text-theme-text-tertiary ${headingWeight === 'normal' ? 'font-normal' : 'font-medium'}`}
              >
                오늘
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              disabled={month === '2100-12'}
              onPress={() => swipe.changeMonth(1)}
              className={`w-10 items-center justify-center rounded-xl ${month === '2100-12' ? 'opacity-30' : 'opacity-100'}`}
            >
              <AppIcon name="chevron-right" size={appRem * 1.5} color={colors.tertiary} />
            </Pressable>
          </View>
        </View>
      )}
      {headerContent}
      <View
        {...swipe.panHandlers}
        className={fillHeight ? 'flex-1 min-h-0' : undefined}
        accessibilityLabel={`${month} 월간 달력`}
      >
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
          {Array.from({ length: rows }, (_, row) => (
            <View
              key={row}
              className={fillHeight ? 'flex-1 min-h-0 flex-row gap-1' : 'flex-row gap-1'}
            >
              {days.slice(row * 7, row * 7 + 7).map((date) => {
                const outside = date.slice(0, 7) !== month;
                const props = {
                  date,
                  outside,
                  today: date === today,
                  selected: date === selected,
                  disabled: canSelect ? !canSelect(date) : false,
                  onSelect: () => {
                    if (
                      date >= '1900-01-01' &&
                      date <= '2100-12-31' &&
                      (!canSelect || canSelect(date))
                    )
                      onSelect(date);
                  },
                };
                return (
                  <View
                    key={date}
                    className={fillHeight ? 'flex-1 min-h-0' : 'flex-1 aspect-[1/1.25]'}
                  >
                    {renderDay ? renderDay(props) : <CalendarDay {...props} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
