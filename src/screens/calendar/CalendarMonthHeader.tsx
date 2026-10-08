import { Pressable, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { useCalendarNavigation } from '../../hooks/useCalendarNavigation';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function CalendarMonthHeader({
  month,
  today,
  navigation,
  onToday,
  headingWeight = 'semibold',
  title: headerTitle,
}: {
  month: string;
  today: string;
  navigation: ReturnType<typeof useCalendarNavigation>;
  onToday?: () => void;
  headingWeight?: 'normal' | 'semibold';
  title?: string;
}) {
  const { colors, iconSizes, rem: appRem } = useAppTheme();
  return headerTitle ? (
    <View className="flex-row items-baseline justify-between gap-1">
      <Text accessibilityRole="header" className="text-lg font-bold">
        {headerTitle}
      </Text>
      <View className="flex-row items-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          disabled={!navigation.canGoPrevious}
          onPress={() => navigation.changeMonth(-1)}
          className="h-9 w-8 items-center justify-center"
        >
          <AppIcon name="chevron-left" size={iconSizes.lg} color={colors.accent} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${month}, 이번 달로 이동`}
          onPress={onToday ?? (() => navigation.changeToMonth(today.slice(0, 7)))}
          className="px-1 py-2"
        >
          <Text className="text-sm font-medium text-theme-accent">
            {format(parseISO(`${month}-01`), 'yyyy년 M월')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          disabled={!navigation.canGoNext}
          onPress={() => navigation.changeMonth(1)}
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
          disabled={!navigation.canGoPrevious}
          onPress={() => navigation.changeMonth(-1)}
          className={`w-10 items-center justify-center rounded-xl ${!navigation.canGoPrevious ? 'opacity-30' : 'opacity-100'}`}
        >
          <AppIcon name="chevron-left" size={appRem * 1.5} color={colors.tertiary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="오늘로 이동"
          onPress={onToday ?? (() => navigation.changeToMonth(today.slice(0, 7)))}
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
          disabled={!navigation.canGoNext}
          onPress={() => navigation.changeMonth(1)}
          className={`w-10 items-center justify-center rounded-xl ${!navigation.canGoNext ? 'opacity-30' : 'opacity-100'}`}
        >
          <AppIcon name="chevron-right" size={appRem * 1.5} color={colors.tertiary} />
        </Pressable>
      </View>
    </View>
  );
}
