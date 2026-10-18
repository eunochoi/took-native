import { useState } from 'react';
import { View } from 'react-native';
import { FilterSheet } from '../../components/FilterSheet';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { HabitStars } from './HabitStars';

export interface HabitFilter {
  completion: 'ALL' | 'DONE' | 'UNDONE';
  priority: number | null;
}
export const DEFAULT_HABIT_FILTER: HabitFilter = { completion: 'ALL', priority: null };
export const HABIT_COMPLETION_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'DONE', label: '완료' },
  { value: 'UNDONE', label: '미완료' },
] as const;

export function HabitFilterPicker({
  filter,
  onClose,
  onApply,
}: {
  filter: HabitFilter;
  onClose: () => void;
  onApply: (filter: HabitFilter) => void;
}) {
  const [draft, setDraft] = useState(filter);
  return (
    <FilterSheet
      title="습관 필터"
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_HABIT_FILTER)}
      onApply={() => onApply(draft)}
    >
      <>
        <View className="gap-3">
          <Text className="text-base font-semibold">오늘 완료 상태</Text>
          <View className="flex-row gap-3">
            {HABIT_COMPLETION_FILTERS.map((option) => (
              <View key={option.value} className="flex-1">
                <PickerOption
                  compact
                  selected={draft.completion === option.value}
                  accessibilityLabel={`오늘 ${option.label}`}
                  onPress={() => setDraft({ ...draft, completion: option.value })}
                >
                  <Text
                    className={`text-base ${draft.completion === option.value ? 'text-theme-accent' : ''}`}
                  >
                    {option.label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-3">
          <Text className="text-base font-semibold">별표 개수</Text>
          <View className="flex-row gap-3">
            {[null, 0, 1, 2].map((priority) => (
              <View key={priority ?? 'all'} className="flex-1">
                <PickerOption
                  compact
                  selected={draft.priority === priority}
                  accessibilityLabel={priority === null ? '별표 전체' : `별표 ${priority + 1}개`}
                  onPress={() => setDraft({ ...draft, priority })}
                >
                  {priority === null ? (
                    <Text
                      className={`text-base ${draft.priority === null ? 'text-theme-accent' : ''}`}
                    >
                      전체
                    </Text>
                  ) : (
                    <HabitStars priority={priority} />
                  )}
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
      </>
    </FilterSheet>
  );
}
