import { sortHabits } from '../src/db/habit';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { dayHabits } from '../src/domain/calendar';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const habits = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  name: `습관 ${index + 1}`,
  priority: index % 3,
  created_date: '2026-10-01',
  created_at: '2026-10-01T00:00:00Z',
  icon_key: 'goal',
  icon_color: 'theme',
  updated_at: '2026-10-01T00:00:00Z',
}));
function nodes(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function harness() {
  const exports: Record<string, Function> = {};
  const results: Record<string, any> = {
    diary: { isPending: true },
    habits: { isPending: true },
    completions: { isPending: true },
  };
  const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/screens/calendar/DayInfo.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react') return { useState: () => [null, () => {}] };
        if (name === 'react-native')
          return { View: 'View', ActivityIndicator: 'ActivityIndicator', Pressable: 'Pressable' };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query') return { useQuery: ({ kind }: any) => results[kind] };
        if (name.endsWith('AppThemeProvider')) return { useAppTheme: () => ({ colors: {} }) };
        if (name.endsWith('/queries'))
          return {
            diaryQueries: { detailByDate: () => ({ kind: 'diary' }) },
            habitQueries: {
              list: () => ({ kind: 'habits' }),
              completions: () => ({ kind: 'completions' }),
            },
            useRecordMutation: () => ({ isPending: false, mutate: () => {} }),
          };
        if (name.endsWith('domain/calendar')) return { dayHabits };
        if (name.endsWith('/db/habit')) return { sortHabits };
        if (name.endsWith('SettingsProvider'))
          return { useSettings: () => ({ settings: DEFAULT_SETTINGS }) };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return {
    results,
    render: (date = '2026-10-05') => nodes(exports.DayInfo({ date, today: '2026-10-05' })),
  };
}

test('delayed day queries show loading and then mount all eligible habits without reopening', () => {
  const h = harness();
  assert(h.render().some((node) => node.type === 'ActivityIndicator'));
  h.results.habits = { data: habits, isPending: false };
  h.results.completions = { data: [], isPending: false };
  assert(h.render().some((node) => node.type === 'ActivityIndicator'));
  assert(!h.render().some((node) => node.type === 'DayInfoHabitSection'));
  h.results.diary = { data: null, isPending: false };
  const section = h.render().find((node) => node.type === 'DayInfoHabitSection');
  assert.equal(section.props.habits.length, 6);
  assert(section.props.habits.every((habit: any) => habit.completed === false));
  assert.equal(
    h.render().find((node) => node.type === 'DayInfoHabitSection').props.habits.length,
    6,
  );
});

test('changing dates waits for date queries and applies only the selected date completion state', () => {
  const h = harness();
  h.results.habits = { data: habits, isPending: false };
  h.results.diary = { data: null, isPending: false };
  h.results.completions = { data: [], isPending: true };
  assert(h.render('2026-10-04').some((node) => node.type === 'ActivityIndicator'));
  h.results.completions = {
    data: [
      { habit_id: 1, date: '2026-10-04' },
      { habit_id: 2, date: '2026-10-05' },
    ],
    isPending: false,
  };
  const section = h.render('2026-10-04').find((node) => node.type === 'DayInfoHabitSection');
  assert.equal(section.props.habits.length, 6);
  assert.equal(section.props.habits.find((habit: any) => habit.id === 1).completed, true);
  assert.equal(section.props.habits.find((habit: any) => habit.id === 2).completed, false);
});

test('day query failure shows the common error and retries all day queries before displaying records', () => {
  const h = harness();
  const retried: string[] = [];
  for (const kind of ['diary', 'habits', 'completions']) {
    h.results[kind] = {
      isError: kind === 'completions',
      isPending: false,
      data: kind === 'habits' ? habits : null,
      refetch: () => retried.push(kind),
    };
  }
  const tree = h.render();
  assert(!tree.some((node) => node.type === 'DayInfoHabitSection'));
  const error = tree.find((node) => node.type === 'QueryError');
  assert.equal(error.props.message, '기록을 불러오지 못했어요.');
  error.props.onRetry();
  assert.deepEqual(retried, ['diary', 'habits', 'completions']);
  h.results.diary.data = null;
  h.results.completions = { data: [], isPending: false, isError: false };
  assert(h.render().some((node) => node.type === 'DayInfoHabitSection'));
});
