import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { HabitIcon } from '../../components/HabitIcon';
import { Text } from '../../components/Text';
import type { Completion, Habit } from '../../db/types';
import { resolveIconColor } from '../../domain/constants';
import { canCheckHabit, localDate, shiftDate } from '../../domain/date';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
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
  const { openModal } = useModalNavigation();
  const habitColor = resolveIconColor(habit.icon_color, colors.accent);
  const checked = (date: string) =>
    records.some((record) => record.habit_id === habit.id && record.date === date);
  const startedDate = localDate(habit.initial_started_at);
  const done = checked(today);
  return (
    <View className="flex-1 gap-4 bg-theme-surface px-2 py-4">
      <View>
        <View className="relative mb-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${habit.name} 습관 정보`}
            onPress={() => openModal(`/habit/${habit.id}`)}
            className="items-center gap-2"
          >
            <View
              className="items-center justify-center"
              style={{ width: appRem * 1.875, height: appRem * 1.875 }}
            >
              <HabitIcon name={habit.icon_key} colorKey={habit.icon_color} size={appRem * 1.875} />
            </View>
            <Text numberOfLines={1} className="w-full text-base text-center font-semibold">
              {habit.name}
            </Text>
          </Pressable>
          <View className="absolute right-0 top-0">
            <HabitMenu habit={habit} />
          </View>
        </View>
        <View className="h-5 items-center justify-center">
          <HabitStars priority={habit.priority} color={habitColor} size={appRem} />
        </View>
      </View>
      <View className="flex-row justify-around">
        {Array.from({ length: 4 }, (_, i) => shiftDate(today, -i)).map((date) => {
          const completed = checked(date);
          const locked = disabled || !canCheckHabit(date, startedDate, today);
          return (
            <Pressable
              key={date}
              accessibilityRole="checkbox"
              accessibilityLabel={`${habit.name} ${format(parseISO(date), 'M월 d일')} 완료`}
              accessibilityState={{ checked: completed, disabled: locked }}
              disabled={locked}
              onPress={() => onToggle(habit.id, date, !completed)}
              className={`flex-1 min-w-0 items-center gap-1 ${locked ? 'opacity-40' : 'opacity-100'}`}
            >
              <Text
                className="h-5 text-sm leading-5 text-theme-text-secondary"
                style={date === today ? { color: habitColor } : undefined}
              >
                {date === today ? '오늘' : format(parseISO(date), 'eee', { locale: ko })}
              </Text>
              <Text className="h-5 text-sm leading-5 text-theme-text-secondary">
                {Number(date.slice(-2))}
              </Text>
              <View
                className="mt-1 h-5 w-5 items-center justify-center ios:curve-continuous rounded-md border-[1px] bg-theme-surface"
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
        disabled={disabled || done || !canCheckHabit(today, startedDate, today)}
        onPress={() => onToggle(habit.id, today, true)}
        className={`mt-auto min-h-9 ios:curve-continuous rounded-xl px-3 py-1.5 flex-row items-center justify-center gap-2 bg-theme-surface-muted border-[1px] border-theme-text-secondary/5`}
      >
        {done && <AppIcon name="check" size={iconSizes.sm} color={colors.textSecondary} />}
        <Text className={`text-sm text-theme-text-secondary`}>
          {done ? '완료' : '오늘 완료하기'}
        </Text>
      </Pressable>
    </View>
  );
}
