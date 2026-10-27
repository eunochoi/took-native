import { formatDisplayDate } from '../../src/i18n/format';
import { useI18n } from '../../src/i18n/react';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BottomSheetPage } from '../../src/components/BottomSheetPage';
import { isDate } from '../../src/domain/date';
import { useToday } from '../../src/queries';
import { DayInfo } from '../../src/screens/calendar/DayInfo';

export default function CalendarDayInfo() {
  const { t, formatLocale } = useI18n();

  const { date } = useLocalSearchParams<{ date: string }>();
  const today = useToday();
  const selected = isDate(date) && date <= today ? date : today;
  return (
    <BottomSheetPage
      backRoute="/calendar"
      title={
        selected === today ? t('calendar.today') : formatDisplayDate(selected, formatLocale, 'day')
      }
      contentKey={selected}
    >
      <View>
        <DayInfo key={selected} date={selected} today={today} />
      </View>
    </BottomSheetPage>
  );
}
