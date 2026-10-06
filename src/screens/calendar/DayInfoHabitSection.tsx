import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import type { Habit } from '../../db/types';
import { resolveIconColor } from '../../domain/constants';
import { canCheckHabit, shiftDate } from '../../domain/date';
import { useAppTheme } from '../../theme/AppThemeProvider';

const HABIT_PREVIEW_COUNT = 5;

export function DayInfoHabitSection({
  habits,
  date,
  today,
  pendingId,
  onToggle,
  onNavigate,
}: {
  habits: (Habit & { completed: boolean })[];
  date: string;
  today: string;
  pendingId: number | null;
  onToggle: (id: number, checked: boolean) => void;
  onNavigate?: (action: () => void) => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const future = date > today;
  const editable = date >= shiftDate(today, -3) && !future;
  const done = habits.filter((habit) => habit.completed).length;
  const renderHabit = (habit: Habit & { completed: boolean }) => {
    const habitColor = resolveIconColor(habit.icon_color, colors.accent);
    const disabled = pendingId !== null || !canCheckHabit(date, habit.created_date, today);
    return (
      <View
        key={habit.id}
        className={`flex-row items-center justify-between gap-2 ${pendingId === habit.id ? 'opacity-50' : ''}`}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: habit.completed, disabled }}
          disabled={disabled}
          onPress={() => onToggle(habit.id, !habit.completed)}
          className="min-h-9 flex-1 flex-row items-center gap-2.5 rounded-lg"
        >
          <View
            className="h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] bg-theme-surface"
            style={{
              borderColor: `${habitColor}${habit.completed ? 'BF' : '99'}`,
              ...(habit.completed && { backgroundColor: `${habitColor}BF` }),
            }}
          >
            {habit.completed && (
              <AppIcon name="check" size={iconSizes.sm} color={colors.textOnAccent} />
            )}
          </View>
          <Text numberOfLines={1} className="flex-1 text-sm">
            {habit.name}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${habit.name} 습관 정보 보기`}
          onPress={() => {
            const action = () => router.push(`/habit/${habit.id}`);
            if (onNavigate) onNavigate(action);
            else action();
          }}
          className="h-6 w-6 items-center justify-center"
        >
          <AppIcon name="chevron-right" size={iconSizes.md} color={colors.textDisabled} />
        </Pressable>
      </View>
    );
  };
  return (
    <View className="p-1 shrink-0">
      <View className="flex-row items-center justify-between gap-2 py-2">
        <Text accessibilityRole="header" className="text-base font-semibold">
          습관 목록
        </Text>
        {editable ? (
          <Text className="text-sm text-theme-accent">
            {done}/{habits.length} 완료
          </Text>
        ) : (
          <View className="flex-row items-center gap-1">
            <AppIcon name="lock-outline" size={iconSizes.sm} color={colors.tertiary} />
            <Text className="text-xs text-theme-text-tertiary">
              {future ? '기록 전' : `${done}개 완료`}
            </Text>
          </View>
        )}
      </View>
      <View className="px-2 py-3">
        {future ? (
          <View className="h-56 items-center justify-center">
            <Text className="text-center text-sm leading-relaxed text-theme-text-tertiary">
              미래 날짜에는 습관을 기록할 수 없어요.
            </Text>
          </View>
        ) : habits.length ? (
          <View className="min-h-56 gap-2">
            {(expanded ? habits : habits.slice(0, HABIT_PREVIEW_COUNT)).map(renderHabit)}
          </View>
        ) : (
          <View className="h-56 items-center justify-center">
            <Text className="text-center text-sm leading-relaxed text-theme-text-tertiary">
              이 날짜의 습관 기록이 없어요.
            </Text>
          </View>
        )}
        <View className="h-9 mt-2 items-center justify-center">
          {!future && habits.length > HABIT_PREVIEW_COUNT && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpanded(!expanded)}
              className="h-9 flex-row items-center gap-1 px-4"
            >
              <Text className="text-sm text-theme-accent">
                {expanded ? '접기' : `더보기 (${habits.length - HABIT_PREVIEW_COUNT}개)`}
              </Text>
              <AppIcon
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={iconSizes.md}
                color={colors.accent}
              />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}
