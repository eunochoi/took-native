import { useLocalSearchParams } from 'expo-router';
import { DiaryForm } from '../../../src/screens/DiaryForm';
export default function EditDiary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DiaryForm key={id} id={Number(id)} />;
}
