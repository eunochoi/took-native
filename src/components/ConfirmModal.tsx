import { useRef } from 'react';
import { View, Pressable } from 'react-native';
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
    >
      {(close) => (
        <>
          <Text accessibilityRole="alert" className="mb-3 text-center text-sm leading-relaxed">
            {message}
          </Text>
          <View className="flex-row gap-3">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!confirmed.current) close();
              }}
              className="min-h-12 flex-1 items-center justify-center rounded-full bg-transparent border border-theme-border px-5"
            >
              <Text className="text-base">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (confirmed.current) return;
                confirmed.current = true;
                // A dismiss already in progress must not turn into a destructive confirm.
                if (!close()) confirmed.current = false;
              }}
              className={`min-h-12 flex-1 items-center justify-center rounded-full px-5 ${danger ? 'bg-theme-danger' : 'bg-theme-accent'}`}
            >
              <Text className="text-base text-theme-text-on-accent">{confirmLabel}</Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}
