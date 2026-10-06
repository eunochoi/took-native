import test from 'node:test';
import assert from 'node:assert/strict';
import { getDay, parseISO } from 'date-fns';
import { calendarDays, dayHabits } from '../src/domain/calendar';
import type { Completion, Habit } from '../src/db/types';

const habit = (id: number, createdDate: string, priority = 0): Habit => ({
  id,
  name: `습관 ${id}`,
  icon_key: 'goal',
  icon_color: 'blue',
  priority,
  created_date: createdDate,
  created_at: `${createdDate}T00:00:00.000Z`,
  updated_at: `${createdDate}T00:00:00.000Z`,
});
const completion = (habitId: number, date: string): Completion => ({
  habit_id: habitId,
  date,
  created_at: `${date}T00:00:00.000Z`,
});

test('calendar starts Monday and ends Sunday with only the weeks covering the month', () => {
  for (const [month, weeks] of [
    ['2021-02', 4],
    ['2024-02', 5],
    ['2026-03', 6],
  ] as const) {
    const days = calendarDays(month);
    assert.equal(days.length, weeks * 7);
    assert.equal(getDay(parseISO(days[0])), 1);
    assert.equal(getDay(parseISO(days.at(-1)!)), 0);
    assert(days.includes(`${month}-01`));
  }
  assert(calendarDays('2024-02').includes('2024-02-29'));
  assert.equal(calendarDays('2026-01')[0], '2025-12-29');
  assert.throws(() => calendarDays('2026-13'));
});

test('editable DayInfo includes eligible habits, respects creation dates and sorts by priority', () => {
  const habits = [habit(1, '2026-09-01'), habit(2, '2026-09-01', 2), habit(3, '2026-10-03', 1)];
  const records = [completion(1, '2026-09-30'), completion(2, '2026-10-03')];
  assert.deepEqual(
    dayHabits(habits, records, '2026-09-30', '2026-10-03').map((row) => [row.id, row.completed]),
    [
      [2, false],
      [1, true],
    ],
  );
  assert.deepEqual(
    dayHabits(habits, records, '2026-10-03', '2026-10-03').map((row) => [row.id, row.completed]),
    [
      [2, true],
      [3, false],
      [1, false],
    ],
  );
});

test('locked dates show only independent completed habits and future dates show none', () => {
  const habits = [habit(1, '2026-09-01'), habit(2, '2026-09-01'), habit(3, '2026-10-03')];
  const records = [completion(1, '2026-09-29'), completion(2, '2026-09-30')];
  assert.deepEqual(
    dayHabits(habits, records, '2026-09-29', '2026-10-03').map((row) => [row.id, row.completed]),
    [[1, true]],
  );
  assert.deepEqual(dayHabits(habits, records, '2026-09-28', '2026-10-03'), []);
  assert.deepEqual(dayHabits(habits, records, '2026-10-04', '2026-10-03'), []);
});
