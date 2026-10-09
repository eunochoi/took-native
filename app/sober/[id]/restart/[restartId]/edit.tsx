import { useLocalSearchParams } from 'expo-router';
import { SoberRestartForm } from '../../../../../src/screens/sober/SoberRestartForm';

export default function EditSoberRestart() {
  const { id, restartId } = useLocalSearchParams<{ id: string; restartId: string }>();
  const soberId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : NaN;
  const recordId =
    typeof restartId === 'string' && /^\d+$/.test(restartId) ? Number(restartId) : NaN;
  return <SoberRestartForm key={`${id}:${restartId}`} soberId={soberId} restartId={recordId} />;
}
