import { I18n, type TranslateOptions } from 'i18n-js';
import { en } from './locales/en';
import { ko } from './locales/ko';

export type Language = 'en' | 'ko';
export type LanguagePreference = Language | 'system';
export type TranslationKey = {
  [Section in keyof typeof en]: `${Section}.${keyof (typeof en)[Section] & string}`;
}[keyof typeof en];

export const i18n = new I18n(
  { en, ko },
  { locale: 'en', defaultLocale: 'en', enableFallback: true, missingBehavior: 'error' },
);
i18n.pluralization.register('ko', () => ['other']);

// A task can pin its locale in options without changing the app's current locale.
export function t(key: TranslationKey, options?: TranslateOptions & { locale?: Language }): string {
  return i18n.t(key, options);
}

export function resolveLocale(preference: LanguagePreference, deviceLocale?: string | null) {
  const tag = deviceLocale?.replaceAll('_', '-') ?? '';
  const deviceLanguage = tag.split('-')[0].toLowerCase();
  const language: Language =
    preference === 'system' ? (deviceLanguage === 'ko' ? 'ko' : 'en') : preference;
  return {
    language,
    formatLocale: language === 'ko' ? 'ko-KR' : deviceLanguage === 'en' ? tag : 'en-US',
  };
}
