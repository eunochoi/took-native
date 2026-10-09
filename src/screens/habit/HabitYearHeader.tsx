import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function HabitYearHeader({
  year,
  startedDate,
  today,
  onYearChange,
}: {
  year: number;
  startedDate: string;
  today: string;
  onYearChange: (year: number) => void;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const minYear = Number(startedDate.slice(0, 4));
  const maxYear = Number(today.slice(0, 4));
  const arrows = ([-1, 1] as const).map((amount) => {
    const nextYear = year + amount;
    const enabled = nextYear >= minYear && nextYear <= maxYear;
    return (
      <Pressable
        key={amount}
        accessibilityRole="button"
        accessibilityLabel={amount === -1 ? '이전 연도' : '다음 연도'}
        disabled={!enabled}
        onPress={() => {
          if (enabled) onYearChange(nextYear);
        }}
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${year}년, 올해로 이동`}
        onPress={() => onYearChange(maxYear)}
        className="flex-1 items-start justify-center"
      >
        <Text accessibilityRole="header" className="text-lg font-semibold">
          {year}년
        </Text>
      </Pressable>
      <View className="flex-row items-center -mr-2">{arrows}</View>
    </View>
  );
}
