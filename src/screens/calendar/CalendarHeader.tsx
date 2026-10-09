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
  centerTitle = false,
}: {
  month: string;
  today: string;
  navigation: ReturnType<typeof useCalendarNavigation>;
  centerTitle?: boolean;
}) {
  const { colors, rem: appRem } = useAppTheme();
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
          size={appRem * 1.1}
          color={colors.tertiary}
        />
      </Pressable>
    );
  });
  return (
    <View className="flex-row items-center justify-between">
      {centerTitle && arrows[0]}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${month}, 이번 달로 이동`}
        disabled={!navigation.isDateAvailable(today)}
        onPress={() => navigation.changeToMonth(today.slice(0, 7))}
        className={`flex-1 justify-center ${centerTitle ? 'items-center' : 'items-start'}`}
      >
        <Text accessibilityRole="header" className="text-lg font-semibold">
          {format(parseISO(`${month}-01`), 'yyyy년 M월')}
        </Text>
      </Pressable>
      {centerTitle ? arrows[1] : <View className="flex-row items-center -mr-2">{arrows}</View>}
    </View>
  );
}
