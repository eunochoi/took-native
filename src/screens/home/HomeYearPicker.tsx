import { useI18n } from '../../i18n/react';
import { useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { PickerOption } from '../../components/PickerOption';
import { Button } from '../../components/Button';
import { QueryError } from '../../components/QueryError';
import { Text } from '../../components/Text';
export function HomeYearPicker({
  year,
  currentYear,
  query,
  onClose,
  onApply,
}: {
  year: number;
  currentYear: number;
  query: UseQueryResult<number[], Error>;
  onClose: () => void;
  onApply: (year: number) => void;
}) {
  const { t } = useI18n();
  const [tempYear, setTempYear] = useState(year);
  const { height } = useWindowDimensions();
  const years = [...new Set([...(query.data ?? []), currentYear])].sort((a, b) => b - a);
  return (
    <BottomSheetModal
      visible
      title={t('home.yearTitle')}
      onClose={onClose}
      footer={
        !query.isError && !query.isPending
          ? (closePicker) => (
              <Button
                labelWeight="normal"
                label={t('ui.apply')}
                onPress={() => closePicker(() => onApply(tempYear))}
              />
            )
          : undefined
      }
    >
      <>
        {query.isError ? (
          <QueryError
            message={t('home.yearsFailed')}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : query.isPending ? (
          <Text className="text-center text-theme-text-secondary">{t('home.yearsLoading')}</Text>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              style={{
                maxHeight: height * 0.3,
              }}
              contentContainerClassName="pb-1"
            >
              <View className="flex-row flex-wrap gap-y-1.5">
                {years.map((value) => (
                  <View
                    key={value}
                    className={`px-1.5 pb-1.5 ${years.length === 1 ? 'w-full' : years.length === 2 ? 'w-1/2' : 'w-1/3'}`}
                  >
                    <PickerOption
                      selected={tempYear === value}
                      accessibilityLabel={t('home.year', { count: value })}
                      onPress={() => setTempYear(value)}
                    >
                      <Text
                        className={`text-base font-normal ${tempYear === value ? 'text-theme-accent-deep' : 'text-theme-text-primary'}`}
                      >
                        {t('home.year', { count: value })}
                      </Text>
                    </PickerOption>
                  </View>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </>
    </BottomSheetModal>
  );
}
