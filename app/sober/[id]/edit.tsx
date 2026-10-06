import { useLocalSearchParams } from 'expo-router';
import { SoberForm } from '../../../src/screens/SoberForm';
export default function EditSober() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SoberForm key={id} id={Number(id)} />;
}
