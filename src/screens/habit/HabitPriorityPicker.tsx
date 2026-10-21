import { InfoNotice } from '../../components/InfoNotice';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '../../components/Button';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { HabitStars } from './HabitStars';

export const HABIT_PRIORITY_LABELS = ['자유 기록', '낮음', '보통', '높음'] as const;

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
    <BottomSheetModal
      visible
      title="우선순위"
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="선택 완료"
          onPress={() => close(() => onApply(draft))}
        />
      )}
    >
      <View className="gap-3">
        {[
          [0, 1],
          [2, 3],
        ].map((row) => (
          <View key={row[0]} className="flex-row gap-3">
            {row.map((priority) => {
              const label =
                priority === 0
                  ? '없음 · 자유 기록'
                  : `${HABIT_PRIORITY_LABELS[priority]} · 매일 기록`;
              return (
                <View key={priority} className="flex-1">
                  <PickerOption
                    selected={draft === priority}
                    accessibilityLabel={label}
                    onPress={() => setDraft(priority)}
                  >
                    <HabitStars priority={priority} />
                    <Text
                      className={`text-sm font-normal ${draft === priority ? 'text-theme-accent-deep' : 'text-theme-text-secondary'}`}
                    >
                      {label}
                    </Text>
                  </PickerOption>
                </View>
              );
            })}
          </View>
        ))}
        <InfoNotice>자유 기록 항목은 완료율과 달성 개수 계산에 포함되지 않아요.</InfoNotice>
      </View>
    </BottomSheetModal>
  );
}
