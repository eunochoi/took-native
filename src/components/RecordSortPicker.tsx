import { useState } from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';
import { PickerOption } from './PickerOption';
import { StarIcon } from './StarIcon';
import { Text } from './Text';

export function RecordSortPicker({
  title,
  sort,
  priorityFirst,
  allowCustom = false,
  ascendingLabel = '과거순',
  sortLabel = '생성일 정렬',
  onClose,
  onApply,
}: {
  title: string;
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  allowCustom?: boolean;
  ascendingLabel?: string;
  sortLabel?: string;
  onClose: () => void;
  onApply: (sort: 'ASC' | 'DESC' | 'CUSTOM', priorityFirst: boolean) => void;
}) {
  const { colors, iconSizes } = useAppTheme();
  const [draftSort, setSort] = useState(sort);
  const [draftPriority, setPriority] = useState(
    sort === 'CUSTOM' ? false : (priorityFirst ?? false),
  );
  const options = [
    { value: 'DESC', label: '최신순' },
    { value: 'ASC', label: ascendingLabel },
    ...(allowCustom ? [{ value: 'CUSTOM', label: '커스텀' }] : []),
  ] as { value: 'ASC' | 'DESC' | 'CUSTOM'; label: string }[];
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      footer={(closePicker) => (
        <Button
          label="적용하기"
          onPress={() =>
            closePicker(() => onApply(draftSort, draftSort === 'CUSTOM' ? false : draftPriority))
          }
        />
      )}
    >
      <View className="gap-6">
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
                    className={`text-base ${draftSort === option.value ? 'text-theme-accent' : ''}`}
                  >
                    {option.label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        {priorityFirst !== undefined && (
          <View className="gap-3">
            <Text className="text-base font-semibold">중요도</Text>
            <PickerOption
              selected={draftPriority}
              disabled={draftSort === 'CUSTOM'}
              accessibilityLabel="중요도 우선"
              onPress={() => setPriority(!draftPriority)}
            >
              <View className="flex-row items-center gap-2">
                <StarIcon
                  filled={draftPriority}
                  size={iconSizes.md}
                  color={draftPriority ? colors.accent : colors.textPrimary}
                />
                <Text className={`text-base ${draftPriority ? 'text-theme-accent' : ''}`}>
                  중요한 항목 먼저
                </Text>
              </View>
            </PickerOption>
            <View className="h-10 justify-center">
              <Text numberOfLines={2} className="text-center text-sm leading-5 text-theme-accent">
                {draftSort === 'CUSTOM'
                  ? '직접 정한 순서로 보여드려요.'
                  : '중요한 항목부터, 생성일 순으로 정렬해요.'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
}
