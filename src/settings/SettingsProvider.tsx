import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { loadAsync } from 'expo-font';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSQLiteContext } from 'expo-sqlite';
import { withWriteLock } from '../db';
import { DEFAULT_SETTINGS, parseSettings, type Settings } from './model';

interface Context {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}
const SettingsContext = createContext<Context | null>(null);
const fontAssets = {
  ...MaterialIcons.font,
  ...Ionicons.font,
  ...MaterialCommunityIcons.font,
  Tmoney: require('../../assets/fonts/TmoneyRoundWindRegular.otf'),
  TmoneyBold: require('../../assets/fonts/TmoneyRoundWindExtraBold.otf'),
};
export function SettingsProvider({
  children,
  onError,
}: {
  children: ReactNode;
  onError: (error: Error) => void;
}) {
  const db = useSQLiteContext();
  const [settings, setSettings] = useState<Settings | null>(null);
  const current = useRef(DEFAULT_SETTINGS);
  const persisted = useRef(DEFAULT_SETTINGS);
  const reloadSettings = async () => {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      'preferences',
    );
    const next = row ? parseSettings(JSON.parse(row.value)) : { ...DEFAULT_SETTINGS };
    current.current = next;
    persisted.current = next;
    setSettings(next);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        'preferences',
      );
      const value = row ? parseSettings(JSON.parse(row.value)) : { ...DEFAULT_SETTINGS };
      const normalized = JSON.stringify(value);
      if (row && row.value !== normalized) {
        await withWriteLock(() =>
          db.runAsync('UPDATE settings SET value = ? WHERE key = ?', normalized, 'preferences'),
        );
      }
      await loadAsync(fontAssets);
      if (active) {
        current.current = value;
        persisted.current = value;
        setSettings(value);
      }
    })().catch((error: Error) => {
      if (active) onError(error);
    });
    return () => {
      active = false;
    };
  }, [db, onError]);
  if (!settings) return null;
  const updateSettings = async (patch: Partial<Settings>) => {
    const next = parseSettings({ ...current.current, ...patch });
    // Reflect the user's choice immediately; persistence must not delay the transition.
    current.current = next;
    setSettings(next);
    try {
      await withWriteLock(async () => {
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          'preferences',
          JSON.stringify(next),
        );
        persisted.current = next;
      });
    } catch (error) {
      // An older failure must not undo a newer pending choice.
      if (current.current === next) {
        current.current = persisted.current;
        setSettings(persisted.current);
      }
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, reloadSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('SettingsProvider가 필요합니다.');
  return value;
}
