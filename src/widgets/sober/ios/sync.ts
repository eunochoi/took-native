import { requireOptionalNativeModule } from 'expo';
import { openDatabaseAsync } from 'expo-sqlite';
import { withReadLock } from '../../../db';
import { getSoberList, getSoberRestarts } from '../../../db/sober';
import { buildIosSoberWidgetSnapshot } from './snapshot';

export async function syncIosSoberWidgets() {
  const bridge = requireOptionalNativeModule<{ syncAsync: (snapshot: string) => Promise<void> }>(
    'TookWidgetSync',
  );
  // An older binary or Expo Go has no widget bridge. Record saves must still succeed.
  if (!bridge) return;
  await withReadLock(async () => {
    const db = await openDatabaseAsync('took.db', { useNewConnection: true });
    try {
      const [sobers, restarts] = await Promise.all([getSoberList(db), getSoberRestarts(db)]);
      await bridge.syncAsync(JSON.stringify(buildIosSoberWidgetSnapshot(sobers, restarts)));
    } finally {
      await db.closeAsync();
    }
  });
}
