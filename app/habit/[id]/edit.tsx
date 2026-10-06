import { useLocalSearchParams } from 'expo-router';
import { HabitForm } from '../../../src/screens/HabitForm';
export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <HabitForm key={id} id={Number(id)} />;
}
