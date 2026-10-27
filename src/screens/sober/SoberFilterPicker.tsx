import { useI18n } from '../../i18n/react';
import { InfoNotice } from '../../components/InfoNotice';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { FormPickerRow } from '../../components/FormPickerRow';
import { FilterSheet } from '../../components/FilterSheet';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export interface SoberFilter {
  priorityOnly: boolean;
  minimumDays: number;
}
export const DEFAULT_SOBER_FILTER: SoberFilter = { priorityOnly: false, minimumDays: 0 };
export const SOBER_RECORD_FILTERS = [
  { days: 0, label: '전체', shortLabel: '' },
  { days: 3, label: '3일 이상', shortLabel: '3일+' },
  { days: 7, label: '1주 이상', shortLabel: '1주+' },
  { days: 14, label: '2주 이상', shortLabel: '2주+' },
  { days: 30, label: '1개월 이상', shortLabel: '1개월+' },
  { days: 90, label: '3개월 이상', shortLabel: '3개월+' },
] as const;

export function SoberFilterPicker({
  filter,
  onClose,
  onApply,
}: {
  filter: SoberFilter;
  onClose: () => void;
  onApply: (filter: SoberFilter) => void;
}) {
  const { t } = useI18n();

  const recordFilters = SOBER_RECORD_FILTERS.map((option) => ({
    ...option,
    label: t(`sober.period${option.days}`),
  }));
  const { colors } = useAppTheme();
  const [draft, setDraft] = useState(filter);
  const [periodOpen, setPeriodOpen] = useState(false);
  return (
    <FilterSheet
      title={t('sober.filterTitle')}
      resetInHeader
      onClose={onClose}
      onReset={() => setDraft(DEFAULT_SOBER_FILTER)}
      onApply={() => onApply(draft)}
    >
      <>
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-base font-semibold">{t('sober.onlyImportant')}</Text>
          <Switch
            accessibilityLabel={t('sober.onlyImportant')}
            value={draft.priorityOnly}
            onValueChange={(priorityOnly) => setDraft({ ...draft, priorityOnly })}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
        <View className="gap-4">
          <Text className="text-base font-semibold">{t('sober.minimumPeriod')}</Text>
          <FormPickerRow
            label={recordFilters.find((option) => option.days === draft.minimumDays)!.label}
            accessibilityLabel={t('sober.minimumPeriodChoice')}
            disabled={false}
            onPress={() => setPeriodOpen(true)}
          />
        </View>
        <InfoNotice>{t('sober.minimumPeriodHint')}</InfoNotice>
        {periodOpen && (
          <BottomSheetModal
            visible
            title={t('sober.minimumPeriod')}
            onClose={() => setPeriodOpen(false)}
          >
            {(close) => (
              <View className="gap-3">
                {recordFilters.map((option) => (
                  <PickerOption
                    keepUncheckedBorder
                    key={option.days}
                    compact
                    selected={draft.minimumDays === option.days}
                    accessibilityLabel={t('sober.currentRecord', { value: option.label })}
                    onPress={() => close(() => setDraft({ ...draft, minimumDays: option.days }))}
                  >
                    <Text
                      className={`text-base ${draft.minimumDays === option.days ? 'text-theme-accent-deep' : ''}`}
                    >
                      {option.label}
                    </Text>
                  </PickerOption>
                ))}
              </View>
            )}
          </BottomSheetModal>
        )}
      </>
    </FilterSheet>
  );
}
