import { useState } from 'react';
import { View } from 'react-native';
import { dateTimeDraft, parseDateTime } from '../domain/date';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { DateTimeFields } from './DateTimeFields';
import { Text } from './Text';

export function DateTimePicker({
  title,
  value,
  minTime,
  description,
  confirmLabel = '선택 완료',
  onClose,
  onApply,
}: {
  mode: 'start';
  title: string;
  value: string;
  minTime?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onApply: (iso: string) => void;
}) {
  const [draft, setDraft] = useState(() => dateTimeDraft(value));
  const [error, setError] = useState('');
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label={confirmLabel}
          onPress={() => {
            try {
              const iso = parseDateTime(draft, Date.now());
              if (minTime && Date.parse(iso) < Date.parse(minTime))
                throw new Error('시작 시각 이후에 기록해주세요.');
              close(() => onApply(iso));
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : '다시 시도해주세요.');
            }
          }}
        />
      )}
    >
      <View className="gap-5">
        {!!description && (
          <Text className="text-center text-sm leading-relaxed text-theme-text-secondary mb-2">
            {description}
          </Text>
        )}
        <DateTimeFields
          draft={draft}
          minTime={minTime}
          onChange={(value) => {
            setDraft(value);
            setError('');
          }}
        />
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {error}
          </Text>
        )}
      </View>
    </BottomSheetModal>
  );
}
