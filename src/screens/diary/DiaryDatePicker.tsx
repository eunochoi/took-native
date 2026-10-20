import { InfoNotice } from '../../components/InfoNotice';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { QueryError } from '../../components/QueryError';
import { isDate } from '../../domain/date';
import { diaryQueries, useToday } from '../../queries';
import { DatePickerCalendar } from '../calendar/DatePickerCalendar';

export function DiaryDatePicker({
  value,
  onClose,
  onApply,
}: {
  value: string;
  onClose: () => void;
  onApply: (date: string) => void;
}) {
  const db = useSQLiteContext();
  const today = useToday();
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState(value.slice(0, 7));
  const existing = useQuery(diaryQueries.byDate(db, draft));
  const disabled =
    existing.isPending || existing.isError || !!existing.data || !isDate(draft) || draft > today;
  return (
    <BottomSheetModal
      visible
      title="일기 날짜 선택"
      onClose={onClose}
      footer={(close) => (
        <Button
          label="선택 완료"
          disabled={disabled}
          onPress={() => {
            if (!disabled) close(() => onApply(draft));
          }}
        />
      )}
    >
      <View className="gap-4">
        <DatePickerCalendar
          month={month}
          today={today}
          selected={draft}
          minDate="1900-01-01"
          onMonthChange={setMonth}
          onSelect={(next) => {
            if (!isDate(next) || next < '1900-01-01' || next > today) return;
            setDraft(next);
            setMonth(next.slice(0, 7));
          }}
        />
        {existing.isError ? (
          <QueryError
            message="선택한 날짜의 일기를 확인하지 못했어요."
            onRetry={() => void existing.refetch()}
          />
        ) : (
          <InfoNotice>
            {existing.isPending
              ? '선택한 날짜의 일기를 확인하고 있어요.'
              : existing.data
                ? '이미 일기가 있는 날짜예요. 다른 날짜를 선택해주세요.'
                : '날짜를 바꿔도 작성 중인 내용과 사진은 유지돼요.'}
          </InfoNotice>
        )}
      </View>
    </BottomSheetModal>
  );
}
