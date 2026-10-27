import { translateErrorMessage } from '../../i18n/errors';
import { useI18n } from '../../i18n/react';
import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import type { CloseBottomSheet } from '../../hooks/useBottomSheetLifecycle';

const TIME_INPUT_CONTAINER_CLASS_NAME =
  'h-12 w-16 justify-center ios:curve-continuous rounded-2xl border border-theme-border';
const TIME_INPUT_CLASS_NAME =
  'w-full py-0 bg-transparent text-center text-lg leading-tight text-theme-text-primary font-normal';

export function NotificationTimePicker({
  title,
  value,
  onClose,
  onApply,
}: {
  title: string;
  value: string | null;
  onClose: () => void;
  onApply: (time: string | null) => Promise<void>;
}) {
  const { t, language } = useI18n();
  const [hour, setHour] = useState(value?.slice(0, 2) ?? '21');
  const [minute, setMinute] = useState(value?.slice(3) ?? '00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const apply = async (time: string | null, close: CloseBottomSheet) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await onApply(time);
      saving.current = false;
      close();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('common.retryMessage'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      onBeforeClose={() => !saving.current}
      footer={(close) => (
        <Button
          label={busy ? t('common.saving') : t('common.save')}
          disabled={busy}
          onPress={() => {
            if (
              !/^\d{1,2}$/.test(hour) ||
              !/^\d{1,2}$/.test(minute) ||
              Number(hour) > 23 ||
              Number(minute) > 59
            ) {
              setError(t('settings.invalidTime'));
              return;
            }
            void apply(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`, close);
          }}
        />
      )}
    >
      {(close) => (
        <View className="gap-7">
          <View className="flex-row items-center justify-center gap-3">
            <View className={TIME_INPUT_CONTAINER_CLASS_NAME}>
              <TextInput
                accessibilityLabel={t('settings.hourInput')}
                keyboardType="number-pad"
                maxLength={2}
                editable={!busy}
                value={hour}
                className={TIME_INPUT_CLASS_NAME}
                style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                onChangeText={(text) => {
                  setHour(text);
                  setError('');
                }}
              />
            </View>
            <Text>:</Text>
            <View className={TIME_INPUT_CONTAINER_CLASS_NAME}>
              <TextInput
                accessibilityLabel={t('settings.minuteInput')}
                keyboardType="number-pad"
                maxLength={2}
                editable={!busy}
                value={minute}
                className={TIME_INPUT_CLASS_NAME}
                style={{ includeFontPadding: false, textAlignVertical: 'center' }}
                onChangeText={(text) => {
                  setMinute(text);
                  setError('');
                }}
              />
            </View>
          </View>
          {value !== null && (
            <Button
              outline
              subtle
              label={t('settings.disableReminder')}
              disabled={busy}
              onPress={() => void apply(null, close)}
            />
          )}
          {!!error && (
            <Text accessibilityRole="alert" className="text-sm text-theme-danger">
              {translateErrorMessage(error, language)}
            </Text>
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}
