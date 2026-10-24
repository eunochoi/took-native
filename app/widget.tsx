import { useLayoutEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import type { NavigationProp, ParamListBase } from 'expo-router/react-navigation';

export default function WidgetEntry() {
  const { soberId } = useLocalSearchParams<{ soberId?: string }>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  useLayoutEffect(() => {
    const id = typeof soberId === 'string' && /^\d+$/.test(soberId) ? Number(soberId) : NaN;
    const detail = Number.isSafeInteger(id) && id > 0;
    // Reset this app stack together: no previous form or sheet remains beneath the detail.
    navigation.reset({
      index: detail ? 1 : 0,
      routes: [
        { name: '(tabs)', state: { routes: [{ name: 'sober' }], index: 0 } },
        ...(detail ? [{ name: 'sober/[id]/index', params: { id: String(id) } }] : []),
      ],
    });
  }, [navigation, soberId]);
  return null;
}
