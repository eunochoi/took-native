import { useRef } from 'react';
import { View } from 'react-native';
import { Button } from './Button';
import { BottomSheetModal } from './BottomSheetModal';
import { Text } from './Text';

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmed = useRef(false);
  return (
    <BottomSheetModal
      visible={visible}
      title={title}
      onClose={() => {
        const accepted = confirmed.current;
        confirmed.current = false;
        if (accepted) onConfirm();
        else onCancel();
      }}
      footer={(close) => (
        <View className="flex-row gap-3">
          <Button
            label="취소"
            labelWeight="normal"
            outline
            subtle
            onPress={() => {
              if (!confirmed.current) close();
            }}
            className="flex-1"
          />
          <Button
            label={confirmLabel}
            labelWeight="normal"
            danger={danger}
            onPress={() => {
              if (confirmed.current) return;
              confirmed.current = true;
              // A dismiss already in progress must not turn into a destructive confirm.
              if (!close()) confirmed.current = false;
            }}
            className="flex-1"
          />
        </View>
      )}
    >
      <Text accessibilityRole="alert" className="text-center text-sm leading-relaxed">
        {message}
      </Text>
    </BottomSheetModal>
  );
}
