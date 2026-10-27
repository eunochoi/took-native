import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { FilterSheet } from '../../components/FilterSheet';
import { InfoNotice } from '../../components/InfoNotice';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { selectionSummary } from '../../domain/selection';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HabitStars } from './HabitStars';

export interface HabitFilter {
  completedOnly: boolean;
  priorities: number[];
}
export const DEFAULT_HABIT_FILTER: HabitFilter = { completedOnly: false, priorities: [] };

export function HabitFilterPicker({
  filter,
  onClose,
  onApply,
}: {
  filter: HabitFilter;
  onClose: () => void;
  onApply: (filter: HabitFilter) => void;
}) {
  const { t } = useI18n();
  const priorityLabels = [t('habit.free'), t('habit.low'), t('habit.normal'), t('habit.high')];

  const { colors, rem } = useAppTheme();
  const [draft, setDraft] = useState(filter);
  return (
    <FilterSheet
      title={t('habit.filterTitle')}
      resetInHeader
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_HABIT_FILTER)}
      onApply={() => onApply(draft)}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold">{t('habit.completedOnly')}</Text>
        <Switch
          accessibilityLabel={t('habit.completedOnly')}
          value={draft.completedOnly}
          onValueChange={(completedOnly) => setDraft({ ...draft, completedOnly })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      </View>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">{t('habit.importance')}</Text>
          <Text className="shrink text-sm text-theme-text-secondary">
            {selectionSummary(
              draft.priorities.map((priority) =>
                priority === 0 ? t('habit.free') : '★'.repeat(priority),
              ),
              4,
            )}
          </Text>
        </View>
        <View className="gap-3">
          {[
            [0, 1],
            [2, 3],
          ].map((row) => (
            <View key={row[0]} className="flex-row gap-3">
              {row.map((priority) => {
                const selected = draft.priorities.includes(priority);
                return (
                  <View key={priority} className="flex-1 min-w-0">
                    <PickerOption
                      keepUncheckedBorder
                      compact
                      checkbox
                      selected={selected}
                      accessibilityLabel={
                        priority === 0 ? t('habit.free') : t('habit.starCount', { count: priority })
                      }
                      onPress={() =>
                        setDraft({
                          ...draft,
                          priorities: [0, 1, 2, 3].filter((value) =>
                            value === priority ? !selected : draft.priorities.includes(value),
                          ),
                        })
                      }
                    >
                      <HabitStars priority={priority} size={rem * 1.125} />
                      <Text
                        className={`text-sm ${selected ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                      >
                        {priorityLabels[priority]}
                      </Text>
                    </PickerOption>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <InfoNotice>{t('habit.priorityHint')}</InfoNotice>
    </FilterSheet>
  );
}
