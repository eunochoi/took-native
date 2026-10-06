import { AppIcon } from '../../components/AppIcon';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { HabitIcon } from '../../components/HabitIcon';
import { Text } from '../../components/Text';
import type { Completion, Habit } from '../../db/types';
import { resolveIconColor } from '../../domain/constants';
import { canCheckHabit, shiftDate } from '../../domain/date';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HabitMenu } from './HabitMenu';
import { HabitStars } from './HabitStars';

export function HabitBox({
  habit,
  today,
  records,
  disabled,
  onToggle,
}: {
  habit: Habit;
  today: string;
  records: Completion[];
  disabled: boolean;
  onToggle: (id: number, date: string, checked: boolean) => void;
}) {
  const { colors, rem: appRem, iconSizes } = useAppTheme();
  const router = useRouter();
  const habitColor = resolveIconColor(habit.icon_color, colors.accent);
  const checked = (date: string) =>
    records.some((record) => record.habit_id === habit.id && record.date === date);
  const done = checked(today);
  return (
    <View className="flex-1 gap-4 bg-theme-surface px-2 py-4">
      <View>
        <View className="relative mb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} 습관 정보`}
            onPress={() => router.push(`/habit/${habit.id}`)}
            className="items-center gap-2"
          >
            <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 1.875} />
            <Text numberOfLines={1} className="w-full text-base text-center font-semibold">
              {habit.name}
            </Text>
          </Pressable>
          <View className="absolute right-0 top-0">
            <HabitMenu habit={habit} />
          </View>
        </View>
        <View className="flex-row flex-wrap items-center justify-center gap-x-5">
          <Text className="text-sm" style={{ color: habitColor }}>
            우선순위
          </Text>
          <HabitStars priority={habit.priority} color={habitColor} />
        </View>
      </View>
      <View className="flex-row justify-around">
        {Array.from({ length: 4 }, (_, i) => shiftDate(today, -i)).map((date) => {
          const completed = checked(date);
          const locked = disabled || !canCheckHabit(date, habit.created_date, today);
          return (
            <Pressable
              key={date}
              accessibilityRole="checkbox"
              accessibilityLabel={`${habit.name} ${format(parseISO(date), 'M월 d일')} 완료`}
              accessibilityState={{ checked: completed, disabled: locked }}
              disabled={locked}
              onPress={() => onToggle(habit.id, date, !completed)}
              className={`items-center gap-1 ${locked ? 'opacity-40' : 'opacity-100'}`}
            >
              <Text className="text-sm text-theme-text-secondary">
                {format(parseISO(date), 'eee', { locale: ko })}
              </Text>
              <Text className="text-sm text-theme-text-secondary">{Number(date.slice(-2))}</Text>
              <View
                className="mt-1 h-5 w-5 items-center justify-center rounded-md border-[1.5px] bg-theme-surface"
                style={{
                  borderColor: `${habitColor}${completed ? 'BF' : '99'}`,
                  ...(completed && { backgroundColor: `${habitColor}BF` }),
                }}
              >
                {completed && <AppIcon name="check" size={iconSizes.sm} color="white" />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || done || !canCheckHabit(today, habit.created_date, today)}
        onPress={() => onToggle(habit.id, today, true)}
        className={`mt-auto min-h-10 rounded-xl px-3 py-2 flex-row items-center justify-center gap-2 bg-theme-surface-muted border-[1px] border-theme-text-secondary/5`}
      >
        {done && <AppIcon name="check" size={iconSizes.sm} color={colors.textSecondary} />}
        <Text className={`text-sm text-theme-text-secondary`}>
          {done ? '완료' : '오늘 완료하기'}
        </Text>
      </Pressable>
    </View>
  );
}
