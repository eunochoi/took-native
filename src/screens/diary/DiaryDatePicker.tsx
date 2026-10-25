import { InfoNotice } from '../../components/InfoNotice';
import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { BottomSheetModal } from '../../components/BottomSheetModal';
import { Button } from '../../components/Button';
import { QueryError } from '../../components/QueryError';
import { Text } from '../../components/Text';
import { isDate } from '../../domain/date';
import { diaryQueries, useToday } from '../../queries';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { DatePickerCalendar } from '../calendar/DatePickerCalendar';

export function DiaryDatePicker({
  value,
  diaryId,
  onClose,
  onApply,
}: {
  value: string | null;
  diaryId?: number;
  onClose: () => void;
  onApply: (date: string) => void;
}) {
  const db = useSQLiteContext();
  const today = useToday();
  const { iconSizes } = useAppTheme();
  const [draft, setDraft] = useState(value);
  const [month, setMonth] = useState((value ?? today).slice(0, 7));
  const diaries = useQuery(diaryQueries.month(db, month));
  const existing = useQuery({
    ...diaryQueries.byDate(db, draft ?? ''),
    enabled: draft !== null,
  });
  const occupied = !!existing.data && existing.data.id !== diaryId;
  const disabled =
    draft === null ||
    existing.isPending ||
    existing.isError ||
    occupied ||
    !isDate(draft) ||
    draft > today;
  return (
    <BottomSheetModal
      visible
      fixedHeight
      title="일기 날짜 선택"
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="오늘 날짜 선택"
          accessibilityHint="이번 달로 이동하고 오늘 날짜를 선택해요."
          onPress={() => {
            setDraft(today);
            setMonth(today.slice(0, 7));
          }}
          hitSlop={6}
          className="min-h-9 flex-row items-center justify-center gap-1 px-1 active:opacity-70"
        >
          <AppIcon name="today" size={iconSizes.md} className="text-theme-accent" />
          <Text className="text-sm text-theme-text-secondary">오늘</Text>
        </Pressable>
      }
      onClose={onClose}
      footer={(close) => (
        <Button
          label="선택 완료"
          disabled={disabled}
          onPress={() => {
            if (!disabled && draft !== null) close(() => onApply(draft));
          }}
        />
      )}
    >
      <View className="gap-4">
        <DatePickerCalendar
          month={month}
          today={today}
          selected={draft ?? ''}
          minDate="1900-01-01"
          diaryDates={diaries.data?.map((diary) => diary.date)}
          onMonthChange={setMonth}
          onSelect={(next) => {
            if (!isDate(next) || next < '1900-01-01' || next > today) return;
            setDraft(next);
            setMonth(next.slice(0, 7));
          }}
        />
        {diaries.isError ? (
          <QueryError
            message="일기가 있는 날짜를 확인하지 못했어요."
            onRetry={() => void diaries.refetch()}
          />
        ) : draft !== null && existing.isError ? (
          <QueryError
            message="선택한 날짜의 일기를 확인하지 못했어요."
            onRetry={() => void existing.refetch()}
          />
        ) : (
          <InfoNotice>
            {draft === null
              ? '일기를 작성할 날짜를 선택해주세요.'
              : existing.isPending
                ? '선택한 날짜의 일기를 확인하고 있어요.'
                : occupied
                  ? '이미 일기가 있는 날짜예요. 다른 날짜를 선택해주세요.'
                  : '날짜를 바꿔도 작성 중인 내용과 사진은 유지돼요.'}
          </InfoNotice>
        )}
      </View>
    </BottomSheetModal>
  );
}
