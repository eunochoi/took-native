import { useSyncExternalStore } from 'react';
import { t, type TranslationKey } from './core';
import { getLocale, subscribeLocale } from './locale';

export function useI18n() {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getLocale);
  return {
    ...locale,
    t: (key: TranslationKey, options?: Parameters<typeof t>[1]) =>
      t(key, { ...options, locale: locale.language }),
  };
}
