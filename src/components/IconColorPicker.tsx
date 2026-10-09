import { useState } from 'react';
import { View } from 'react-native';
import { HABIT_ICON_COLORS, type HabitIconColorKey } from '../domain/constants';
import { BottomSheetModal } from './BottomSheetModal';
import { PickerAction } from './PickerAction';
import { PickerOption } from './PickerOption';
import { Text } from './Text';
import { Button } from './Button';

export function IconColorPicker({
  value,
  onApply,
  onClose,
}: {
  value: HabitIconColorKey;
  onApply: (value: HabitIconColorKey) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const keys = Object.keys(HABIT_ICON_COLORS) as (keyof typeof HABIT_ICON_COLORS)[];
  return (
    <BottomSheetModal
      visible
      title="아이콘 색상"
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="선택 완료"
          onPress={() => close(() => onApply(draft))}
        />
      )}
    >
      <View className="gap-5">
        <PickerAction
          icon="palette"
          title="기본 테마색"
          description="앱의 강조 색상을 따라가요."
          selected={draft === 'theme'}
          onPress={() => setDraft('theme')}
        />
        <View className="gap-2 border-t border-theme-border pt-4">
          <Text className="mb-1 text-sm text-theme-text-secondary">직접 선택</Text>
          {[0, 5].map((offset) => (
            <View key={offset} className="flex-row gap-2">
              {keys.slice(offset, offset + 5).map((key) => {
                const { value: backgroundColor, label } = HABIT_ICON_COLORS[key];
                return (
                  <View key={key} className="flex-1 min-w-0">
                    <PickerOption
                      compact
                      selectionOnly
                      selected={draft === key}
                      accessibilityLabel={label}
                      onPress={() => setDraft(key)}
                    >
                      <View className="h-8 w-8 rounded-full" style={{ backgroundColor }} />
                      <Text
                        className={`text-xs text-center ${draft === key ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                      >
                        {label}
                      </Text>
                    </PickerOption>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </BottomSheetModal>
  );
}
