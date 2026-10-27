import { requireOptionalNativeModule } from 'expo';
import { AppState, type NativeEventSubscription } from 'react-native';
import { i18n, resolveLocale, type LanguagePreference } from './core';

export function readDeviceLocale() {
  // Keep older development builds usable until the native module is rebuilt.
  if (requireOptionalNativeModule('ExpoLocalization')) {
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0]?.languageTag ?? 'en-US';
  }
  return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
}

let preference: LanguagePreference = 'system';
let current = resolveLocale(preference, readDeviceLocale());
i18n.locale = current.language;
const listeners = new Set<() => void>();
let subscription: NativeEventSubscription | undefined;

function refreshLocale() {
  const next = resolveLocale(preference, readDeviceLocale());
  if (next.language === current.language && next.formatLocale === current.formatLocale) return;
  current = next;
  i18n.locale = current.language;
  listeners.forEach((listener) => listener());
}

export function setLanguagePreference(value: LanguagePreference) {
  preference = value;
  refreshLocale();
}

export const getLocale = () => current;

export function subscribeLocale(listener: () => void) {
  listeners.add(listener);
  if (!subscription) {
    subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshLocale();
    });
  }
  refreshLocale();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = undefined;
    }
  };
}
