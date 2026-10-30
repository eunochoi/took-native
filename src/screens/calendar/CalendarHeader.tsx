import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
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
  detail = false,
}: {
  month: string;
  today: string;
  navigation: ReturnType<typeof useCalendarNavigation>;
  centerTitle?: boolean;
  detail?: boolean;
}) {
  const { t, formatLocale } = useI18n();

  const { colors, rem: appRem } = useAppTheme();
  const todayAvailable = navigation.isDateAvailable(today);
  const arrows = ([-1, 1] as const).map((amount) => {
    const enabled = amount === -1 ? navigation.canGoPrevious : navigation.canGoNext;
    return (
      <Pressable
        key={amount}
        accessibilityRole="button"
        accessibilityLabel={amount === -1 ? t('calendar.previousMonth') : t('calendar.nextMonth')}
        disabled={!enabled}
        onPress={() => navigation.changeMonth(amount)}
        className={`h-10 w-10 items-center justify-center ios:curve-continuous rounded-xl ${enabled ? 'opacity-100' : 'opacity-30'}`}
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
    <View className="h-10 flex-row items-center justify-between">
      {centerTitle && arrows[0]}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('calendar.monthToday', { value: month })}
        disabled={!todayAvailable}
        onPress={() => navigation.changeToMonth(today.slice(0, 7))}
        className={`flex-1 justify-center ${centerTitle ? 'items-center' : 'items-start'}`}
      >
        <Text
          accessibilityRole="header"
          className={detail ? 'text-base font-medium' : 'text-lg font-semibold'}
        >
          {formatDisplayDate(`${month}-01`, formatLocale, 'month')}
        </Text>
      </Pressable>
      {centerTitle ? (
        arrows[1]
      ) : (
        <View className="flex-row items-center -mr-2">
          {arrows[0]}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('calendar.goToday')}
            accessibilityHint={t('calendar.goTodayHint')}
            accessibilityState={{ disabled: !todayAvailable }}
            disabled={!todayAvailable}
            onPress={() => {
              if (!todayAvailable) return;
              navigation.changeToMonth(today.slice(0, 7));
            }}
            className={`h-10 w-10 items-center justify-center ios:curve-continuous rounded-xl ${todayAvailable ? 'opacity-100' : 'opacity-30'}`}
          >
            <AppIcon name="today" size={appRem * 1.1} color={colors.tertiary} />
          </Pressable>
          {arrows[1]}
        </View>
      )}
    </View>
  );
}
