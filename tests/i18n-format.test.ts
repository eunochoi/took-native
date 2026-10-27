import { dateTimeDraft, parseDateTime } from '../src/domain/date';
import { resolveLocale, t } from '../src/i18n/core';
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayDate } from '../src/i18n/format';

test('display dates preserve the existing Korean patterns and localize US and British date order', () => {
  assert.equal(formatDisplayDate('2026-01-02', 'ko-KR', 'short'), '26년 1월 2일');
  assert.equal(formatDisplayDate('2026-01-02', 'ko-KR', 'form'), '2026. 1. 2. 금요일');
  assert.equal(formatDisplayDate('2026-01-02', 'ko-KR', 'long'), '2026년 1월 2일 금요일');
  assert.equal(formatDisplayDate('2026-01-02', 'en-US', 'date'), 'Jan 2, 2026');
  assert.equal(formatDisplayDate('2026-01-02', 'en-GB', 'date'), '2 Jan 2026');
  assert.equal(formatDisplayDate('2026-01-02', 'en-US', 'weekday'), 'Friday');
  assert.equal(formatDisplayDate('2026-01-02', 'en-US', 'month'), 'January 2026');
});

test('date-only records keep the same calendar day across time zones and leap-day boundaries', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['Asia/Seoul', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      assert.equal(formatDisplayDate('2024-02-29', 'en-US', 'date'), 'Feb 29, 2024');
      assert.equal(formatDisplayDate('2026-01-01', 'en-US', 'date'), 'Jan 1, 2026');
      assert.equal(formatDisplayDate('2025-12-31', 'ko-KR', 'date'), '2025년 12월 31일');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('habit start time keeps its local clock while weekday labels follow the selected language', () => {
  assert.equal(
    formatDisplayDate('2024-03-02T10:20:00', 'ko-KR', 'dateTime'),
    '2024년 3월 2일 10:20',
  );
  assert(formatDisplayDate('2024-03-02T10:20:00', 'en-US', 'dateTime').endsWith('10:20'));
  assert.equal(formatDisplayDate('2026-01-02', 'en-US', 'weekdayShort'), 'Fri');
  assert.equal(formatDisplayDate('2026-01-02', 'en-GB', 'dayShort'), '2 Jan');
  assert.equal(
    formatDisplayDate('2024-03-02T10:20:00', 'ko-KR', 'shortDateTime'),
    '24년 3월 2일 10:20',
  );
  assert(formatDisplayDate('2024-03-02T10:20:00', 'en-GB', 'shortDateTime').endsWith('10:20'));
});

test('compact trend dates preserve Korean labels and follow US and British numeric order', () => {
  for (const [locale, full, day] of [
    ['ko-KR', '2026.1.2', '1.2'],
    ['en-US', '1/2/2026', '1/2'],
    ['en-GB', '02/01/2026', '02/01'],
  ]) {
    assert.equal(formatDisplayDate('2026-01-02', locale, 'compact'), full);
    assert.equal(formatDisplayDate('2026-01-02', locale, 'compactDay'), day);
  }
});

test('every display style supports supported year boundaries, leap days and English fallback locales', () => {
  const styles = [
    'compact',
    'compactDay',
    'short',
    'date',
    'long',
    'form',
    'month',
    'weekday',
    'day',
    'dayShort',
    'weekdayShort',
    'dateTime',
    'shortDateTime',
  ] as const;
  for (const date of ['1900-01-01', '2024-02-29', '2026-12-31', '2100-12-31']) {
    for (const device of ['ko-KR', 'en-US', 'en-GB', 'ja-JP', 'fr-FR']) {
      const locale = resolveLocale('system', device);
      for (const style of styles) {
        const result = formatDisplayDate(date, locale.formatLocale, style);
        assert(result.length > 0);
        assert(!/Invalid|NaN|undefined/.test(result));
        if (locale.language === 'en') assert(!/[가-힣]/.test(result));
      }
    }
  }
});

test('timestamps follow the local calendar day and midnight is 00:00 rather than 24:00', () => {
  const previous = process.env.TZ;
  try {
    for (const [zone, expectedDay, hour] of [
      ['Asia/Seoul', 'Jan 1, 2026', '09:30'],
      ['America/Los_Angeles', 'Dec 31, 2025', '16:30'],
      ['Pacific/Kiritimati', 'Jan 1, 2026', '14:30'],
    ]) {
      process.env.TZ = zone;
      assert.equal(formatDisplayDate('2026-01-01T00:30:00Z', 'en-US', 'date'), expectedDay);
      assert(formatDisplayDate('2026-01-01T00:30:00Z', 'en-US', 'dateTime').endsWith(hour));
      for (const locale of ['ko-KR', 'en-US', 'en-GB']) {
        assert(formatDisplayDate('2026-01-01T00:00:00', locale, 'dateTime').endsWith('00:00'));
        assert(formatDisplayDate('2026-01-01T12:00:00', locale, 'dateTime').endsWith('12:00'));
        assert(formatDisplayDate('2026-01-01T23:59:00', locale, 'shortDateTime').endsWith('23:59'));
      }
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('date-time storage round trips keep ISO values across languages and reject a nonexistent DST time', () => {
  const previous = process.env.TZ;
  try {
    for (const zone of ['Asia/Seoul', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
      process.env.TZ = zone;
      for (const iso of [
        '2024-02-29T23:59:00.000Z',
        '2026-01-01T00:00:00.000Z',
        '2026-03-08T09:59:00.000Z',
        '2026-03-08T10:01:00.000Z',
      ]) {
        const draft = dateTimeDraft(iso);
        for (const locale of ['ko-KR', 'en-US', 'en-GB']) {
          formatDisplayDate(iso, locale, 'dateTime');
          assert.equal(parseDateTime(draft, Date.parse('2027-01-01T00:00:00Z')), iso);
        }
      }
    }
    process.env.TZ = 'America/Los_Angeles';
    assert.throws(
      () =>
        parseDateTime(
          { date: '2026-03-08', hour: '02', minute: '30' },
          Date.parse('2027-01-01T00:00:00Z'),
        ),
      /날짜와 시간/,
    );
    assert(formatDisplayDate('2026-03-08T09:59:00Z', 'en-US', 'dateTime').endsWith('01:59'));
    assert(formatDisplayDate('2026-03-08T10:01:00Z', 'en-US', 'dateTime').endsWith('03:01'));
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test('compact counts, years and decimal units keep their values without changing stored numbers', () => {
  for (const count of [0, 1, 2, 12, 1000]) {
    assert.equal(
      t('calendar.entryNumber', { locale: 'en', count }),
      `${count} ${count === 1 ? 'log' : 'logs'}`,
    );
    assert.equal(t('calendar.compactDayCount', { locale: 'en', count }), `${count}d`);
    assert.equal(t('calendar.entryNumber', { locale: 'ko', count }), `${count}개`);
    assert.equal(t('home.year', { locale: 'en', count: 2026 }), '2026');
  }
  for (const count of [0, 0.1, 1, 1.5, 1000.5]) {
    assert.equal(
      t('common.dayCount', { locale: 'en', count }),
      `${count} ${count === 1 ? 'day' : 'days'}`,
    );
    assert.equal(t('common.dayCount', { locale: 'ko', count }), `${count}일`);
  }
});
