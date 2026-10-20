import { useLocalSearchParams } from 'expo-router';
import { DiaryForm } from '../../src/screens/DiaryForm';
export default function NewDiary() {
  const { date, allowDateChange } = useLocalSearchParams<{
    date?: string;
    allowDateChange?: string;
  }>();
  return <DiaryForm initialDate={date} allowDateChange={allowDateChange === 'true'} />;
}
