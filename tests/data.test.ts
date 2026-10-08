import test from 'node:test';
import assert from 'node:assert/strict';
import { database, rows } from './database';
import { initializeDatabase } from '../src/db/schema';
import { saveDiary, deleteDiary, getDiaryById, getDiaryList } from '../src/db/diary';
import { saveHabit, deleteHabit, setHabitCompletion, getCompletionsByHabit } from '../src/db/habit';
import { getDiaryStats, getHabitStats } from '../src/db/stats';
import { shiftDate, todayString } from '../src/domain/date';
import { MAX_HABIT_COUNT } from '../src/domain/limits';

const today = todayString();
test('schema initialization is repeatable and refuses future versions without deleting records', async () => {
  const { db, raw } = await database();
  await saveDiary(db, { date: today, emotion: 0, text: '남길 기록', files: [] });
  await initializeDatabase(db);
  raw.exec('PRAGMA user_version = 6;');
  await assert.rejects(initializeDatabase(db));
  assert.equal(rows(raw, 'SELECT count(*) FROM diaries')[0][0], 1);
  raw.close();
});
test('diary deletion leaves habit completions and returns media for cleanup', async () => {
  const { db, raw } = await database();
  const habit = await saveHabit(db, { name: '걷기', priority: 1, icon_key: 'walking' });
  await setHabitCompletion(db, habit, today, true);
  assert.equal(rows(raw, 'SELECT count(*) FROM diaries')[0][0], 0);
  const diary = await saveDiary(db, { date: today, emotion: 1, text: '산책', files: ['one.jpg'] });
  assert.deepEqual(await deleteDiary(db, diary.id), ['one.jpg']);
  assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 1);
  assert.equal(rows(raw, 'SELECT count(*) FROM diary_images')[0][0], 0);
  raw.close();
});
test('habit deletion cascades only completions, not diaries', async () => {
  const { db, raw } = await database();
  const habit = await saveHabit(db, { name: '독서', priority: 2, icon_key: 'reading' });
  await setHabitCompletion(db, habit, today, true);
  await saveDiary(db, { date: today, emotion: 0, text: '책', files: [] });
  await deleteHabit(db, habit);
  assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 0);
  assert.equal(rows(raw, 'SELECT count(*) FROM diaries')[0][0], 1);
  raw.close();
});
test('habit name uniqueness, item limit, valid icons and four-day edits are enforced in data layer', async () => {
  const { db, raw } = await database();
  const first = await saveHabit(db, { name: '매일 걷기', priority: 1, icon_key: 'walking' });
  await assert.rejects(saveHabit(db, { name: ' 매일 걷기 ', priority: 1, icon_key: 'walking' }));
  await assert.rejects(setHabitCompletion(db, first, shiftDate(today, -1), true));
  await assert.rejects(setHabitCompletion(db, first, shiftDate(today, 1), true));
  raw.run('UPDATE habits SET initial_started_at = ?', [
    new Date(`${shiftDate(today, -10)}T00:00:00`).toISOString(),
  ]);
  await setHabitCompletion(db, first, shiftDate(today, -3), true);
  await assert.rejects(setHabitCompletion(db, first, shiftDate(today, -4), true));
  for (let i = 1; i < MAX_HABIT_COUNT; i++)
    await saveHabit(db, { name: `습관${i}`, priority: 0, icon_key: 'goal' });
  await assert.rejects(saveHabit(db, { name: '초과', priority: 0, icon_key: 'goal' }));
  raw.close();
});
test('same-date diaries are rejected and failed image update rolls back text and images', async () => {
  const { db, raw } = await database();
  const one = await saveDiary(db, { date: today, emotion: 0, text: '기존', files: ['first.jpg'] });
  await assert.rejects(saveDiary(db, { date: today, emotion: 2, text: '중복', files: [] }));
  await saveDiary(db, {
    date: shiftDate(today, -1),
    emotion: 1,
    text: '다른 날',
    files: ['owned.jpg'],
  });
  await assert.rejects(
    saveDiary(db, {
      id: one.id,
      date: today,
      emotion: 2,
      text: '실패할 수정',
      files: ['owned.jpg'],
    }),
  );
  assert.equal(rows(raw, `SELECT text FROM diaries WHERE id = ${one.id}`)[0][0], '기존');
  assert.equal(
    rows(raw, `SELECT file_name FROM diary_images WHERE diary_id = ${one.id}`)[0][0],
    'first.jpg',
  );
  raw.close();
});
test('all-period/year/month filters, emotions and pagination retain distinct meanings', async () => {
  const { db, raw } = await database();
  for (let i = 1; i <= 7; i++)
    await saveDiary(db, { date: `2024-02-0${i}`, emotion: i % 2, text: `기록${i}`, files: [] });
  await saveDiary(db, { date: '2023-02-01', emotion: 1, text: '작년', files: [] });
  const filters = { year: null, month: 0, emotion: null, sort: 'ASC' as const };
  assert.equal((await getDiaryList(db, filters, 0))[0].date, '2023-02-01');
  assert.equal((await getDiaryList(db, filters, 1)).length, 3);
  assert.equal((await getDiaryList(db, { ...filters, year: 2024, month: 3 }, 0)).length, 0);
  assert.equal(
    (await getDiaryList(db, { ...filters, year: 2024, month: 2, emotion: 1 }, 0)).length,
    4,
  );
  raw.close();
});
test('year-specific stats do not constrain lifetime streaks and zero completions do not rank', async () => {
  const { db, raw } = await database();
  await saveDiary(db, { date: '2023-12-31', emotion: 1, text: '연말', files: [] });
  await saveDiary(db, { date: '2024-01-01', emotion: 0, text: '새해', files: [] });
  const stats = await getDiaryStats(db, 2024);
  assert.equal(stats.total, 1);
  assert.equal(stats.longest, 2);
  assert.equal(stats.monthly[0], 1);
  assert.equal(stats.halves[0][0], 1);
  const id = await saveHabit(db, { name: '운동', priority: 1, icon_key: 'running' });
  const year = Number(today.slice(0, 4));
  assert.deepEqual((await getHabitStats(db, year)).top, []);
  await setHabitCompletion(db, id, today, true);
  assert.equal((await getHabitStats(db, year)).top[0].count, 1);
  raw.close();
});

test('diary pages batch ordered photos and only the independent completions on each date', async () => {
  const { db, raw } = await database();
  const habit = await saveHabit(db, { name: '산책', priority: 1, icon_key: 'walking' });
  raw.run('UPDATE habits SET initial_started_at = ?', [
    new Date(`${shiftDate(today, -10)}T00:00:00`).toISOString(),
  ]);
  await setHabitCompletion(db, habit, today, true);
  const target = await saveDiary(db, {
    date: today,
    emotion: 1,
    text: '오늘',
    files: ['a.jpg', 'b.jpg', 'c.jpg'],
  });
  for (let day = 1; day <= 5; day++)
    await saveDiary(db, {
      date: shiftDate(today, -day),
      emotion: 2,
      text: `이전${day}`,
      files: [`day${day}.jpg`],
    });
  const filters = { year: null, month: 0, emotion: null, sort: 'DESC' as const };
  const page = await getDiaryList(db, filters, 0);
  assert.equal(page.length, 5);
  assert.equal(new Set(page.map((diary) => diary.id)).size, 5);
  assert.equal((await getDiaryList(db, filters, 1)).length, 1);
  assert.deepEqual(
    page[0].images.map((image) => image.file_name),
    ['a.jpg', 'b.jpg', 'c.jpg'],
  );
  assert.deepEqual(
    page[0].completedHabits.map((entry) => entry.id),
    [habit],
  );
  assert.ok(
    page.slice(1).every((diary) => diary.completedHabits.length === 0 && diary.images.length === 1),
  );
  assert.deepEqual(
    (await getDiaryById(db, target.id))?.completedHabits.map((entry) => entry.id),
    [habit],
  );
  await saveDiary(db, {
    id: target.id,
    date: today,
    emotion: 3,
    text: '순서 변경',
    files: ['c.jpg', 'a.jpg'],
  });
  assert.deepEqual(
    (await getDiaryById(db, target.id))?.images.map((image) => image.file_name),
    ['c.jpg', 'a.jpg'],
  );
  await setHabitCompletion(db, habit, today, false);
  assert.deepEqual((await getDiaryById(db, target.id))?.completedHabits, []);
  await deleteDiary(db, target.id);
  assert.equal(await getDiaryById(db, target.id), null);
  assert.equal((await getDiaryList(db, { ...filters, emotion: 1 }, 0)).length, 0);
  raw.close();
});

test('habit detail reads only its own lifetime completions in date order', async () => {
  const { db, raw } = await database();
  const first = await saveHabit(db, { name: '걷기', priority: 0, icon_key: 'walking' });
  const other = await saveHabit(db, { name: '독서', priority: 1, icon_key: 'reading' });
  for (const [id, date] of [
    [first, '2020-12-31'],
    [other, '2020-12-31'],
    [first, '2010-01-01'],
  ] as const)
    raw.run('INSERT INTO habit_completions (habit_id, date, created_at) VALUES (?, ?, ?)', [
      id,
      date,
      date,
    ]);
  const records = await getCompletionsByHabit(db, first);
  assert.deepEqual(
    records.map((record) => record.date),
    ['2010-01-01', '2020-12-31'],
  );
  assert.ok(records.every((record) => record.habit_id === first));
  assert.deepEqual(await getCompletionsByHabit(db, 999), []);
  await setHabitCompletion(db, first, today, true);
  assert.equal((await getCompletionsByHabit(db, first)).at(-1)?.date, today);
  await deleteHabit(db, first);
  assert.deepEqual(await getCompletionsByHabit(db, first), []);
  assert.equal((await getCompletionsByHabit(db, other)).length, 1);
  raw.close();
});

test('habit colors persist through edits and reject unknown palette keys', async () => {
  const { db, raw } = await database();
  const id = await saveHabit(db, {
    name: '독서 색상',
    priority: 1,
    icon_key: 'reading',
    icon_color: 'coral',
  });
  assert.equal(rows(raw, 'SELECT icon_color FROM habits')[0][0], 'coral');
  await saveHabit(db, {
    id,
    name: '독서 색상',
    priority: 2,
    icon_key: 'reading',
    icon_color: 'mint',
  });
  assert.equal(rows(raw, 'SELECT icon_color FROM habits')[0][0], 'mint');
  await assert.rejects(
    saveHabit(db, {
      id,
      name: '독서 색상',
      priority: 2,
      icon_key: 'reading',
      icon_color: 'invalid' as never,
    }),
  );
  assert.equal(rows(raw, 'SELECT icon_color FROM habits')[0][0], 'mint');
  raw.close();
});

test('new habits default to the theme color and can return to it after a fixed color', async () => {
  const { db, raw } = await database();
  const id = await saveHabit(db, { name: '기본색 습관', priority: 1, icon_key: 'walking' });
  assert.equal(rows(raw, 'SELECT icon_color FROM habits')[0][0], 'theme');
  await saveHabit(db, {
    id,
    name: '기본색 습관',
    priority: 1,
    icon_key: 'walking',
    icon_color: 'pink',
  });
  await saveHabit(db, {
    id,
    name: '기본색 습관',
    priority: 1,
    icon_key: 'walking',
    icon_color: 'theme',
  });
  assert.equal(rows(raw, 'SELECT icon_color FROM habits')[0][0], 'theme');
  raw.close();
});

test('diary aggregates isolate years and preserve monthly and emotion totals', async () => {
  const { db, raw } = await database();
  for (const [date, emotion] of [
    ['2023-12-31', 1],
    ['2024-01-01', 0],
    ['2024-01-02', 1],
    ['2024-02-01', 1],
    ['2024-07-01', 2],
  ] as const)
    await saveDiary(db, { date, emotion, text: '감정 집계', files: [] });
  const stats = await getDiaryStats(db, 2024);
  assert.deepEqual(stats.monthly, [2, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(stats.emotions.slice(0, 3), [1, 2, 1]);
  assert.equal(stats.total, 4);
  assert.equal(
    stats.monthly.reduce((a, b) => a + b, 0),
    stats.total,
  );
  assert.equal(
    stats.emotions.reduce((a, b) => a + b, 0),
    stats.total,
  );
  assert.equal((await getDiaryStats(db, 2022)).total, 0);
  raw.close();
});

test('a past habit start controls available dates while the last four days remain the only editable window', async () => {
  const { db, raw } = await database();
  const initialStartedAt = new Date(`${shiftDate(today, -10)}T23:30:00`).toISOString();
  const id = await saveHabit(db, {
    name: '과거 시작',
    priority: 0,
    icon_key: 'goal',
    initial_started_at: initialStartedAt,
  });
  assert.equal(rows(raw, 'SELECT initial_started_at FROM habits')[0][0], initialStartedAt);
  await setHabitCompletion(db, id, shiftDate(today, -3), true);
  await assert.rejects(setHabitCompletion(db, id, shiftDate(today, -4), true));
  await assert.rejects(setHabitCompletion(db, id, shiftDate(today, -11), true));
  await saveHabit(db, {
    id,
    name: '이름 수정',
    priority: 1,
    icon_key: 'goal',
    initial_started_at: initialStartedAt,
  });
  assert.equal(rows(raw, 'SELECT initial_started_at FROM habits')[0][0], initialStartedAt);
  assert.equal(rows(raw, 'SELECT count(*) FROM habit_completions')[0][0], 1);
  raw.close();
});
