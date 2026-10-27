import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { Text } from '../../components/Text';
import type { Habit } from '../../db/types';
import { resolveIconColor } from '../../domain/constants';
import { canCheckHabit, localDate, shiftDate } from '../../domain/date';
import { useModalNavigation } from '../../navigation/ModalNavigationProvider';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HabitStars } from '../habit/HabitStars';

export function DayInfoHabitSection({
  habits,
  date,
  today,
  pendingId,
  onToggle,
}: {
  habits: (Habit & { completed: boolean })[];
  date: string;
  today: string;
  pendingId: number | null;
  onToggle: (id: number, checked: boolean) => void;
}) {
  const { t } = useI18n();

  const { colors, iconSizes } = useAppTheme();
  const { openModal } = useModalNavigation();
  const editable = date >= shiftDate(today, -3) && date <= today;
  const counted = habits.filter((habit) => habit.priority > 0);
  const done = counted.filter((habit) => habit.completed).length;
  const excluded = habits.filter((habit) => habit.priority === 0);
  const excludedDone = excluded.filter((habit) => habit.completed).length;
  const renderHabit = (habit: Habit & { completed: boolean }) => {
    const habitColor = resolveIconColor(habit.icon_color, colors.accent);
    const disabled =
      pendingId !== null || !canCheckHabit(date, localDate(habit.initial_started_at), today);
    return (
      <View
        key={habit.id}
        className={`flex-row items-center justify-between gap-2 ${pendingId === habit.id ? 'opacity-50' : ''}`}
      >
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${habit.name}${habit.priority === 0 ? `, ${t('calendar.free')}` : ''}`}
          accessibilityState={{ checked: habit.completed, disabled }}
          disabled={disabled}
          onPress={() => onToggle(habit.id, !habit.completed)}
          className={`min-h-9 flex-1 flex-row items-center gap-2.5 ios:curve-continuous rounded-lg ${!editable ? 'opacity-60' : 'opacity-100'}`}
        >
          <View
            className="h-5 w-5 shrink-0 items-center justify-center ios:curve-continuous rounded-md border bg-theme-surface"
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
          {habit.priority === 0 ? (
            <Text className="text-xs text-theme-text-secondary">{t('calendar.free')}</Text>
          ) : (
            <HabitStars priority={habit.priority} color={habitColor} className="shrink-0" />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('calendar.habitLink', { value: habit.name })}
          onPress={() => {
            openModal(`/habit/${habit.id}`);
          }}
          className="h-6 w-6 items-center justify-center"
        >
          <AppIcon name="chevron-right" size={iconSizes.md} color={colors.textDisabled} />
        </Pressable>
      </View>
    );
  };
  return (
    <View className="px-1 pt-1 shrink-0">
      <View className="flex-row items-center justify-between gap-2 py-2">
        <Text accessibilityRole="header" className="text-base font-semibold">
          {t('calendar.habitsTitle')}
        </Text>
        {habits.length > 0 && (
          <View className="flex-row justify-center items-center gap-2">
            {!editable && (
              <AppIcon name="lock-outline" size={iconSizes.sm} color={colors.tertiary} />
            )}
            {counted.length > 0 && (
              <Text className="tracking-tighter text-sm text-theme-accent">
                {t('calendar.dailyCompleted', { value: `${done}/${counted.length}` })}
              </Text>
            )}
            {excludedDone > 0 && (
              <>
                <Text className="tracking-tighter text-sm text-theme-text-secondary">·</Text>
                <Text className="tracking-tighter text-sm text-theme-text-secondary">
                  {t('calendar.freeCompleted', { count: excludedDone })}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
      <View className="px-1 pt-3">
        {habits.length ? (
          <View className="min-h-56 gap-2">
            {!editable && <InfoNotice>{t('calendar.checkNotice')}</InfoNotice>}
            {habits.map(renderHabit)}
          </View>
        ) : (
          <View className="h-56 items-center justify-center">
            <Text className="text-center text-sm leading-relaxed text-theme-text-tertiary">
              {t('calendar.habitsEmpty')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
