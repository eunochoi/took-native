import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';

const TIME_INPUT_CLASS_NAME =
  'h-12 w-16 rounded-2xl bg-transparent border border-theme-border text-center text-lg text-theme-text-primary font-normal';

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
  const [hour, setHour] = useState(value?.slice(0, 2) ?? '21');
  const [minute, setMinute] = useState(value?.slice(3) ?? '00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  return (
    <BottomSheetModal
      visible
      title={title}
      onClose={onClose}
      onBeforeClose={() => !saving.current}
      footer={(close) => {
        const apply = async (time: string | null) => {
          if (saving.current) return;
          saving.current = true;
          setBusy(true);
          setError('');
          try {
            await onApply(time);
            saving.current = false;
            close();
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : '다시 시도해주세요.');
          } finally {
            saving.current = false;
            setBusy(false);
          }
        };
        return (
          <View className="gap-3">
            <Button
              label={busy ? '저장 중…' : '저장'}
              disabled={busy}
              onPress={() => {
                if (
                  !/^\d{1,2}$/.test(hour) ||
                  !/^\d{1,2}$/.test(minute) ||
                  Number(hour) > 23 ||
                  Number(minute) > 59
                ) {
                  setError('시는 0~23, 분은 0~59로 입력해주세요.');
                  return;
                }
                void apply(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
              }}
            />
            {value !== null && (
              <Button
                outline
                subtle
                label="알림 해제"
                disabled={busy}
                onPress={() => {
                  void apply(null);
                }}
              />
            )}
          </View>
        );
      }}
    >
      <View className="gap-5">
        <Text className="text-center text-sm text-theme-text-secondary">
          매일 이 시간에 알려드려요.
        </Text>
        <View className="flex-row items-center justify-center gap-3">
          <TextInput
            accessibilityLabel="시 (0~23)"
            keyboardType="number-pad"
            maxLength={2}
            editable={!busy}
            value={hour}
            className={TIME_INPUT_CLASS_NAME}
            onChangeText={(text) => {
              setHour(text);
              setError('');
            }}
          />
          <Text>:</Text>
          <TextInput
            accessibilityLabel="분 (0~59)"
            keyboardType="number-pad"
            maxLength={2}
            editable={!busy}
            value={minute}
            className={TIME_INPUT_CLASS_NAME}
            onChangeText={(text) => {
              setMinute(text);
              setError('');
            }}
          />
        </View>
        {!!error && (
          <Text accessibilityRole="alert" className="text-sm text-theme-danger">
            {error}
          </Text>
        )}
      </View>
    </BottomSheetModal>
  );
}
