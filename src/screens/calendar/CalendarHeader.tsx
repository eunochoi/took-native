import { format, parseISO } from 'date-fns';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function CalendarHeader({
  month,
  today,
  navigation,
  titleAlign = 'center',
}: {
  month: string;
  today: string;
  navigation: ReturnType<typeof useCalendarNavigation>;
  titleAlign?: 'left' | 'center' | 'right';
}) {
  const { colors, rem: appRem } = useAppTheme();
  const title = (
    <Pressable
      key="month"
      accessibilityRole="button"
      accessibilityLabel={`${month}, 이번 달로 이동`}
      disabled={!navigation.isDateAvailable(today)}
      onPress={() => navigation.changeToMonth(today.slice(0, 7))}
      className={`justify-center ${titleAlign === 'center' ? 'flex-1 items-center' : ''}`}
    >
      <Text accessibilityRole="header" className="text-base">
        {format(parseISO(`${month}-01`), 'yyyy년 M월')}
      </Text>
    </Pressable>
  );
  const arrows = ([-1, 1] as const).map((amount) => {
    const enabled = amount === -1 ? navigation.canGoPrevious : navigation.canGoNext;
    return (
      <Pressable
        key={amount}
        accessibilityRole="button"
        accessibilityLabel={amount === -1 ? '이전 달' : '다음 달'}
        disabled={!enabled}
        onPress={() => navigation.changeMonth(amount)}
        className={`h-10 w-10 items-center justify-center rounded-xl ${enabled ? 'opacity-100' : 'opacity-30'}`}
      >
        <AppIcon
          name={amount === -1 ? 'chevron-left' : 'chevron-right'}
          size={appRem * 1.5}
          color={colors.tertiary}
        />
      </Pressable>
    );
  });
  const arrowGroup = (
    <View key="arrows" className="flex-row items-center">
      {arrows}
    </View>
  );
  return (
    <View className="flex-row items-center justify-between">
      {titleAlign === 'center'
        ? [arrows[0], title, arrows[1]]
        : titleAlign === 'left'
          ? [title, arrowGroup]
          : [arrowGroup, title]}
    </View>
  );
}
