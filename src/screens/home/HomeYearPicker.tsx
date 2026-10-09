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
  const [tempYear, setTempYear] = useState(year);
  const { height } = useWindowDimensions();
  const years = [...new Set([...(query.data ?? []), currentYear])].sort((a, b) => b - a);
  return (
    <BottomSheetModal
      visible
      title="어느 해의 기록을 볼까요?"
      onClose={onClose}
      footer={
        !query.isError && !query.isPending ? (closePicker) => (
          <Button
            labelWeight="normal"
            label="적용하기"
            onPress={() => closePicker(() => onApply(tempYear))}
          />
        ) : undefined
      }
    >
      <>
        {query.isError ? (
          <QueryError
            message="선택할 수 있는 연도를 불러오지 못했어요."
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : query.isPending ? (
          <Text className="text-center text-theme-text-secondary">
            연도를 불러오는 중이에요.
          </Text>
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
                      selectionOnly
                      selected={tempYear === value}
                      accessibilityLabel={`${value}년`}
                      onPress={() => setTempYear(value)}
                    >
                      <Text
                        className={`text-base font-normal ${tempYear === value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                      >
                        {value}년
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
