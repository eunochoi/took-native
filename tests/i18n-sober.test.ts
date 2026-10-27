import test from 'node:test';
import assert from 'node:assert/strict';
import { i18n } from '../src/i18n/core';
import { formatSoberDuration, formatSoberGoal } from '../src/i18n/sober';
import {
  formatSoberDuration as koreanDuration,
  formatSoberGoal as koreanGoal,
  SOBER_GOALS,
} from '../src/domain/sober';

test('localized duration keeps Korean formatting and elapsed minute boundaries without changing locale', () => {
  const locale = i18n.locale;
  for (const duration of [
    -1,
    0,
    59999,
    60000,
    3600000,
    86400000,
    2 * 86400000 + 3 * 3600000 + 4 * 60000,
  ]) {
    assert.equal(formatSoberDuration(duration, 'ko'), koreanDuration(duration));
  }
  assert.equal(formatSoberDuration(59999, 'en'), '0d 0h 0m');
  assert.equal(formatSoberDuration(60000, 'en'), '0d 0h 1m');
  assert.equal(formatSoberDuration(2 * 86400000 + 3 * 3600000 + 4 * 60000, 'en'), '2d 3h 4m');
  assert.equal(i18n.locale, locale);
});

test('localized goals preserve presets and custom day values independently of automatic goal calculation', () => {
  for (const days of [...SOBER_GOALS, 1, 17, 123])
    assert.equal(formatSoberGoal(days, 'ko'), koreanGoal(days));
  assert.equal(formatSoberGoal(14, 'en'), '2 weeks');
  assert.equal(formatSoberGoal(30, 'en'), '1 month');
  assert.equal(formatSoberGoal(365, 'en'), '1 year');
  assert.equal(formatSoberGoal(1095, 'en'), '3 years');
  assert.equal(formatSoberGoal(1, 'en'), '1 day');
  assert.equal(formatSoberGoal(123, 'en'), '123 days');
});
