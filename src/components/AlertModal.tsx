import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { Text } from './Text';

export interface AlertContent {
  title: string;
  message?: string;
}

export function AlertModal({
  visible,
  title,
  message,
  confirmLabel = '확인',
  onConfirm,
}: AlertContent & {
  visible: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <BottomSheetModal
      visible={visible}
      title={title}
      onClose={onConfirm}
      footer={(close) => <Button label={confirmLabel} onPress={() => close()} />}
    >
      {message && (
        <Text accessibilityRole="alert" className="text-center text-sm leading-relaxed">
          {message}
        </Text>
      )}
    </BottomSheetModal>
  );
}
