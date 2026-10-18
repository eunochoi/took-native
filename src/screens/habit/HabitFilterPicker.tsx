import { PICKER_DESCRIPTION_CLASS_NAME } from '../../theme/classes';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { FilterSheet } from '../../components/FilterSheet';
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
              draft.priorities.map((priority) => '★'.repeat(priority + 1)),
              3,
            )}
          </Text>
        </View>
        <View className="flex-row gap-3">
          {[2, 1, 0].map((priority) => {
            const selected = draft.priorities.includes(priority);
            return (
              <View key={priority} className="flex-1 min-w-0">
                <PickerOption
                  compact
                  checkbox
                  selected={selected}
                  accessibilityLabel={`별표 ${priority + 1}개`}
                  onPress={() =>
                    setDraft({
                      ...draft,
                      priorities: [2, 1, 0].filter((value) =>
                        value === priority ? !selected : draft.priorities.includes(value),
                      ),
                    })
                  }
                >
                  <HabitStars priority={priority} size={rem * 1.125} />
                </PickerOption>
              </View>
            );
          })}
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        className={PICKER_DESCRIPTION_CLASS_NAME}
      >
        중요도는 여러 개 선택할 수 있어요.
      </Text>
    </FilterSheet>
  );
}
