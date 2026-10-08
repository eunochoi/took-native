import test from 'node:test';
import assert from 'node:assert/strict';
import { getHabitMonthSummary, getHabitYearSummary } from '../src/domain/habitStats';
import { format } from 'date-fns';

test('monthly habit stats exclude days before the initial start and do not count the editable four-day window as missed', () => {
  const summary = getHabitMonthSummary(
    '2024-02',
    '2024-02-10',
    ['2024-02-01', '2024-02-10', '2024-02-17', '2024-02-17', '2024-02-20', '2024-02-21'],
    '2024-02-20',
  );
  assert.deepEqual(summary, { completed: 3, missed: 6, rate: '15.0' });
});
test('future and pre-start months have no eligible days; a completed leap month uses 29 days', () => {
  assert.deepEqual(getHabitMonthSummary('2024-01', '2024-02-10', [], '2024-03-10'), {
    completed: 0,
    missed: 0,
    rate: null,
  });
  assert.deepEqual(getHabitMonthSummary('2024-04', '2024-02-10', [], '2024-03-10'), {
    completed: 0,
    missed: 0,
    rate: '0.0',
  });
  assert.deepEqual(getHabitMonthSummary('2024-02', '2023-01-01', ['2024-02-29'], '2024-03-10'), {
    completed: 1,
    missed: 28,
    rate: '3.4',
  });
});

test('yearly habit summary groups months in one pass without changing the calendar-year rate', () => {
  const dates = [
    '2023-12-31',
    '2024-01-01',
    '2024-02-10',
    '2024-02-29',
    '2024-12-31',
    '2025-01-01',
  ];
  const before = [...dates];
  const summary = getHabitYearSummary(2024, dates);
  assert.deepEqual(summary, {
    completed: 4,
    monthly: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    rate: '1.1',
  });
  assert.deepEqual(dates, before);
});

test('yearly habit summary retains 365/366-day denominators and empty-year values', () => {
  for (const [year, days] of [
    [2023, 365],
    [2024, 366],
  ] as const) {
    const date = new Date(year, 0, 1);
    const dates = Array.from({ length: days }, () => {
      const value = format(date, 'yyyy-MM-dd');
      date.setDate(date.getDate() + 1);
      return value;
    });
    const summary = getHabitYearSummary(year, dates);
    assert.equal(summary.completed, days);
    assert.equal(summary.monthly[1], year === 2024 ? 29 : 28);
    assert.equal(
      summary.monthly.reduce((total, count) => total + count, 0),
      days,
    );
    assert.equal(summary.rate, '100.0');
    assert.deepEqual(getHabitYearSummary(year + 1, dates), {
      completed: 0,
      monthly: Array(12).fill(0),
      rate: '0.0',
    });
  }
});

test('yearly habit eligibility begins on the initial start and excludes earlier completions', () => {
  const summary = getHabitYearSummary(
    2024,
    ['2024-02-01', '2024-12-01', '2024-12-31'],
    '2024-12-01',
  );
  assert.equal(summary.completed, 2);
  assert.equal(summary.monthly[1], 0);
  assert.equal(summary.monthly[11], 2);
  assert.equal(summary.rate, '6.5');
  assert.equal(getHabitYearSummary(2023, ['2023-01-01'], '2024-12-01').completed, 0);
  assert.equal(getHabitYearSummary(2023, [], '2024-12-01').rate, '0.0');
});
