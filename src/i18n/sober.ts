import {
  formatSoberDuration as koreanDuration,
  formatSoberGoal as koreanGoal,
} from '../domain/sober';
import { t, type Language, type TranslationKey } from './core';

export function formatSoberDuration(duration: number, language: Language): string {
  if (language === 'ko') return koreanDuration(duration);
  const minutes = Math.max(0, Math.floor(duration / 60000));
  return t('sober.duration', {
    locale: language,
    value: Math.floor(minutes / 1440),
    title: Math.floor((minutes % 1440) / 60),
    count: minutes % 60,
  });
}

export function formatSoberGoal(days: number, language: Language): string {
  if (language === 'ko') return koreanGoal(days);
  const presets: Partial<Record<number, TranslationKey>> = {
    14: 'sober.goal14',
    30: 'sober.goal30',
    90: 'sober.goal90',
    180: 'sober.goal180',
    365: 'sober.goal365',
    730: 'sober.goal730',
    1095: 'sober.goal1095',
  };
  const key = presets[days];
  return key
    ? t(key, { locale: language })
    : t('common.dayCount', { locale: language, count: days });
}
