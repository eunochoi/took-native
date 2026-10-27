import { useI18n } from '../../i18n/react';
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
  const { t } = useI18n();

  return (
    <BottomSheetModal
      visible
      title={t('diary.photoTitle')}
      onClose={onClose}
      onBeforeClose={() => !props.busy && !dragging}
      scrollEnabled={!dragging}
      footer={(closePicker) => (
        <Button
          label={t('common.done')}
          disabled={props.busy || dragging}
          onPress={() => closePicker()}
        />
      )}
    >
      <View className="gap-3">
        <Text className="text-base text-theme-text-secondary">{t('diary.photoHint')}</Text>
        <Text className="text-xs text-theme-text-secondary">
          {t('diary.photoLimit', { count: props.images.length, value: DIARY_IMAGE_MAX_COUNT })}
        </Text>
        <DiaryFormImages {...props} />
      </View>
    </BottomSheetModal>
  );
}
