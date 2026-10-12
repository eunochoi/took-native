import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { DIARY_IMAGE_MAX_COUNT } from '../../domain/limits';
import { DiaryFormImages } from './DiaryFormImages';

export function DiaryImagesPicker({
  onClose,
  dragging,
  ...props
}: ComponentProps<typeof DiaryFormImages> & { onClose: () => void; dragging: boolean }) {
  return (
    <BottomSheetModal
      visible
      title="오늘의 장면"
      onClose={onClose}
      onBeforeClose={() => !props.busy && !dragging}
      scrollEnabled={!dragging}
      footer={(closePicker) => (
        <Button label="완료" disabled={props.busy || dragging} onPress={() => closePicker()} />
      )}
    >
      <View className="gap-3">
        <Text className="text-base text-theme-text-secondary">
          기억하고 싶은 장면을 남겨보세요.
        </Text>
        <Text className="text-xs text-theme-text-secondary">
          {props.images.length} / {DIARY_IMAGE_MAX_COUNT}장
        </Text>
        <DiaryFormImages {...props} />
      </View>
    </BottomSheetModal>
  );
}
