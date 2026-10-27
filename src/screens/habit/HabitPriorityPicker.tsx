import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { InfoNotice } from '../../components/InfoNotice';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { HabitStars } from './HabitStars';

export function HabitPriorityPicker({
  value,
  onApply,
  onClose,
}: {
  value: number;
  onApply: (value: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const priorityLabels = [t('habit.free'), t('habit.low'), t('habit.normal'), t('habit.high')];

  const [draft, setDraft] = useState(value);
  return (
    <BottomSheetModal
      visible
      title={t('habit.priority')}
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label={t('habit.selectionDone')}
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
                  ? t('habit.freeLabel')
                  : t('habit.priorityDaily', { value: priorityLabels[priority] });
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
        <InfoNotice>{t('habit.freeItemsNotice')}</InfoNotice>
      </View>
    </BottomSheetModal>
  );
}
