import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { FilterSheet } from '../../components/FilterSheet';
import { FormPickerRow } from '../../components/FormPickerRow';
import { InfoNotice } from '../../components/InfoNotice';
import { PickerOption } from '../../components/PickerOption';
import { QueryState } from '../../components/QueryState';
import { Text } from '../../components/Text';
import {
  DIARY_EMOTION_GROUPS,
  DIARY_SEASONS,
  type DiaryEmotionGroup,
  type DiarySeason,
} from '../../domain/diaryFilters';
import { selectionSummary } from '../../domain/selection';

export function DiaryFilterPicker({
  year,
  yearsQuery,
  seasons,
  emotionGroups,
  currentYear,
  onClose,
  onApply,
}: {
  year: number | null;
  yearsQuery: UseQueryResult<number[], Error>;
  seasons: DiarySeason[];
  emotionGroups: DiaryEmotionGroup[];
  currentYear: number;
  onClose: () => void;
  onApply: (
    year: number | null,
    seasons: DiarySeason[],
    emotionGroups: DiaryEmotionGroup[],
  ) => void;
}) {
  const initialYear = year !== null && year >= 1900 && year <= currentYear ? year : null;
  const [draftYear, setYear] = useState(initialYear);
  const [yearOpen, setYearOpen] = useState(false);
  const [draftSeasons, setSeasons] = useState(seasons);
  const [draftEmotionGroups, setEmotionGroups] = useState(emotionGroups);
  const selectedYear =
    draftYear !== null &&
    yearsQuery.data !== undefined &&
    !yearsQuery.isError &&
    !yearsQuery.data.includes(draftYear)
      ? null
      : draftYear;
  return (
    <FilterSheet
      title="일기 필터"
      resetInHeader
      onClose={onClose}
      onReset={() => {
        setYear(null);
        setSeasons([]);
        setEmotionGroups([]);
      }}
      onApply={() => onApply(selectedYear, draftSeasons, draftEmotionGroups)}
    >
      <View className="gap-4">
        <Text className="text-base font-semibold">연도</Text>
        <FormPickerRow
          label={selectedYear === null ? '전체 연도' : `${selectedYear}년`}
          accessibilityLabel="연도 선택"
          disabled={false}
          onPress={() => setYearOpen(true)}
        />
      </View>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">계절</Text>
          <Text className="min-w-0 shrink text-right text-sm text-theme-text-secondary">
            {selectionSummary(
              draftSeasons.map((season) => DIARY_SEASONS[season].label),
              4,
              '전체 계절',
            )}
          </Text>
        </View>
        <View className="gap-3">
          {(
            [
              ['spring', 'summer'],
              ['autumn', 'winter'],
            ] as const
          ).map((row, index) => (
            <View key={index} className="flex-row gap-3">
              {row.map((value) => {
                const selected = draftSeasons.includes(value);
                return (
                  <View key={value} className="flex-1 min-w-0">
                    <PickerOption
                      compact
                      checkbox
                      selected={selected}
                      accessibilityLabel={DIARY_SEASONS[value].label}
                      onPress={() =>
                        setSeasons(
                          (Object.keys(DIARY_SEASONS) as DiarySeason[]).filter((season) =>
                            season === value ? !selected : draftSeasons.includes(season),
                          ),
                        )
                      }
                    >
                      <Text className={`text-base ${selected ? 'text-theme-accent-deep' : ''}`}>
                        {DIARY_SEASONS[value].label}
                      </Text>
                    </PickerOption>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <InfoNotice>
        {(Object.keys(DIARY_SEASONS) as DiarySeason[])
          .map(
            (season) =>
              `${DIARY_SEASONS[season].label} ${DIARY_SEASONS[season].monthsLabel.replace('다음 해 ', '다음 ')}`,
          )
          .join(', ')}
      </InfoNotice>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">감정</Text>
          <Text className="shrink text-sm text-theme-text-secondary">
            {selectionSummary(
              draftEmotionGroups.map((group) => DIARY_EMOTION_GROUPS[group].label),
              3,
              '전체 감정',
            )}
          </Text>
        </View>
        <View className="flex-row gap-3">
          {(Object.keys(DIARY_EMOTION_GROUPS) as DiaryEmotionGroup[]).map((value) => {
            const selected = draftEmotionGroups.includes(value);
            return (
              <View key={value} className="flex-1 min-w-0">
                <PickerOption
                  compact
                  dense
                  checkbox
                  selected={selected}
                  accessibilityLabel={DIARY_EMOTION_GROUPS[value].label}
                  onPress={() =>
                    setEmotionGroups(
                      (Object.keys(DIARY_EMOTION_GROUPS) as DiaryEmotionGroup[]).filter((group) =>
                        group === value ? !selected : draftEmotionGroups.includes(group),
                      ),
                    )
                  }
                >
                  <Text className={`text-base ${selected ? 'text-theme-accent-deep' : ''}`}>
                    {DIARY_EMOTION_GROUPS[value].label}
                  </Text>
                  <View className="min-h-8 w-full items-center justify-center">
                    <Text className="w-full text-center text-xs leading-4 text-theme-text-secondary">
                      {DIARY_EMOTION_GROUPS[value].description}
                    </Text>
                  </View>
                </PickerOption>
              </View>
            );
          })}
        </View>
      </View>
      <InfoNotice>여러 개 선택할 수 있어요. 다시 누르면 해제돼요.</InfoNotice>
      {yearOpen && (
        <BottomSheetModal visible title="연도 선택" onClose={() => setYearOpen(false)}>
          {(close) => (
            <View className="gap-3">
              {[null, ...(yearsQuery.data ?? [])].map((value) => (
                <PickerOption
                  key={value ?? 'all'}
                  compact
                  selected={selectedYear === value}
                  accessibilityLabel={value === null ? '전체 연도' : `${value}년`}
                  onPress={() => close(() => setYear(value))}
                >
                  <Text
                    className={`text-base ${selectedYear === value ? 'text-theme-accent-deep' : ''}`}
                  >
                    {value === null ? '전체 연도' : `${value}년`}
                  </Text>
                </PickerOption>
              ))}
              <QueryState query={yearsQuery} />
            </View>
          )}
        </BottomSheetModal>
      )}
    </FilterSheet>
  );
}
