import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { HabitStars } from './HabitStars';

export const HABIT_PRIORITY_LABELS = ['낮음', '보통', '높음'] as const;

export function HabitPriorityPicker({
  value,
  onApply,
  onClose,
}: {
  value: number;
  onApply: (value: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <BottomSheetModal visible title="우선순위" onClose={onClose}>
      {(close) => (
        <View className="gap-5">
          <View className="flex-row gap-2">
            {HABIT_PRIORITY_LABELS.map((label, priority) => (
              <View key={label} className="flex-1">
                <PickerOption
                  selectionOnly
                  selected={draft === priority}
                  accessibilityLabel={label}
                  onPress={() => setDraft(priority)}
                >
                  <HabitStars priority={priority} />
                  <Text
                    className={`text-sm font-normal ${draft === priority ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
          <Button
            labelWeight="normal"
            label="선택 완료"
            onPress={() => close(() => onApply(draft))}
          />
        </View>
      )}
    </BottomSheetModal>
  );
}
