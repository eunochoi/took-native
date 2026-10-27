import { useI18n } from '../../i18n/react';
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
  const { t } = useI18n();

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
      title={t('diary.filterTitle')}
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
        <Text className="text-base font-semibold">{t('diary.yearLabel')}</Text>
        <FormPickerRow
          label={
            selectedYear === null ? t('diary.allYears') : t('home.year', { count: selectedYear })
          }
          accessibilityLabel={t('home.chooseYear')}
          disabled={false}
          onPress={() => setYearOpen(true)}
        />
      </View>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">{t('diary.seasonLabel')}</Text>
          <Text className="min-w-0 shrink text-right text-sm text-theme-text-secondary">
            {selectionSummary(
              draftSeasons.map((season) => t(`diary.${season}`)),
              4,
              t('diary.allSeasons'),
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
                      keepUncheckedBorder
                      compact
                      checkbox
                      selected={selected}
                      accessibilityLabel={t(`diary.${value}`)}
                      onPress={() =>
                        setSeasons(
                          (Object.keys(DIARY_SEASONS) as DiarySeason[]).filter((season) =>
                            season === value ? !selected : draftSeasons.includes(season),
                          ),
                        )
                      }
                    >
                      <Text className={`text-base ${selected ? 'text-theme-accent-deep' : ''}`}>
                        {t(`diary.${value}`)}
                      </Text>
                    </PickerOption>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <InfoNotice numberOfLines={0} adjustsFontSizeToFit={false}>
        {(
          [
            ['spring', 'summer'],
            ['autumn', 'winter'],
          ] as const
        )
          .map((row) =>
            row.map((season) => `${t(`diary.${season}`)} ${t(`diary.${season}Months`)}`).join(', '),
          )
          .join('\n')}
      </InfoNotice>
      <View className="gap-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-base font-semibold">{t('diary.emotionLabel')}</Text>
          <Text className="shrink text-sm text-theme-text-secondary">
            {selectionSummary(
              draftEmotionGroups.map((group) => t(`diary.${group}`)),
              3,
              t('diary.allEmotions'),
            )}
          </Text>
        </View>
        <View className="flex-row gap-3">
          {(Object.keys(DIARY_EMOTION_GROUPS) as DiaryEmotionGroup[]).map((value) => {
            const selected = draftEmotionGroups.includes(value);
            return (
              <View key={value} className="flex-1 min-w-0">
                <PickerOption
                  keepUncheckedBorder
                  compact
                  dense
                  checkbox
                  className="flex-1"
                  selected={selected}
                  accessibilityLabel={t(`diary.${value}`)}
                  onPress={() =>
                    setEmotionGroups(
                      (Object.keys(DIARY_EMOTION_GROUPS) as DiaryEmotionGroup[]).filter((group) =>
                        group === value ? !selected : draftEmotionGroups.includes(group),
                      ),
                    )
                  }
                >
                  <Text className={`text-base ${selected ? 'text-theme-accent-deep' : ''}`}>
                    {t(`diary.${value}`)}
                  </Text>
                  <View className="min-h-8 w-full items-center justify-center">
                    <Text className="w-full text-center text-xs leading-4 text-theme-text-secondary">
                      {t(`diary.${value}Names`)}
                    </Text>
                  </View>
                </PickerOption>
              </View>
            );
          })}
        </View>
      </View>
      <InfoNotice>{t('diary.multiHint')}</InfoNotice>
      {yearOpen && (
        <BottomSheetModal visible title={t('home.chooseYear')} onClose={() => setYearOpen(false)}>
          {(close) => (
            <View className="gap-3">
              {[null, ...(yearsQuery.data ?? [])].map((value) => (
                <PickerOption
                  keepUncheckedBorder
                  key={value ?? 'all'}
                  compact
                  selected={selectedYear === value}
                  accessibilityLabel={
                    value === null ? t('diary.allYears') : t('home.year', { count: value })
                  }
                  onPress={() => close(() => setYear(value))}
                >
                  <Text
                    className={`text-base ${selectedYear === value ? 'text-theme-accent-deep' : ''}`}
                  >
                    {value === null ? t('diary.allYears') : t('home.year', { count: value })}
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
