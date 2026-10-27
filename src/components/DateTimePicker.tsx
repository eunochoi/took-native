import { translateErrorMessage } from '../i18n/errors';
import { useI18n } from '../i18n/react';
import { useState } from 'react';
import { View } from 'react-native';
import { dateTimeDraft, parseDateTime } from '../domain/date';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { DateTimeFields } from './DateTimeFields';
import { InfoNotice } from './InfoNotice';
import { Text } from './Text';

export function DateTimePicker({
  title,
  value,
  minTime,
  description,
  confirmLabel,
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
  const { t, language } = useI18n();

  const [draft, setDraft] = useState(() => dateTimeDraft(value));
  const [error, setError] = useState('');
  return (
    <BottomSheetModal
      visible
      fixedHeight
      title={title}
      onClose={onClose}
      footer={(close) => (
        <Button
          labelWeight="normal"
          label={confirmLabel ?? t('habit.selectionDone')}
          onPress={() => {
            try {
              const iso = parseDateTime(draft, Date.now());
              if (minTime && Date.parse(iso) < Date.parse(minTime))
                throw new Error(t('habit.afterStart'));
              close(() => onApply(iso));
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : t('habit.retry'));
            }
          }}
        />
      )}
    >
      <View className="gap-5">
        {!!description && <InfoNotice className="mb-2">{description}</InfoNotice>}
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
            {translateErrorMessage(error, language)}
          </Text>
        )}
      </View>
    </BottomSheetModal>
  );
}
