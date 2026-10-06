import { useLocalSearchParams } from 'expo-router';
import { DiaryForm } from '../../src/screens/DiaryForm';
export default function NewDiary() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DiaryForm initialDate={date} />;
}
