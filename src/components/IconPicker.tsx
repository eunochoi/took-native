import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { PickerOption } from './PickerOption';
import { Button } from './Button';

export function IconPicker<Key extends string>({
  title,
  value,
  options,
  renderIcon,
  onApply,
  onClose,
}: {
  title: string;
  value: Key;
  options: readonly { key: Key; label: string }[];
  renderIcon: (key: Key) => ReactNode;
  onApply: (value: Key) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <BottomSheetModal
      visible
      scrollFade
      title={title}
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label="선택 완료"
          onPress={() => close(() => onApply(draft))}
        />
      )}
    >
      <View className="gap-2">
        {Array.from({ length: Math.ceil(options.length / 5) }, (_, row) => (
          <View key={row} className="flex-row gap-2">
            {options.slice(row * 5, row * 5 + 5).map(({ key, label }) => (
              <View key={key} className="flex-1 min-w-0">
                <PickerOption
                  compact
                  className="aspect-square min-h-0 p-0"
                  selected={draft === key}
                  accessibilityLabel={label}
                  onPress={() => setDraft(key)}
                >
                  {renderIcon(key)}
                </PickerOption>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 5 - (options.length - row * 5)) }, (_, index) => (
              <View key={`empty-${index}`} className="flex-1 min-w-0" />
            ))}
          </View>
        ))}
      </View>
    </BottomSheetModal>
  );
}
