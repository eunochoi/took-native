import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { BottomSheetPage } from '../../src/components/BottomSheetPage';
import { isDate } from '../../src/domain/date';
import { useToday } from '../../src/queries';
import { DayInfo } from '../../src/screens/calendar/DayInfo';

export default function CalendarDayInfo() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const today = useToday();
  const selected = isDate(date) ? date : today;
  return (
    <BottomSheetPage
      backRoute="/calendar"
      title={
        selected === today ? '오늘' : format(parseISO(selected), 'M월 d일 EEEE', { locale: ko })
      }
      contentKey={selected}
    >
      <View className="pb-6">
        <DayInfo key={selected} date={selected} today={today} />
      </View>
    </BottomSheetPage>
  );
}
