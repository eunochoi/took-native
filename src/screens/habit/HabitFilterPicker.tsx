import { InfoNotice } from '../../components/InfoNotice';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { FilterSheet } from '../../components/FilterSheet';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { selectionSummary } from '../../domain/selection';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { HABIT_PRIORITY_LABELS } from './HabitPriorityPicker';
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
  const { colors, rem } = useAppTheme();
  const [draft, setDraft] = useState(filter);
  return (
    <FilterSheet
      title="습관 필터"
      resetInHeader
      contentBottomPadding={rem * 1.5}
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_HABIT_FILTER)}
      onApply={() => onApply(draft)}
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-base font-semibold">완료한 항목만 보기</Text>
        <Switch
          accessibilityLabel="완료한 항목만 보기"
          value={draft.completedOnly}
          onValueChange={(completedOnly) => setDraft({ ...draft, completedOnly })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      </View>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">중요도</Text>
          <Text className="shrink text-sm text-theme-text-secondary">
            {selectionSummary(
              draft.priorities.map((priority) =>
                priority === 0 ? '자유 기록' : '★'.repeat(priority),
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
                      compact
                      checkbox
                      selected={selected}
                      accessibilityLabel={priority === 0 ? '자유 기록' : `별표 ${priority}개`}
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
                        {HABIT_PRIORITY_LABELS[priority]}
                      </Text>
                    </PickerOption>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <InfoNotice>중요도는 여러 개 선택할 수 있어요.</InfoNotice>
    </FilterSheet>
  );
}
