import { requireOptionalNativeModule } from 'expo';
import { openDatabaseAsync } from 'expo-sqlite';
import { withReadLock } from '../../../db';
import { getSoberList, getSoberRestarts } from '../../../db/sober';
import { buildIosSoberWidgetSnapshot } from './snapshot';
import { loadWidgetDisplaySettings } from '../storage';

export async function syncIosSoberWidgets() {
  const bridge = requireOptionalNativeModule<{ syncAsync: (snapshot: string) => Promise<void> }>(
    'TookWidgetSync',
  );
  // An older binary or Expo Go has no widget bridge. Record saves must still succeed.
  if (!bridge) return;
  await withReadLock(async () => {
    const db = await openDatabaseAsync('took.db', { useNewConnection: true });
    try {
      const [sobers, restarts, display] = await Promise.all([
        getSoberList(db),
        getSoberRestarts(db),
        loadWidgetDisplaySettings(db),
      ]);
      await bridge.syncAsync(
        JSON.stringify(
          buildIosSoberWidgetSnapshot(
            sobers,
            restarts,
            display.themeAccent,
            display.languagePreference,
            display.language,
          ),
        ),
      );
    } finally {
      await db.closeAsync();
    }
  });
}
