import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { openDatabaseAsync } from 'expo-sqlite';
import { SCHEMA_VERSION } from '../db/schema';
import { runAutomaticBackup, shouldRunBackgroundBackup } from './automatic';

const TASK = 'bloolog-daily-backup';
if (!TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => {
    if (!(await shouldRunBackgroundBackup())) return BackgroundTask.BackgroundTaskResult.Success;
    const db = await openDatabaseAsync('took.db', { useNewConnection: true });
    try {
      // Schema migrations belong to foreground startup, never an unattended backup task.
      const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if (version?.user_version !== SCHEMA_VERSION)
        return BackgroundTask.BackgroundTaskResult.Failed;
      await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
      const result = await runAutomaticBackup(db);
      return result === false
        ? BackgroundTask.BackgroundTaskResult.Failed
        : BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    } finally {
      await db.closeAsync();
    }
  });
}
export async function registerBackupTask() {
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available)
      return;
    if (!(await TaskManager.isTaskRegisteredAsync(TASK)))
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 24 * 60 });
  } catch {
    /* Foreground backup remains available when system background execution is disabled. */
  }
}
