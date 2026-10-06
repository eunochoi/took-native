import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from './BottomSheetModal';
import { PickerOption } from './PickerOption';
import { Text } from './Text';
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
    <BottomSheetModal visible title={title} onClose={onClose}>
      {(close) => (
        <View className="gap-5">
          <View className="gap-2">
            {Array.from({ length: Math.ceil(options.length / 5) }, (_, row) => (
              <View key={row} className="flex-row gap-2">
                {options.slice(row * 5, row * 5 + 5).map(({ key, label }) => (
                  <View key={key} className="flex-1 min-w-0">
                    <PickerOption
                      compact
                      selectionOnly
                      selected={draft === key}
                      accessibilityLabel={label}
                      onPress={() => setDraft(key)}
                    >
                      {renderIcon(key)}
                      <Text
                        className={`text-xs text-center ${draft === key ? 'text-theme-accent' : 'text-theme-text-secondary'}`}
                      >
                        {label}
                      </Text>
                    </PickerOption>
                  </View>
                ))}
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
