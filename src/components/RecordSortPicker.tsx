import { InfoNotice } from './InfoNotice';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { PickerOption } from './PickerOption';
import { Text } from './Text';

export function RecordSortPicker({
  title,
  sort,
  priorityFirst,
  recordSort,
  allowCustom = false,
  ascendingLabel = '과거순',
  sortLabel = '생성일 정렬',
  onClose,
  onApply,
}: {
  title: string;
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  recordSort?: 'ASC' | 'DESC';
  allowCustom?: boolean;
  ascendingLabel?: string;
  sortLabel?: string;
  onClose: () => void;
  onApply: (
    sort: 'ASC' | 'DESC' | 'CUSTOM',
    priorityFirst: boolean,
    recordSort?: 'ASC' | 'DESC',
  ) => void;
}) {
  const { colors } = useAppTheme();
  const [draftSort, setSort] = useState(sort);
  const [draftRecordSort, setRecordSort] = useState(recordSort);
  const [draftPriority, setPriority] = useState(
    sort === 'CUSTOM' ? false : (priorityFirst ?? false),
  );
  const options = [
    { value: 'DESC', label: '최신순' },
    { value: 'ASC', label: ascendingLabel },
    ...(allowCustom ? [{ value: 'CUSTOM', label: '커스텀' }] : []),
  ] as { value: 'ASC' | 'DESC' | 'CUSTOM'; label: string }[];
  const prioritySection = priorityFirst !== undefined && (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-base font-semibold">중요한 항목 먼저</Text>
      <Switch
        accessibilityLabel="중요도 우선"
        disabled={draftSort === 'CUSTOM'}
        value={draftPriority}
        onValueChange={setPriority}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.surface}
      />
    </View>
  );
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      footer={(closePicker) => (
        <Button
          label="적용하기"
          onPress={() =>
            closePicker(() => {
              const priority = draftSort === 'CUSTOM' ? false : draftPriority;
              if (recordSort) onApply(draftSort, priority, draftRecordSort);
              else onApply(draftSort, priority);
            })
          }
        />
      )}
    >
      <View className="gap-6">
        {prioritySection}
        {recordSort && (
          <View className="gap-3">
            <Text className="text-base font-semibold">기록</Text>
            <View className="flex-row gap-3">
              {(['DESC', 'ASC'] as const).map((value) => (
                <View key={value} className="flex-1">
                  <PickerOption
                    compact
                    selected={draftRecordSort === value}
                    accessibilityLabel={`현재 기록 ${value === 'DESC' ? '내림차순' : '오름차순'}`}
                    onPress={() => setRecordSort(value)}
                  >
                    <Text
                      className={`text-base ${draftRecordSort === value ? 'text-theme-accent-deep' : ''}`}
                    >
                      {value === 'DESC' ? '내림차순' : '오름차순'}
                    </Text>
                  </PickerOption>
                </View>
              ))}
            </View>
          </View>
        )}
        <View className="gap-3">
          <Text className="text-base font-semibold">{sortLabel}</Text>
          <View className="flex-row gap-3">
            {options.map((option) => (
              <View key={option.value} className="flex-1">
                <PickerOption
                  compact
                  selected={draftSort === option.value}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    setSort(option.value);
                    if (option.value === 'CUSTOM') setPriority(false);
                  }}
                >
                  <Text
                    className={`text-base ${draftSort === option.value ? 'text-theme-accent-deep' : ''}`}
                  >
                    {option.label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="h-10 justify-center">
          <InfoNotice>
            {draftSort === 'CUSTOM'
              ? '직접 정한 순서로 보여드려요.'
              : recordSort
                ? '중요도, 현재 기록, 생성일 순으로 정렬해요.'
                : '중요한 항목부터, 생성일 순으로 정렬해요.'}
          </InfoNotice>
        </View>
      </View>
    </BottomSheetModal>
  );
}
