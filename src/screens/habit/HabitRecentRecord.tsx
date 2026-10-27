import { formatDisplayDate } from '../../i18n/format';
import { useI18n } from '../../i18n/react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { View } from 'react-native';
import { Text } from '../../components/Text';

export function HabitRecentRecord({
  dates,
  startedDate,
  today,
  unavailable,
}: {
  dates: string[];
  startedDate: string;
  today: string;
  unavailable: boolean;
}) {
  const { t, formatLocale } = useI18n();

  const latest = dates
    .filter((date) => date >= startedDate && date <= today)
    .sort()
    .at(-1);
  const daysAgo = latest ? differenceInCalendarDays(parseISO(today), parseISO(latest)) : null;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        {t('habit.recentRecord')}
      </Text>
      <Text className="text-base text-theme-text-secondary">
        {unavailable
          ? '—'
          : latest
            ? `${formatDisplayDate(latest, formatLocale, 'date')} · ${daysAgo === 0 ? t('calendar.today') : t('habit.daysAgo', { count: daysAgo ?? 0 })}`
            : t('habit.noRecords')}
      </Text>
    </View>
  );
}
