import { AppIcon } from './AppIcon';
import { CharacterCount } from './CharacterCount';
import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { format, parseISO } from 'date-fns';
import { FormPickerRow } from './FormPickerRow';
import { BottomSheetModal } from './BottomSheetModal';
import { Text } from './Text';
import { Button } from './Button';
import { DatePickerCalendar } from '../screens/calendar/DatePickerCalendar';
import { dateTimeDraft, parseDateTime } from '../domain/date';
import { SOBER_MEMO_MAX_LENGTH } from '../domain/limits';
import { useCurrentMinute } from '../hooks/useCurrentMinute';
import { useAppTheme } from '../theme/AppThemeProvider';

const TIME_INPUT_CLASS_NAME =
  'h-12 w-16 rounded-2xl bg-transparent border border-theme-border text-center text-lg text-theme-text-primary font-normal';

export function DateTimePicker({
  mode,
  title,
  value,
  memo,
  minTime,
  description,
  confirmLabel,
  onClose,
  onApply,
}: {
  mode: 'start' | 'restart';
  title: string;
  value: string;
  memo?: string;
  minTime?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onApply: (iso: string, memo: string | null) => void;
}) {
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const { colors, iconSizes } = useAppTheme();
  const [draft, setDraft] = useState(() => dateTimeDraft(value));
  const [month, setMonth] = useState(draft.date.slice(0, 7));
  const [text, setText] = useState(memo ?? '');
  const [error, setError] = useState('');
  const [dateExpanded, setDateExpanded] = useState(mode === 'start');
  return (
    <BottomSheetModal visible title={title} onClose={onClose}>
      {(close) => (
        <View className="gap-5">
          {!!description && (
            <Text className="text-center text-sm leading-relaxed text-theme-text-secondary mb-2">
              {description}
            </Text>
          )}
          {mode === 'restart' && (
            <View className="gap-2">
              <Text className="text-base">시작 시간</Text>
              <FormPickerRow
                label={`${format(parseISO(draft.date), 'yyyy년 M월 d일')} ${draft.hour}:${draft.minute}`}
                accessibilityLabel="다시 시작 시간 선택"
                disabled={false}
                leading={<AppIcon name="date" size={iconSizes.md} color={colors.textSecondary} />}
                onPress={() => setDateExpanded(!dateExpanded)}
              />
            </View>
          )}
          {dateExpanded && (
            <View className="gap-5">
              <DatePickerCalendar
                month={month}
                selected={draft.date}
                today={today}
                onMonthChange={setMonth}
                minDate={minTime ? format(new Date(minTime), 'yyyy-MM-dd') : undefined}
                onSelect={(date) => {
                  setDraft({ ...draft, date });
                  setMonth(date.slice(0, 7));
                  setError('');
                }}
              />
              <View className="flex-row items-center justify-center gap-3">
                <Text className="text-base">시간</Text>
                <TextInput
                  accessibilityLabel="시 (0~23)"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={draft.hour}
                  onChangeText={(hour) => {
                    setDraft({ ...draft, hour });
                    setError('');
                  }}
                  className={TIME_INPUT_CLASS_NAME}
                />
                <Text>:</Text>
                <TextInput
                  accessibilityLabel="분 (0~59)"
                  keyboardType="number-pad"
                  maxLength={2}
                  value={draft.minute}
                  onChangeText={(minute) => {
                    setDraft({ ...draft, minute });
                    setError('');
                  }}
                  className={TIME_INPUT_CLASS_NAME}
                />
              </View>
            </View>
          )}
          {mode === 'restart' && (
            <View className="gap-2">
              <Text className="text-base font-normal">메모 (선택)</Text>
              <TextInput
                accessibilityLabel="다시 시작 메모"
                value={text}
                onChangeText={setText}
                multiline
                scrollEnabled
                maxLength={SOBER_MEMO_MAX_LENGTH}
                textAlignVertical="top"
                placeholder="다시 거리를 두고 싶은 이유나 지금의 마음을 남겨보세요."
                placeholderTextColor={colors.textTertiary}
                className="h-28 rounded-2xl bg-transparent border border-theme-border p-4 text-base text-theme-text-primary font-normal"
              />
              <CharacterCount length={text.length} maxLength={SOBER_MEMO_MAX_LENGTH} />
            </View>
          )}
          {!!error && (
            <Text accessibilityRole="alert" className="text-sm text-theme-danger">
              {error}
            </Text>
          )}
          <Button
            labelWeight="normal"
            label={confirmLabel ?? (mode === 'restart' ? '기록 저장하기' : '선택 완료')}
            onPress={() => {
              try {
                const iso = parseDateTime(draft, Date.now());
                if (minTime && Date.parse(iso) < Date.parse(minTime))
                  throw new Error('최초 시작 시각 이후에 기록해주세요.');
                close(() => onApply(iso, mode === 'restart' ? text.trim() || null : null));
              } catch (failure) {
                setError((failure as Error).message);
              }
            }}
          />
          {mode === 'restart' && (
            <Button outline label="취소" labelWeight="normal" subtle onPress={() => close()} />
          )}
        </View>
      )}
    </BottomSheetModal>
  );
}
