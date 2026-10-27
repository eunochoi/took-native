import { useI18n } from '../../i18n/react';
import { AppIcon } from '../../components/AppIcon';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { View } from 'react-native';
import Sortable from 'react-native-sortables';
import { Text } from '../../components/Text';
import type { Habit } from '../../db/types';
import { HabitStars } from './HabitStars';

export function HabitOrderItem({
  habit,
  index,
  count,
  disabled,
  onMove,
}: {
  habit: Habit;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { t } = useI18n();

  const { colors, rem: appRem } = useAppTheme();
  return (
    <View className="h-16 flex-row items-center gap-3 px-2 py-3 ios:curve-continuous rounded-lg overflow-hidden">
      <View className="w-20">
        <HabitStars priority={habit.priority} size={appRem} />
      </View>
      <Text numberOfLines={1} className="flex-1 min-w-0 text-sm font-medium">
        {habit.name}
      </Text>
      <Sortable.Handle>
        <View
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('habit.orderAction', { value: habit.name })}
          accessibilityHint={t('habit.orderHint')}
          accessibilityState={{ disabled }}
          accessibilityActions={[
            { name: 'decrement', label: t('habit.moveUp') },
            { name: 'increment', label: t('habit.moveDown') },
          ]}
          onAccessibilityAction={(event) => {
            if (disabled) return;
            const target = index + (event.nativeEvent.actionName === 'decrement' ? -1 : 1);
            if (target >= 0 && target < count) onMove(index, target);
          }}
          className="h-10 w-10 items-center justify-center"
        >
          <AppIcon name="drag-indicator" size={appRem} color={colors.textTertiary} />
        </View>
      </Sortable.Handle>
    </View>
  );
}
