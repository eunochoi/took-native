import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHabitFlowStats,
  getHabitMonthSummary,
  getHabitYearSummary,
} from '../src/domain/habitStats';
import { format } from 'date-fns';

test('monthly habit stats exclude days before the initial start and count recent uncompleted days as missed', () => {
  const summary = getHabitMonthSummary(
    '2024-02',
    '2024-02-10',
    ['2024-02-01', '2024-02-10', '2024-02-17', '2024-02-17', '2024-02-20', '2024-02-21'],
    '2024-02-20',
  );
  assert.deepEqual(summary, { completed: 3, averageInterval: 11 / 3, missed: 8, rate: '27.3' });
});
test('future and pre-start months have no eligible days; a completed leap month uses 29 days', () => {
  assert.deepEqual(getHabitMonthSummary('2024-01', '2024-02-10', [], '2024-03-10'), {
    completed: 0,
    averageInterval: null,
    missed: 0,
    rate: null,
  });
  assert.deepEqual(getHabitMonthSummary('2024-04', '2024-02-10', [], '2024-03-10'), {
    completed: 0,
    averageInterval: null,
    missed: 0,
    rate: null,
  });
  assert.deepEqual(getHabitMonthSummary('2024-02', '2023-01-01', ['2024-02-29'], '2024-03-10'), {
    completed: 1,
    averageInterval: 29,
    missed: 28,
    rate: '3.4',
  });
});

test('yearly habit summary groups months in one pass and retains the full rate for completed years', () => {
  const dates = [
    '2023-12-31',
    '2024-01-01',
    '2024-02-10',
    '2024-02-29',
    '2024-12-31',
    '2025-01-01',
  ];
  const before = [...dates];
  const summary = getHabitYearSummary(2024, dates, '2024-01-01', '2025-01-04');
  assert.deepEqual(summary, {
    completed: 4,
    missed: 362,
    monthly: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    rate: '1.1',
  });
  assert.deepEqual(dates, before);
});

test('yearly habit summary uses 365/366 days for past years and today for the current year', () => {
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
    const summary = getHabitYearSummary(year, dates, `${year}-01-01`, `${year + 1}-01-04`);
    assert.equal(summary.completed, days);
    assert.equal(summary.monthly[1], year === 2024 ? 29 : 28);
    assert.equal(
      summary.monthly.reduce((total, count) => total + count, 0),
      days,
    );
    assert.equal(summary.rate, '100.0');
    assert.deepEqual(getHabitYearSummary(year + 1, dates, `${year}-01-01`, `${year + 1}-01-01`), {
      completed: 0,
      missed: 1,
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
    '2025-01-04',
  );
  assert.equal(summary.completed, 2);
  assert.equal(summary.monthly[1], 0);
  assert.equal(summary.monthly[11], 2);
  assert.equal(summary.rate, '6.5');
  assert.equal(getHabitYearSummary(2023, ['2023-01-01'], '2024-12-01', '2025-01-04').completed, 0);
  assert.equal(getHabitYearSummary(2023, [], '2024-12-01', '2025-01-04').rate, null);
});

test('yearly missed counts match monthly totals including recent uncompleted days', () => {
  const dates = [
    '2024-02-01',
    '2024-02-10',
    '2024-02-17',
    '2024-02-17',
    '2024-02-20',
    '2024-02-21',
  ];
  const summary = getHabitYearSummary(2024, dates, '2024-02-10', '2024-02-20');
  assert.equal(summary.missed, 8);
  const monthlyMissed = Array.from(
    { length: 12 },
    (_, index) =>
      getHabitMonthSummary(
        `2024-${String(index + 1).padStart(2, '0')}`,
        '2024-02-10',
        dates,
        '2024-02-20',
      ).missed,
  ).reduce((total, count) => total + count, 0);
  assert.equal(summary.missed, monthlyMissed);
});

test('yearly missed counts handle leap years, year boundaries and future starts', () => {
  assert.equal(getHabitYearSummary(2024, [], '2024-01-01', '2025-01-04').missed, 366);
  assert.equal(getHabitYearSummary(2023, [], '2023-01-01', '2024-01-04').missed, 365);
  assert.equal(getHabitYearSummary(2024, ['2024-12-30'], '2024-12-28', '2025-01-02').missed, 3);
  assert.equal(getHabitYearSummary(2025, [], '2024-01-01', '2025-01-02').missed, 2);
  assert.equal(getHabitYearSummary(2024, [], '2024-12-01', '2024-03-10').missed, 0);
});

test('current month and year rates share the start-to-today period, including recent completions', () => {
  const dates = Array.from({ length: 6 }, (_, index) => `2024-03-${15 + index}`);
  const month = getHabitMonthSummary('2024-03', '2024-03-15', dates, '2024-03-20');
  const year = getHabitYearSummary(2024, dates, '2024-03-15', '2024-03-20');
  for (const summary of [month, year]) {
    assert.equal(summary.completed, 6);
    assert.equal(summary.rate, '100.0');
    assert.equal(summary.missed, 0);
  }
  for (const summary of [
    getHabitMonthSummary('2024-03', '2024-03-15', dates.slice(0, 2), '2024-03-20'),
    getHabitYearSummary(2024, dates.slice(0, 2), '2024-03-15', '2024-03-20'),
  ]) {
    assert.equal(summary.completed, 2);
    assert.equal(summary.rate, '33.3');
    assert.equal(summary.missed, 4);
  }
});

test('month and year rates ignore duplicate, pre-start and future records', () => {
  const dates = [
    '2024-03-14',
    '2024-03-15',
    '2024-03-15',
    '2024-03-20',
    '2024-03-21',
    '2025-01-01',
  ];
  for (const summary of [
    getHabitMonthSummary('2024-03', '2024-03-15', dates, '2024-03-20'),
    getHabitYearSummary(2024, dates, '2024-03-15', '2024-03-20'),
  ]) {
    assert.equal(summary.completed, 2);
    assert.equal(summary.rate, '33.3');
    assert.equal(summary.missed, 4);
  }
  const year = getHabitYearSummary(2024, dates, '2024-03-15', '2024-03-20');
  assert.equal(year.monthly[2], 2);
  assert.equal(
    year.monthly.reduce((total, count) => total + count, 0),
    2,
  );
});

test('rates handle today as the first eligible day and periods before the start', () => {
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-20', ['2024-03-20'], '2024-03-20').rate,
    '100.0',
  );
  assert.equal(getHabitYearSummary(2024, ['2024-03-20'], '2024-03-20', '2024-03-20').rate, '100.0');
  assert.equal(getHabitMonthSummary('2024-03', '2024-03-21', [], '2024-03-20').rate, null);
  assert.equal(getHabitYearSummary(2024, [], '2024-03-21', '2024-03-20').rate, null);
  assert.equal(getHabitYearSummary(2025, [], '2024-03-15', '2024-03-20').rate, null);
});

test('habit flow uses adjacent rolling windows across years and distinguishes no eligible days', () => {
  const stats = getHabitFlowStats('2026-01-03', [], []);
  assert.equal(stats.recent.start, '2025-12-28');
  assert.equal(stats.recent.end, '2026-01-03');
  assert.equal(stats.previous.start, '2025-12-21');
  assert.equal(stats.previous.end, '2025-12-27');
  assert.equal(stats.recent.days.length, 7);
  assert.equal(stats.recent.average, null);
  assert.equal(stats.previous.average, null);
  assert.equal(stats.change, null);
});

test('habit flow averages daily rates equally and ignores duplicate, unknown and pre-start completions', () => {
  const habits = [
    { id: 1, priority: 1, initial_started_at: '2026-10-18T00:00:00' },
    { id: 2, priority: 1, initial_started_at: '2026-10-19T00:00:00' },
  ];
  const stats = getHabitFlowStats('2026-10-19', habits, [
    { habit_id: 1, date: '2026-10-18' },
    { habit_id: 1, date: '2026-10-18' },
    { habit_id: 2, date: '2026-10-18' },
    { habit_id: 99, date: '2026-10-19' },
    { habit_id: 1, date: '2026-10-19' },
  ]);
  assert.equal(stats.recent.eligibleDays, 2);
  assert.equal(stats.recent.average, 75);
  assert.equal(stats.recent.days[5].percent, 100);
  assert.equal(stats.recent.days[6].percent, 50);
  assert.equal(stats.change, null);
  const empty = getHabitFlowStats('2026-10-19', habits, []);
  assert.equal(empty.recent.average, 0);
});

test('habit flow reports percentage point increases, decreases and unchanged rates', () => {
  const habits = [{ id: 1, priority: 1, initial_started_at: '2026-01-01T00:00:00' }];
  const recent = Array.from({ length: 7 }, (_, i) => ({ habit_id: 1, date: `2026-10-${13 + i}` }));
  const previous = Array.from({ length: 7 }, (_, i) => ({
    habit_id: 1,
    date: `2026-10-${String(6 + i).padStart(2, '0')}`,
  }));
  assert.equal(getHabitFlowStats('2026-10-19', habits, recent).change, 100);
  assert.equal(getHabitFlowStats('2026-10-19', habits, previous).change, -100);
  assert.equal(getHabitFlowStats('2026-10-19', habits, [...recent, ...previous]).change, 0);
});

test('monthly recording period uses elapsed eligible days rather than the gap between records', () => {
  const dates = ['2024-03-10', '2024-03-11', '2024-03-11', '2024-03-21', '2024-02-29'];
  const before = [...dates];
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-01', dates, '2024-03-20').averageInterval,
    10,
  );
  assert.deepEqual(dates, before);
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-10', dates, '2024-03-20').averageInterval,
    5.5,
  );
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-10', dates, '2024-04-20').averageInterval,
    22 / 3,
  );
});

test('monthly recording period supports one record, zero records, completed leap months and future periods', () => {
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-01', ['2024-03-02', '2024-03-02'], '2024-03-20')
      .averageInterval,
    20,
  );
  for (const dates of [[], ['2024-02-29', '2024-03-21']]) {
    assert.equal(
      getHabitMonthSummary('2024-03', '2024-03-01', dates, '2024-03-20').averageInterval,
      null,
    );
  }
  assert.equal(
    getHabitMonthSummary('2024-02', '2024-02-01', ['2024-02-27', '2024-02-29'], '2024-03-20')
      .averageInterval,
    14.5,
  );
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-20', ['2024-03-20'], '2024-03-20').averageInterval,
    1,
  );
  assert.equal(
    getHabitMonthSummary('2024-03', '2024-03-21', ['2024-03-21'], '2024-03-20').averageInterval,
    null,
  );
});
