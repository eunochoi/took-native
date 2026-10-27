import { useI18n } from '../i18n/react';
import { InfoNotice } from './InfoNotice';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { BottomSheetModal } from './BottomSheetModal';
import { Button } from './Button';
import { PickerOption } from './PickerOption';
import { Text } from './Text';

export function RecordSortPicker({
  title,
  sort,
  priorityFirst,
  recordSort,
  allowCustom = false,
  ascendingLabel,
  sortLabel,
  onClose,
  onApply,
}: {
  title: string;
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  recordSort?: 'ASC' | 'DESC';
  allowCustom?: boolean;
  ascendingLabel?: string;
  sortLabel?: string;
  onClose: () => void;
  onApply: (
    sort: 'ASC' | 'DESC' | 'CUSTOM',
    priorityFirst: boolean,
    recordSort?: 'ASC' | 'DESC',
  ) => void;
}) {
  const { t } = useI18n();
  const { colors, iconSizes } = useAppTheme();
  const [draftSort, setSort] = useState(sort);
  const [draftRecordSort, setRecordSort] = useState(recordSort);
  const [draftPriority, setPriority] = useState(
    sort === 'CUSTOM' ? false : (priorityFirst ?? false),
  );
  const options = [
    { value: 'DESC', label: t('ui.newest') },
    { value: 'ASC', label: ascendingLabel ?? t('ui.oldest') },
    ...(allowCustom ? [{ value: 'CUSTOM', label: t('ui.custom') }] : []),
  ] as { value: 'ASC' | 'DESC' | 'CUSTOM'; label: string }[];
  const prioritySection = priorityFirst !== undefined && (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-base font-semibold">{t('ui.priorityFirst')}</Text>
      <Switch
        accessibilityLabel={t('ui.priorityFirst')}
        value={draftPriority}
        onValueChange={(value) => {
          if (value && draftSort === 'CUSTOM') setSort('DESC');
          setPriority(value);
        }}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.surface}
      />
    </View>
  );
  return (
    <BottomSheetModal
      visible
      title={title}
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ui.resetSelection')}
          onPress={() => {
            setSort('DESC');
            setPriority(false);
            setRecordSort(recordSort ? 'DESC' : undefined);
          }}
          hitSlop={6}
          className="min-h-9 flex-row items-center justify-center gap-1 px-1 active:opacity-70"
        >
          <AppIcon name="restart-alt" size={iconSizes.md} className="text-theme-accent" />
          <Text className="text-sm text-theme-text-secondary">{t('ui.reset')}</Text>
        </Pressable>
      }
      onClose={onClose}
      footer={(closePicker) => (
        <Button
          label={t('ui.apply')}
          onPress={() =>
            closePicker(() => {
              const priority = draftSort === 'CUSTOM' ? false : draftPriority;
              if (recordSort) onApply(draftSort, priority, draftRecordSort);
              else onApply(draftSort, priority);
            })
          }
        />
      )}
    >
      <View className="gap-7">
        {prioritySection}
        {recordSort && (
          <View className="gap-3">
            <Text className="text-base font-semibold">{t('ui.records')}</Text>
            <View className="flex-row gap-3">
              {(['DESC', 'ASC'] as const).map((value) => (
                <View key={value} className="flex-1">
                  <PickerOption
                    keepUncheckedBorder
                    compact
                    selected={draftRecordSort === value}
                    accessibilityLabel={t('ui.currentRecord', {
                      value: t(value === 'DESC' ? 'ui.longest' : 'ui.shortest'),
                    })}
                    onPress={() => setRecordSort(value)}
                  >
                    <Text
                      className={`text-base ${draftRecordSort === value ? 'text-theme-accent-deep' : ''}`}
                    >
                      {t(value === 'DESC' ? 'ui.longest' : 'ui.shortest')}
                    </Text>
                  </PickerOption>
                </View>
              ))}
            </View>
          </View>
        )}
        <View className="gap-3">
          <Text className="text-base font-semibold">{sortLabel ?? t('ui.createdDateSort')}</Text>
          <View className="flex-row gap-3">
            {options.map((option) => (
              <View key={option.value} className="flex-1">
                <PickerOption
                  keepUncheckedBorder
                  compact
                  selected={draftSort === option.value}
                  accessibilityLabel={option.label}
                  onPress={() => {
                    setSort(option.value);
                    if (option.value === 'CUSTOM') setPriority(false);
                  }}
                >
                  <Text
                    className={`text-base ${draftSort === option.value ? 'text-theme-accent-deep' : ''}`}
                  >
                    {option.label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-1">
          <InfoNotice>
            {draftSort === 'CUSTOM'
              ? t('ui.customDescription')
              : recordSort
                ? t('ui.recordsDescription', { value: draftPriority ? t('ui.priorityPrefix') : '' })
                : t('ui.sortDescription', {
                    value: `${draftPriority ? t('ui.importantPrefix') : ''}${(sortLabel ?? t('ui.createdDateSort')).replace(/ 정렬$/, '')}`,
                  })}
          </InfoNotice>
          {allowCustom && <InfoNotice>{t('ui.sortPriorityConflict')}</InfoNotice>}
        </View>
      </View>
    </BottomSheetModal>
  );
}
