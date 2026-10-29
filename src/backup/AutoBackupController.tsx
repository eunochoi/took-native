import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { subscribeRecordWrites } from '../db';
import {
  autoBackupStatus,
  cleanBackupCache,
  refreshAutoBackupStatus,
  runAutomaticBackup,
} from './automatic';
import { registerBackupTask } from './background';

export function AutoBackupController() {
  const db = useSQLiteContext();
  useEffect(() => {
    cleanBackupCache();
    void refreshAutoBackupStatus();
    void registerBackupTask();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (AppState.currentState !== 'active') return;
      timer = setTimeout(() => {
        if (AppState.currentState === 'active') void runAutomaticBackup(db).catch(() => undefined);
      }, delay);
    };
    schedule(30_000);
    const unsubscribe = subscribeRecordWrites(() => schedule(1_000));
    const subscription = AppState.addEventListener('change', (state) => {
      clearTimeout(timer);
      if (state === 'active') schedule(30_000);
    });
    // Check pending cloud upload completion while the app is visible.
    const poll = setInterval(() => {
      if (AppState.currentState === 'active' && autoBackupStatus().pending)
        void runAutomaticBackup(db).catch(() => undefined);
    }, 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      unsubscribe();
      subscription.remove();
    };
  }, [db]);
  return null;
}
