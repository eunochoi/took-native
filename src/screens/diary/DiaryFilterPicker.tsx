import { useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { EmotionImage } from '../../components/EmotionImage';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { EMOTIONS } from '../../domain/constants';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function DiaryFilterPicker({
  year,
  month,
  currentYear,
  emotion,
  onClose,
  onApply,
}: {
  year: number | null;
  month: number;
  currentYear: number;
  emotion: number | null;
  onClose: () => void;
  onApply: (year: number | null, month: number, emotion: number | null) => void;
}) {
  const { colors, iconSizes, rem: appRem } = useAppTheme();
  const { height } = useWindowDimensions();
  const [draftEmotion, setEmotion] = useState(emotion);
  const [draftYear, setYear] = useState(year);
  const [draftMonth, setMonth] = useState(month);
  const [displayYear, setDisplayYear] = useState(year ?? currentYear);
  const periodLabel =
    draftYear === null
      ? '전체 기간'
      : `${draftYear}년 ${draftMonth === 0 ? '전체' : `${draftMonth}월`}`;
  const emotionLabel = draftEmotion === null ? '전체 감정' : EMOTIONS[draftEmotion].name;
  const applyLabel =
    draftYear === null && draftEmotion === null
      ? '전체 일기 보기'
      : `${[draftYear === null ? null : periodLabel, draftEmotion === null ? null : emotionLabel].filter(Boolean).join(' · ')} 보기`;
  const selectYear = (value: number) => {
    setDisplayYear(value);
    setYear(value);
    setMonth(0);
  };
  return (
    <BottomSheetModal
      visible
      title="일기 필터"
      scrollFade
      maxHeight={height * 0.9}
      onClose={onClose}
      footer={(closePicker) => (
        <Button
          label={applyLabel}
          accessibilityLabel="일기 필터 적용"
          onPress={() =>
            closePicker(() =>
              onApply(draftYear, draftYear === null ? 0 : draftMonth, draftEmotion),
            )
          }
        />
      )}
    >
      <View className="gap-6">
        <View className="gap-3">
          <Text className="text-base font-semibold">기간</Text>
          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 연도 선택"
                disabled={displayYear <= 1900}
                onPress={() => selectYear(displayYear - 1)}
                className={`h-12 w-12 items-center justify-center rounded-theme bg-transparent active:opacity-70 ${displayYear <= 1900 ? 'opacity-40' : 'opacity-100'}`}
              >
                <AppIcon name="chevron-left" size={iconSizes.md} color={colors.text} />
              </Pressable>
              <View className="flex-1">
                <PickerOption
                  selectionOnly
                  compact
                  selected={draftYear === displayYear && draftMonth === 0}
                  accessibilityLabel={`${displayYear}년 전체`}
                  onPress={() => {
                    if (draftYear === displayYear && draftMonth === 0) {
                      setYear(null);
                      setMonth(0);
                    } else selectYear(displayYear);
                  }}
                >
                  <Text
                    className={`text-base font-normal ${draftYear === displayYear && draftMonth === 0 ? 'text-theme-accent' : ''}`}
                  >
                    {displayYear}년
                  </Text>
                </PickerOption>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="다음 연도 선택"
                disabled={displayYear >= 2100}
                onPress={() => selectYear(displayYear + 1)}
                className={`h-12 w-12 items-center justify-center rounded-theme bg-transparent active:opacity-70 ${displayYear >= 2100 ? 'opacity-40' : 'opacity-100'}`}
              >
                <AppIcon name="chevron-right" size={iconSizes.md} color={colors.text} />
              </Pressable>
            </View>
            <View className="gap-1.5">
              {[0, 6].map((offset) => (
                <View key={offset} className="flex-row gap-1.5">
                  {Array.from({ length: 6 }, (_, index) => offset + index + 1).map((value) => {
                    const selected = draftYear === displayYear && draftMonth === value;
                    return (
                      <View key={value} className="flex-1">
                        <PickerOption
                          selectionOnly
                          compact
                          selected={selected}
                          accessibilityLabel={`${displayYear}년 ${value}월`}
                          onPress={() => {
                            setYear(displayYear);
                            setMonth(selected ? 0 : value);
                          }}
                        >
                          <Text
                            className={`text-sm font-normal ${selected ? 'text-theme-accent' : ''}`}
                          >
                            {value}월
                          </Text>
                        </PickerOption>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
        <View className="gap-3">
          <Text className="text-base font-semibold">감정</Text>
          <View className="gap-1">
            {[EMOTIONS.slice(0, 5), EMOTIONS.slice(5)].map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-1.5">
                {row.map((item, index) => {
                  const id = rowIndex * 5 + index;
                  const selected = draftEmotion === id;
                  return (
                    <View key={item.key} className="flex-1 min-w-0">
                      <PickerOption
                        selectionOnly
                        compact
                        dense
                        selected={selected}
                        accessibilityLabel={item.name}
                        onPress={() => setEmotion(selected ? null : id)}
                      >
                        <EmotionImage emotion={id} size={appRem * 2.25} />
                        <Text
                          className={`text-xs font-normal ${selected ? 'text-theme-accent' : ''}`}
                        >
                          {item.name}
                        </Text>
                      </PickerOption>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="선택 초기화"
          onPress={() => {
            setYear(null);
            setMonth(0);
            setEmotion(null);
            setDisplayYear(currentYear);
          }}
          className="h-10 self-center flex-row items-center justify-center gap-1.5 px-4 active:opacity-70"
        >
          <AppIcon name="restart-alt" size={iconSizes.md} color={colors.accent} />
          <Text className="text-sm text-theme-accent">선택 초기화</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}
