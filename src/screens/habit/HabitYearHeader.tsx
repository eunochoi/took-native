import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function HabitYearHeader({
  year,
  today,
  onYearChange,
}: {
  year: number;
  today: string;
  onYearChange: (year: number) => void;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const minYear = 1900;
  const maxYear = 2100;
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
          size={appRem * 1.5}
          color={colors.tertiary}
        />
      </Pressable>
    );
  });
  return (
    <View className="flex-row items-center justify-between">
      {arrows[0]}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${year}년, 올해로 이동`}
        onPress={() => onYearChange(Number(today.slice(0, 4)))}
        className="flex-1 items-center justify-center"
      >
        <Text accessibilityRole="header" className="text-base">
          {year}년
        </Text>
      </Pressable>
      {arrows[1]}
    </View>
  );
}
