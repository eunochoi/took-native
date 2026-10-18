import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { FilterSheet } from '../../components/FilterSheet';
import { EmotionImage } from '../../components/EmotionImage';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { EMOTIONS } from '../../domain/constants';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function DiaryFilterPicker({
  year,
  month,
  currentYear,
  currentMonth,
  emotion,
  onClose,
  onApply,
}: {
  year: number | null;
  month: number;
  currentYear: number;
  currentMonth: number;
  emotion: number | null;
  onClose: () => void;
  onApply: (year: number | null, month: number, emotion: number | null) => void;
}) {
  const { colors, iconSizes, rem: appRem } = useAppTheme();
  const [draftEmotion, setEmotion] = useState(emotion);
  const initialYear = year !== null && year >= 1900 && year <= currentYear ? year : null;
  const [draftYear, setYear] = useState(initialYear);
  const [draftMonth, setMonth] = useState(
    initialYear !== null && month >= 0 && month <= (initialYear === currentYear ? currentMonth : 12)
      ? month
      : 0,
  );
  const [displayYear, setDisplayYear] = useState(initialYear ?? currentYear);
  const periodLabel =
    draftYear === null
      ? '전체 기간'
      : `${draftYear}년 ${draftMonth === 0 ? '전체' : `${draftMonth}월`}`;
  const emotionLabel = draftEmotion === null ? '전체 감정' : EMOTIONS[draftEmotion].name;
  const selectYear = (value: number) => {
    if (value < 1900 || value > currentYear) return;
    setDisplayYear(value);
    setYear(value);
    setMonth(0);
  };
  return (
    <FilterSheet
      title="일기 필터"
      onClose={onClose}
      onReset={() => {
        setYear(null);
        setMonth(0);
        setEmotion(null);
        setDisplayYear(currentYear);
      }}
      onApply={() => {
        const validYear = draftYear !== null && draftYear <= currentYear ? draftYear : null;
        const validMonth =
          validYear === null
            ? 0
            : validYear === currentYear
              ? Math.min(draftMonth, currentMonth)
              : draftMonth;
        onApply(validYear, validMonth, draftEmotion);
      }}
    >
      <>
        <View className="gap-3">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-base font-semibold">기간</Text>
            <Text className="shrink text-sm text-theme-text-secondary">{periodLabel}</Text>
          </View>
          <View className="gap-1.5">
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 연도 선택"
                disabled={displayYear <= 1900}
                onPress={() => selectYear(displayYear - 1)}
                className={`h-12 w-12 items-center justify-center ios:curve-continuous rounded-xl bg-transparent active:opacity-70 ${displayYear <= 1900 ? 'opacity-40' : 'opacity-100'}`}
              >
                <AppIcon name="chevron-left" size={iconSizes.md} color={colors.accent} />
              </Pressable>
              <View className="flex-1">
                <PickerOption
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
                disabled={displayYear >= currentYear}
                onPress={() => selectYear(displayYear + 1)}
                className={`h-12 w-12 items-center justify-center ios:curve-continuous rounded-xl bg-transparent active:opacity-70 ${displayYear >= currentYear ? 'opacity-40' : 'opacity-100'}`}
              >
                <AppIcon name="chevron-right" size={iconSizes.md} color={colors.accent} />
              </Pressable>
            </View>
            <View className="gap-1.5">
              {[0, 6].map((offset) => (
                <View key={offset} className="flex-row gap-1.5">
                  {Array.from({ length: 6 }, (_, index) => offset + index + 1).map((value) => {
                    const selected = draftYear === displayYear && draftMonth === value;
                    const disabled =
                      displayYear > currentYear ||
                      (displayYear === currentYear && value > currentMonth);
                    return (
                      <View key={value} className="flex-1">
                        <PickerOption
                          compact
                          selected={selected}
                          disabled={disabled}
                          accessibilityLabel={`${displayYear}년 ${value}월`}
                          onPress={() => {
                            if (disabled) return;
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
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-base font-semibold">감정</Text>
            <Text className="shrink text-sm text-theme-text-secondary">{emotionLabel}</Text>
          </View>
          <View className="gap-1.5">
            {[EMOTIONS.slice(0, 5), EMOTIONS.slice(5)].map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-1.5">
                {row.map((item, index) => {
                  const id = rowIndex * 5 + index;
                  const selected = draftEmotion === id;
                  return (
                    <View key={item.key} className="flex-1 min-w-0">
                      <PickerOption
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
      </>
    </FilterSheet>
  );
}
