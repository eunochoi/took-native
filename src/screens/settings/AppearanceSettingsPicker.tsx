import { useRef, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';

export function AppearanceSettingsPicker<T extends string>({
  title,
  value,
  values,
  labels,
  onClose,
  onApply,
}: {
  title: string;
  value: T;
  values: readonly T[];
  labels: Record<T, string>;
  onClose: () => void;
  onApply: (value: T) => Promise<void>;
}) {
  const [selected, setSelected] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      onBeforeClose={() => !saving.current}
      footer={(close) => (
        <Button
          label={busy ? '저장 중…' : '저장'}
          disabled={busy}
          onPress={async () => {
            if (saving.current) return;
            saving.current = true;
            setBusy(true);
            setError('');
            try {
              await onApply(selected);
              saving.current = false;
              close();
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : '다시 시도해주세요.');
            } finally {
              saving.current = false;
              setBusy(false);
            }
          }}
        />
      )}
    >
      <View className="gap-3">
        {values.map((option) => (
          <PickerOption
            key={option}
            selected={selected === option}
            disabled={busy}
            accessibilityLabel={labels[option]}
            onPress={() => {
              setSelected(option);
              setError('');
            }}
          >
            <Text
              className={`text-base ${selected === option ? 'text-theme-accent' : 'text-theme-text-primary'}`}
            >
              {labels[option]}
            </Text>
          </PickerOption>
        ))}
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {error}
          </Text>
        )}
      </View>
    </BottomSheetModal>
  );
}
