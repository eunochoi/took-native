import { useState } from 'react';
import { Switch, View } from 'react-native';
import { FilterSheet } from '../../components/FilterSheet';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export interface SoberFilter {
  priorityOnly: boolean;
  minimumDays: number;
}
export const DEFAULT_SOBER_FILTER: SoberFilter = { priorityOnly: false, minimumDays: 0 };
export const SOBER_RECORD_FILTERS = [
  { days: 0, label: '전체', shortLabel: '' },
  { days: 3, label: '3일 이상', shortLabel: '3일+' },
  { days: 7, label: '1주 이상', shortLabel: '1주+' },
  { days: 14, label: '2주 이상', shortLabel: '2주+' },
  { days: 30, label: '1개월 이상', shortLabel: '1개월+' },
  { days: 90, label: '3개월 이상', shortLabel: '3개월+' },
] as const;

export function SoberFilterPicker({
  filter,
  onClose,
  onApply,
}: {
  filter: SoberFilter;
  onClose: () => void;
  onApply: (filter: SoberFilter) => void;
}) {
  const { colors } = useAppTheme();
  const [draft, setDraft] = useState(filter);
  return (
    <FilterSheet
      title="거리두기 필터"
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_SOBER_FILTER)}
      onApply={() => onApply(draft)}
    >
      <>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-base font-semibold">중요한 항목만 보기</Text>
          <Switch
            accessibilityLabel="중요한 항목만 보기"
            value={draft.priorityOnly}
            onValueChange={(priorityOnly) => setDraft({ ...draft, priorityOnly })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
        <View className="gap-3">
          <Text className="text-base font-semibold">현재 기록</Text>
          <View className="gap-3">
            {[0, 2, 4].map((offset) => (
              <View key={offset} className="flex-row gap-3">
                {SOBER_RECORD_FILTERS.slice(offset, offset + 2).map((option) => (
                  <View key={option.days} className="flex-1">
                    <PickerOption
                      compact
                      selected={draft.minimumDays === option.days}
                      accessibilityLabel={`현재 기록 ${option.label}`}
                      onPress={() => setDraft({ ...draft, minimumDays: option.days })}
                    >
                      <Text
                        className={`text-base ${draft.minimumDays === option.days ? 'text-theme-accent' : ''}`}
                      >
                        {option.label}
                      </Text>
                    </PickerOption>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </>
    </FilterSheet>
  );
}
