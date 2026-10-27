import { resolveLocale, t, type Language, type TranslationKey } from '../../src/i18n/core';

export function mockI18n(language: Language | (() => Language) = 'ko') {
  return {
    useI18n: () => {
      const current = typeof language === 'function' ? language() : language;
      return {
        language: current,
        formatLocale: resolveLocale(current).formatLocale,
        t: (key: TranslationKey, options?: Parameters<typeof t>[1]) =>
          t(key, { ...options, locale: current }),
      };
    },
  };
}

export { formatDisplayDate } from '../../src/i18n/format';

export * as soberI18n from '../../src/i18n/sober';
