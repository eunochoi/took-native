// Serialize mutations so backups capture a matching DB and media snapshot.
let pending: Promise<unknown> = Promise.resolve();
let maintenance = false;
export function withWriteLock<T>(work: () => Promise<T>): Promise<T> {
  if (maintenance) return Promise.reject(new Error('백업 작업이 끝난 뒤 다시 시도해주세요.'));
  const result = pending.then(work, work);
  pending = result.catch(() => undefined);
  return result;
}
export function withMaintenance<T>(work: () => Promise<T>): Promise<T> {
  if (maintenance) return Promise.reject(new Error('이미 백업 작업을 진행하고 있습니다.'));
  maintenance = true;
  const result = pending.then(work, work).finally(() => {
    maintenance = false;
  });
  pending = result.catch(() => undefined);
  return result;
}

// Reads use the same queue: no query observes intermediate writes on this connection.
// Using withTransactionAsync preserves PRAGMA foreign_keys, unlike a new transaction connection.
export function withReadLock<T>(work: () => Promise<T>): Promise<T> {
  const result = pending.then(work, work);
  pending = result.catch(() => undefined);
  return result;
}
