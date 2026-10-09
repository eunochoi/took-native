import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { dateTimeDraft } from '../domain/date';
import { useCurrentMinute } from '../hooks/useCurrentMinute';
import { DatePickerCalendar } from '../screens/calendar/DatePickerCalendar';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { FormPickerRow } from './FormPickerRow';
import { Text } from './Text';

const TIME_INPUT_CLASS_NAME =
  'h-12 w-16 rounded-2xl bg-transparent border border-theme-border text-center text-lg text-theme-text-primary font-normal';

export function DateTimeFields({
  draft,
  minTime,
  collapsible = false,
  disabled = false,
  onChange,
}: {
  draft: ReturnType<typeof dateTimeDraft>;
  minTime?: string;
  collapsible?: boolean;
  disabled?: boolean;
  onChange: (draft: ReturnType<typeof dateTimeDraft>) => void;
}) {
  const now = useCurrentMinute();
  const today = format(new Date(now), 'yyyy-MM-dd');
  const { colors, iconSizes } = useAppTheme();
  const [month, setMonth] = useState(draft.date.slice(0, 7));
  const [expanded, setExpanded] = useState(!collapsible);
  return (
    <View className="gap-5">
      {collapsible && (
        <View className="gap-2">
          <Text className="text-base">시작 시간</Text>
          <FormPickerRow
            label={`${format(parseISO(draft.date), 'yyyy년 M월 d일')} ${draft.hour}:${draft.minute}`}
            accessibilityLabel="다시 시작 시간 선택"
            disabled={disabled}
            leading={<AppIcon name="date" size={iconSizes.md} color={colors.textSecondary} />}
            onPress={() => setExpanded(!expanded)}
          />
        </View>
      )}
      {expanded && (
        <View className="gap-5" pointerEvents={disabled ? 'none' : 'auto'}>
          <DatePickerCalendar
            month={month}
            selected={draft.date}
            today={today}
            onMonthChange={(value) => {
              if (!disabled) setMonth(value);
            }}
            minDate={minTime ? format(new Date(minTime), 'yyyy-MM-dd') : undefined}
            onSelect={(date) => {
              if (disabled) return;
              onChange({ ...draft, date });
              setMonth(date.slice(0, 7));
            }}
          />
          <View className="flex-row items-center justify-center gap-3">
            <TextInput
              accessibilityLabel="시 (0~23)"
              keyboardType="number-pad"
              maxLength={2}
              editable={!disabled}
              value={draft.hour}
              onChangeText={(hour) => {
                if (!disabled) onChange({ ...draft, hour });
              }}
              className={TIME_INPUT_CLASS_NAME}
            />
            <Text>:</Text>
            <TextInput
              accessibilityLabel="분 (0~59)"
              keyboardType="number-pad"
              maxLength={2}
              editable={!disabled}
              value={draft.minute}
              onChangeText={(minute) => {
                if (!disabled) onChange({ ...draft, minute });
              }}
              className={TIME_INPUT_CLASS_NAME}
            />
          </View>
        </View>
      )}
    </View>
  );
}
