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
  return (
    <BottomSheetModal visible title="백업을 어디에 보관할까요?" onClose={onClose}>
      {(closePicker) => (
        <View className="gap-3">
          <PickerAction
            icon="save-alt"
            title="기기에 저장하기"
            description="원하는 폴더에 백업 파일을 저장해요."
            onPress={() => closePicker(() => onSelect('device'))}
          />
          <PickerAction
            icon="share"
            title="Google Drive 등으로 공유하기"
            description="공유 화면에서 저장할 앱을 선택해요."
            onPress={() => closePicker(() => onSelect('share'))}
          />
        </View>
      )}
    </BottomSheetModal>
  );
}
