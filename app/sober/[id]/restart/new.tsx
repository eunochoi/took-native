import { useLocalSearchParams } from 'expo-router';
import { SoberRestartForm } from '../../../../src/screens/sober/SoberRestartForm';

export default function NewSoberRestart() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string | string[] }>();
  const soberId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
  return <SoberRestartForm key={`${id}:${date ?? ''}`} soberId={soberId} initialDate={date} />;
}
