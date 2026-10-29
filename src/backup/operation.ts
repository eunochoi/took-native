let busy = false;
const listeners = new Set<() => void>();
export const backupBusy = () => busy;
export function subscribeBackupActivity(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function withBackupOperation<T>(work: () => Promise<T>) {
  if (busy) throw new Error('BLOO_BUSY');
  busy = true;
  listeners.forEach((listener) => listener());
  try {
    return await work();
  } finally {
    busy = false;
    listeners.forEach((listener) => listener());
  }
}
