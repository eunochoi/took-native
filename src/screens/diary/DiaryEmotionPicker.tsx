import { useAppTheme } from '../../theme/AppThemeProvider';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { EmotionImage } from '../../components/EmotionImage';
import { PickerOption } from '../../components/PickerOption';
import { Button } from '../../components/Button';
import { Text } from '../../components/Text';
import { EMOTIONS } from '../../domain/constants';

export function DiaryEmotionPicker({
  value,
  allowDeselect = false,
  onClose,
  onApply,
}: {
  value: number | null;
  allowDeselect?: boolean;
  onClose: () => void;
  onApply: (value: number | null) => void;
}) {
  const { rem: appRem } = useAppTheme();
  const [draft, setDraft] = useState(value);
  return (
    <BottomSheetModal
      visible
      title={allowDeselect ? '어떤 감정의 기록을 볼까요?' : '오늘의 감정을 골라주세요'}
      onClose={onClose}
    >
      {(closePicker) => (
        <>
          <View className="gap-5">
            <View className="gap-y-3">
              {[EMOTIONS.slice(0, 5), EMOTIONS.slice(5)].map((row, rowIndex) => (
                <View key={rowIndex} className="flex-row gap-1.5">
                  {row.map((emotion, index) => {
                    const id = rowIndex * 5 + index;
                    const selected = draft === id;
                    return (
                      <View key={emotion.key} className="flex-1 min-w-0">
                        <PickerOption
                          selectionOnly
                          compact
                          selected={selected}
                          accessibilityLabel={emotion.name}
                          onPress={() => setDraft(allowDeselect && selected ? null : id)}
                        >
                          <EmotionImage emotion={id} size={appRem * 2.75} />
                          <Text
                            className={`text-xs font-normal ${selected ? 'text-theme-accent' : ''}`}
                          >
                            {emotion.name}
                          </Text>
                        </PickerOption>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
            <Button
              labelWeight="normal"
              label={allowDeselect ? '적용하기' : '선택 완료'}
              disabled={!allowDeselect && draft === null}
              onPress={() => closePicker(() => onApply(draft))}
            />
          </View>
        </>
      )}
    </BottomSheetModal>
  );
}
