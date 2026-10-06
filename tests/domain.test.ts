import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCheckHabit,
  getStreak,
  isDate,
  monthDays,
  shiftDate,
  todayString,
} from '../src/domain/date';
import { parseSettings, DEFAULT_SETTINGS } from '../src/settings/model';
import { validateDiary } from '../src/db/diary';
import { sortHabits } from '../src/db/habit';
import { withMaintenance, withReadLock, withWriteLock } from '../src/db';
import type { Habit } from '../src/db/types';

test('strict dates, leap years, month boundaries and four-day window', () => {
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(isDate('2025-02-29'), false);
  assert.equal(isDate('2026-2-03'), false);
  assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
  assert.equal(canCheckHabit('2026-09-30', '2026-09-01', '2026-10-03'), true);
  assert.equal(canCheckHabit('2026-09-29', '2026-09-01', '2026-10-03'), false);
  assert.equal(canCheckHabit('2026-10-04', '2026-09-01', '2026-10-03'), false);
  assert.equal(canCheckHabit('2026-10-02', '2026-10-03', '2026-10-03'), false);
  assert.equal(monthDays('2026-02').length, 42);
});
test('streak includes yesterday while today is still empty, independent of selected year', () => {
  assert.deepEqual(getStreak(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-02'), {
    current: 3,
    longest: 3,
  });
  assert.deepEqual(getStreak(['2025-12-30', '2025-12-31'], '2026-01-02'), {
    current: 0,
    longest: 2,
  });
  assert.deepEqual(getStreak([], todayString()), { current: 0, longest: 0 });
});
test('diary rejects blank, overlong, future, invalid emotion and duplicate media', () => {
  const input = { date: '2026-10-03', text: '기록', emotion: 0, files: [] as string[] };
  for (const patch of [
    { text: '   ' },
    { text: 'a'.repeat(501) },
    { date: '2026-10-04' },
    { emotion: 1.5 },
    { emotion: 10 },
    { files: ['../x.jpg'] },
    { files: ['a.jpg', 'a.jpg'] },
  ])
    assert.throws(() => validateDiary({ ...input, ...patch }, '2026-10-03'));
});
test('settings validate on restore and custom ordering ignores priority but survives mode changes', () => {
  const settings = parseSettings({
    ...DEFAULT_SETTINGS,
    habitSort: 'CUSTOM',
    habitPriorityFirst: true,
    habitOrder: [2, 1],
  });
  const a = { id: 1, name: 'A', priority: 2, created_at: '2026-10-01' } as Habit;
  const b = { id: 2, name: 'B', priority: 0, created_at: '2026-10-02' } as Habit;
  assert.deepEqual(
    sortHabits([a, b], settings).map((habit) => habit.id),
    [2, 1],
  );
  assert.deepEqual(
    sortHabits([a, b], { ...settings, habitSort: 'DESC' }).map((habit) => habit.id),
    [1, 2],
  );
  assert.deepEqual(settings.habitOrder, [2, 1]);
  assert.throws(() => parseSettings({ ...settings, habitOrder: [1, 1] }));
  assert.throws(() => parseSettings({ ...settings, emotionStyle: 'invalid' }));
  assert.deepEqual(
    parseSettings({ ...settings, mode: 'dark', accent: 'pink', font: 'type5', fontSize: 'large' }),
    { ...settings, fontSize: 'large' },
  );
});
test('maintenance drains earlier writes and rejects mutations until it completes', async () => {
  const events: string[] = [];
  const first = withWriteLock(async () => {
    events.push('first');
  });
  const backup = withMaintenance(async () => {
    events.push('backup');
  });
  await assert.rejects(withWriteLock(async () => events.push('blocked')));
  await Promise.all([first, backup]);
  await withWriteLock(async () => {
    events.push('last');
  });
  assert.deepEqual(events, ['first', 'backup', 'last']);
});

test('read queries cannot observe an intermediate same-connection transaction', async () => {
  const events: string[] = [];
  const write = withWriteLock(async () => {
    events.push('begin');
    await Promise.resolve();
    events.push('commit');
  });
  const read = withReadLock(async () => {
    events.push('read');
  });
  await Promise.all([write, read]);
  assert.deepEqual(events, ['begin', 'commit', 'read']);
});
