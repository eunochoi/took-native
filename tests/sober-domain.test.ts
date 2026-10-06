import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import {
  getAutoSoberGoal,
  getCurrentSoberStart,
  getSoberStreaks,
  getLongestSoberStreak,
  getLongSoberStreaks,
  getSoberProgress,
  formatSoberDuration,
  parseSoberDateTime,
  soberDateTimeDraft,
  validateSober,
  validateSoberRestart,
  SOBER_DAY_MS,
  SOBER_GOALS,
  SOBER_ICONS,
  type SoberInput,
} from '../src/domain/sober';
import { SOBER_DESCRIPTION_MAX_LENGTH, SOBER_MEMO_MAX_LENGTH } from '../src/domain/limits';
import { sortSobers } from '../src/db/sober';
import type { Sober, SoberRestart } from '../src/db/types';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';
const day = SOBER_DAY_MS;
const start = '2024-01-01T10:20:00.000Z';
const origin = Date.parse(start);
const sober: Sober = {
  id: 1,
  name: '야식 절제',
  description: null,
  icon_key: 'moon',
  icon_color: 'theme',
  is_priority: 0,
  initial_started_at: start,
  goal_mode: 'AUTO',
  goal_days: null,
  created_at: start,
  updated_at: start,
};
const restart = (id: number, offset: number): SoberRestart => ({
  id,
  sober_id: 1,
  restarted_at: new Date(origin + offset).toISOString(),
  memo: null,
  created_at: start,
  updated_at: start,
});

test('restart-free streak and a single restart include the current streak', () => {
  assert.equal(getCurrentSoberStart(sober, []), start);
  const empty = getSoberStreaks(sober, [], origin + 2 * day);
  assert.deepEqual(
    empty.map((item) => [item.duration, item.current]),
    [[2 * day, true]],
  );
  const events = [restart(1, 7 * day)];
  const one = getSoberStreaks(sober, events, origin + 9 * day);
  assert.equal(getCurrentSoberStart(sober, events), events[0].restarted_at);
  assert.deepEqual(
    one.map((item) => item.duration),
    [7 * day, 2 * day],
  );
  assert.equal(getLongestSoberStreak(one), 7 * day);
});
test('out-of-order insertion, time edits and deletion rebuild all durations without mutating events', () => {
  const events = [restart(2, 14 * day), restart(1, 7 * day)];
  assert.deepEqual(
    getSoberStreaks(sober, events, origin + 20 * day).map((item) => item.duration),
    [7 * day, 7 * day, 6 * day],
  );
  assert.equal(events[0].id, 2);
  const inserted = [...events, restart(3, 10 * day)];
  assert.deepEqual(
    getSoberStreaks(sober, inserted, origin + 20 * day).map((item) => item.duration),
    [7 * day, 3 * day, 4 * day, 6 * day],
  );
  const edited = inserted.map((item) => (item.id === 3 ? restart(3, 11 * day) : item));
  assert.deepEqual(
    getSoberStreaks(sober, edited, origin + 20 * day).map((item) => item.duration),
    [7 * day, 4 * day, 3 * day, 6 * day],
  );
  assert.deepEqual(
    getSoberStreaks(
      sober,
      edited.filter((item) => item.id !== 1),
      origin + 20 * day,
    ).map((item) => item.duration),
    [11 * day, 3 * day, 6 * day],
  );
});
test('long records exclude shorter intervals, include current >=3d, and sort duration DESC', () => {
  const streaks = getSoberStreaks(
    sober,
    [restart(1, 2 * day), restart(2, 5 * day), restart(3, 12 * day)],
    origin + 18 * day,
  );
  const long = getLongSoberStreaks(streaks);
  assert.deepEqual(
    long.map((item) => item.duration),
    [7 * day, 6 * day, 3 * day],
  );
  assert.equal(long[1].current, true);
  assert.equal(getLongestSoberStreak(getSoberStreaks(sober, [], origin + 40 * day)), 40 * day);
});
test('multiple restarts at the same instant are retained and durations stay nonnegative', () => {
  const streaks = getSoberStreaks(sober, [restart(2, day), restart(1, day)], origin + 2 * day);
  assert.deepEqual(
    streaks.map((item) => item.duration),
    [day, 0, day],
  );
  assert.equal(streaks.length, 3);
});
for (const [index, days] of SOBER_GOALS.entries())
  test(`automatic goal boundary before/at/after ${days} days`, () => {
    assert.equal(getAutoSoberGoal(days * day - 1), days);
    const next = SOBER_GOALS[index + 1] ?? 1095;
    assert.equal(getAutoSoberGoal(days * day), next);
    assert.equal(getAutoSoberGoal(days * day + 1), next);
  });
test('zero start, last milestone cap, exact millisecond progress and minute formatting', () => {
  assert.equal(getAutoSoberGoal(0), 3);
  assert.equal(getAutoSoberGoal(400 * day), 730);
  assert.equal(getAutoSoberGoal(800 * day), 1095);
  assert.equal(getAutoSoberGoal(2000 * day), 1095);
  assert.equal(getSoberProgress(2000 * day, 1095), 100);
  assert.equal(getSoberProgress(-1, 3), 0);
  assert.equal(getSoberProgress(day / 2, 1), 50);
  assert.equal(formatSoberDuration(12 * day + 14 * 3600000 + 3 * 60000 + 59000), '12일 14시간 3분');
  assert.equal(formatSoberDuration(0), '0일 0시간 0분');
});
test('highest record year display starts at 365 days and omits minutes only in year mode', () => {
  assert.equal(formatSoberDuration(365 * day - 1, { years: true }), '364일 23시간 59분');
  assert.equal(formatSoberDuration(365 * day, { years: true }), '1년 0시간');
  assert.equal(
    formatSoberDuration(365 * day + 23 * 3600000 + 59 * 60000, { years: true }),
    '1년 23시간',
  );
  assert.equal(
    formatSoberDuration(400 * day + 2 * 3600000 + 15 * 60000, { years: true }),
    '1년 35일 2시간',
  );
  assert.equal(formatSoberDuration(730 * day + 59 * 60000, { years: true }), '2년 0시간');
  assert.equal(
    formatSoberDuration(3652 * day + 23 * 3600000 + 59 * 60000, { years: true }),
    '10년 2일 23시간',
  );
  assert.equal(formatSoberDuration(400 * day + 2 * 3600000 + 15 * 60000), '400일 2시간 15분');
});
test('goals, icons, optional text, future and invalid datetimes are validated', () => {
  const now = origin + day;
  validateSober(sober, now);
  const invalid: Partial<SoberInput>[] = [
    { name: ' ' },
    { icon_key: 'invalid' as never },
    { icon_color: 'invalid' as never },
    { goal_mode: 'invalid' as never },
    { is_priority: 2 as never },
    { goal_mode: 'MANUAL', goal_days: null },
    { goal_mode: 'MANUAL', goal_days: 0 },
    { goal_mode: 'MANUAL', goal_days: 1.5 },
    { initial_started_at: '2024-02-30T10:20:00.000Z' },
    { initial_started_at: new Date(now + 1).toISOString() },
    { description: 'x'.repeat(SOBER_DESCRIPTION_MAX_LENGTH + 1) },
  ];
  for (const patch of invalid) assert.throws(() => validateSober({ ...sober, ...patch }, now));
  validateSoberRestart({ sober_id: 1, restarted_at: start, memo: null }, start, now);
  for (const patch of [
    { sober_id: 0 },
    { restarted_at: new Date(origin - 1).toISOString() },
    { restarted_at: new Date(now + 1).toISOString() },
    { memo: 'x'.repeat(SOBER_MEMO_MAX_LENGTH + 1) },
  ])
    assert.throws(() =>
      validateSoberRestart({ sober_id: 1, restarted_at: start, memo: null, ...patch }, start, now),
    );
});
test('local calendar drafts roundtrip UTC and reject clock errors and nonexistent DST times', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Seoul';
    const iso = '2024-03-01T15:35:00.000Z';
    assert.deepEqual(soberDateTimeDraft(iso), { date: '2024-03-02', hour: '00', minute: '35' });
    assert.equal(parseSoberDateTime(soberDateTimeDraft(iso), Date.parse(iso)), iso);
    for (const patch of [{ hour: '24' }, { minute: '60' }, { hour: '' }, { date: '2024-02-30' }])
      assert.throws(() =>
        parseSoberDateTime({ ...soberDateTimeDraft(iso), ...patch }, Date.parse(iso)),
      );
    process.env.TZ = 'America/New_York';
    assert.throws(() =>
      parseSoberDateTime(
        { date: '2024-03-10', hour: '02', minute: '30' },
        Date.parse('2024-03-11T00:00:00.000Z'),
      ),
    );
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
test('Sober settings persist separately and priority grouping honors selected creation order', () => {
  const ordinary = { ...sober, id: 1 };
  const newer = { ...sober, id: 2, created_at: new Date(origin + day).toISOString() };
  const important = { ...sober, id: 3, is_priority: 1 as const };
  assert.deepEqual(
    sortSobers([ordinary, important, newer], { soberSort: 'DESC', soberPriorityFirst: false }).map(
      (item) => item.id,
    ),
    [2, 1, 3],
  );
  assert.deepEqual(
    sortSobers([ordinary, important, newer], { soberSort: 'DESC', soberPriorityFirst: true }).map(
      (item) => item.id,
    ),
    [3, 2, 1],
  );
  assert.deepEqual(
    sortSobers([ordinary, important, newer], { soberSort: 'ASC', soberPriorityFirst: true }).map(
      (item) => item.id,
    ),
    [3, 1, 2],
  );
  const settings = {
    ...DEFAULT_SETTINGS,
    habitPriorityFirst: true,
    soberPriorityFirst: true,
    soberSort: 'ASC' as const,
  };
  assert.deepEqual(parseSettings(JSON.parse(JSON.stringify(settings))), settings);
  assert(!('priorityFirst' in parseSettings({ ...settings, priorityFirst: true })));
  assert.throws(() => parseSettings({ ...settings, soberSort: 'CUSTOM' }));
  assert.throws(() => parseSettings({ ...settings, soberPriorityFirst: 1 }));
});
test('all Sober registry entries exist in the selected native icon family', () => {
  const require = createRequire(import.meta.url);
  const maps = {
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
  };
  assert.equal(Object.keys(SOBER_ICONS).length, 20);
  assert.equal(Object.keys(SOBER_ICONS)[0], 'favorite');
  for (const icon of Object.values(SOBER_ICONS)) {
    if (icon.family === 'badge') assert.equal(icon.name, '19');
    else assert(icon.name in maps[icon.family]);
  }
});
