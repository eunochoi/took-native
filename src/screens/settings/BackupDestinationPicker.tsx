import { useI18n } from '../../i18n/react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerAction } from '../../components/PickerAction';

export function BackupDestinationPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (destination: 'device' | 'share') => void;
}) {
  const { t } = useI18n();
  return (
    <BottomSheetModal visible title={t('settings.backupDestination')} onClose={onClose}>
      {(closePicker) => (
        <View className="gap-3">
          <PickerAction
            icon="save-alt"
            title={t('settings.saveToDevice')}
            description={t('settings.saveToDeviceDescription')}
            onPress={() => closePicker(() => onSelect('device'))}
          />
          <PickerAction
            icon="share"
            title={t('settings.shareBackup')}
            description={t('settings.shareBackupDescription')}
            onPress={() => closePicker(() => onSelect('share'))}
          />
        </View>
      )}
    </BottomSheetModal>
  );
}
