import test from 'node:test';
import assert from 'node:assert/strict';
import { i18n, resolveLocale, t, type TranslationKey } from '../src/i18n/core';
import { en } from '../src/i18n/locales/en';
import { ko } from '../src/i18n/locales/ko';

test('common English and Korean messages have matching keys and variables', () => {
  assert.deepEqual(Object.keys(ko).sort(), Object.keys(en).sort());
  for (const section of Object.keys(en) as (keyof typeof en)[]) {
    assert.deepEqual(Object.keys(ko[section]).sort(), Object.keys(en[section]).sort());
    const englishMessages: Record<string, string | { one?: string; other: string }> = en[section];
    const koreanMessages: Record<string, string | { one?: string; other: string }> = ko[section];
    for (const [key, english] of Object.entries(englishMessages)) {
      const korean = koreanMessages[key];
      assert.equal(typeof korean, typeof english, `${section}.${key}`);
      const forms =
        typeof english === 'string'
          ? [english]
          : Object.values(english).filter((value): value is string => typeof value === 'string');
      const expected = [...new Set(forms.join(' ').match(/%\{[^}]+\}/g) ?? [])].sort();
      for (const message of typeof korean === 'string'
        ? [korean]
        : Object.values(korean).filter((value): value is string => typeof value === 'string')) {
        assert(message.trim().length > 0, `${section}.${key}`);
        assert.deepEqual(
          [...new Set(message.match(/%\{[^}]+\}/g) ?? [])].sort(),
          expected,
          `${section}.${key}`,
        );
      }
    }
  }
});

test('translation defaults to English and explicit locale does not change that default', () => {
  assert.equal(i18n.locale, 'en');
  assert.equal(t('common.save'), 'Save');
  assert.equal(t('common.save', { locale: 'ko' }), '저장');
  assert.equal(t('common.cancel', { locale: 'en' }), 'Cancel');
  assert.equal(i18n.locale, 'en');
});

test('missing Korean message falls back to English and missing English key fails visibly', () => {
  const common = i18n.translations.ko.common;
  const original = common.save;
  try {
    delete common.save;
    assert.equal(t('common.save', { locale: 'ko' }), 'Save');
  } finally {
    common.save = original;
  }
  assert.throws(() => t('common.unknown' as TranslationKey));
});

test('count substitution and pluralization respect each language including zero and fractions', () => {
  for (const count of [0, 1, 2, 1.5, 1000]) {
    assert.equal(
      t('common.dayCount', { locale: 'en', count }),
      `${count} ${count === 1 ? 'day' : 'days'}`,
    );
    assert.equal(t('common.dayCount', { locale: 'ko', count }), `${count}일`);
    assert.equal(t('common.selectedCount', { locale: 'ko', count }), `${count}개 선택`);
    assert.equal(t('common.selectedCount', { locale: 'en', count }), `${count} selected`);
    assert.equal(
      t('diary.photos', { locale: 'en', count }),
      `${count} ${count === 1 ? 'photo' : 'photos'}`,
    );
    assert.equal(t('diary.photos', { locale: 'ko', count }), `사진 ${count}장`);
  }
});

test('habit and Cut Back counts use singular only for one and preserve Korean counters', () => {
  for (const count of [0, 1, 2, 1.5]) {
    const days = count === 1 ? 'day' : 'days';
    const stars = count === 1 ? 'star' : 'stars';
    assert.equal(t('habit.daysUnit', { locale: 'en', count }), days);
    assert.equal(t('habit.timesUnit', { locale: 'en', count }), count === 1 ? 'time' : 'times');
    assert.equal(t('habit.daysAgo', { locale: 'en', count }), `${count} ${days} ago`);
    for (const key of ['habit.stars', 'habit.starCount'] as const) {
      assert.equal(t(key, { locale: 'en', count }), `${count} ${stars}`);
    }
    assert.equal(t('sober.achievement', { locale: 'en', count }), `${count} ${days} achieved!`);
    assert.equal(
      t('sober.selectedDays', { locale: 'en', count }),
      `Selected goal: ${count} ${days}`,
    );
    assert.equal(t('habit.daysUnit', { locale: 'ko', count }), '일');
    assert.equal(t('habit.timesUnit', { locale: 'ko', count }), '회');
    assert.equal(t('habit.daysAgo', { locale: 'ko', count }), `${count}일 전`);
    assert.equal(t('habit.stars', { locale: 'ko', count }), `별 ${count}개`);
    assert.equal(t('habit.starCount', { locale: 'ko', count }), `별표 ${count}개`);
    assert.equal(t('sober.achievement', { locale: 'ko', count }), `${count}일 달성!`);
    assert.equal(t('sober.selectedDays', { locale: 'ko', count }), `선택한 목표: ${count}일`);
  }
});

test('every catalog entry resolves with supplied variables in both languages without mutating resources', () => {
  const original = JSON.stringify({ en, ko });
  for (const locale of ['en', 'ko'] as const) {
    for (const [namespace, entries] of Object.entries(en)) {
      for (const key of Object.keys(entries)) {
        const result = t(`${namespace}.${key}` as TranslationKey, {
          locale,
          count: 2,
          setting: 'Background',
          value: 'Light',
          color: 'Blue',
          title: 'Diary',
          time: '9:00',
          date: '2026-10-28 09:00',
          period: 'AM',
        });
        assert(result.trim().length > 0, `${locale}:${namespace}.${key}`);
        assert(!/\[missing|%\{[^}]+\}/.test(result), `${locale}:${namespace}.${key}: ${result}`);
      }
    }
  }
  assert.equal(JSON.stringify({ en, ko }), original);
});

test('missing interpolation values remain visible and supplied count zero is preserved', () => {
  for (const locale of ['en', 'ko'] as const) {
    assert.match(t('settings.choice', { locale, setting: 'Background' }), /\[missing.*value/);
    const supplied = t('settings.choice', { locale, setting: 'Cost', value: '$5 & $10' });
    assert.equal(supplied, 'Cost, $5 & $10');
    assert(t('common.selectedCount', { locale, count: 0 }).includes('0'));
  }
});

test('resolved format locales support Korean, US and British date order and English fallback in Node Intl', () => {
  const date = new Date('2026-01-02T12:00:00Z');
  for (const [preference, device, expectedLocale, order] of [
    ['system', 'ko-KR', 'ko-KR', ['year', 'month', 'day']],
    ['system', 'en-US', 'en-US', ['month', 'day', 'year']],
    ['system', 'en-GB', 'en-GB', ['day', 'month', 'year']],
    ['system', 'ja-JP', 'en-US', ['month', 'day', 'year']],
    ['system', 'fr-FR', 'en-US', ['month', 'day', 'year']],
    ['en', 'ko-KR', 'en-US', ['month', 'day', 'year']],
    ['ko', 'en-GB', 'ko-KR', ['year', 'month', 'day']],
  ] as const) {
    const { formatLocale } = resolveLocale(preference, device);
    assert.equal(formatLocale, expectedLocale);
    const parts = new Intl.DateTimeFormat(formatLocale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);
    assert.deepEqual(
      parts.filter((part) => part.type !== 'literal').map((part) => part.type),
      order,
    );
    assert.equal(
      new Intl.NumberFormat(formatLocale, { maximumFractionDigits: 1 }).format(1234.5),
      '1,234.5',
    );
  }
});
