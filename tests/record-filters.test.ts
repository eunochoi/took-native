import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS } from '../src/settings/model';
import { sortHabits } from '../src/db/habit';
import { sortSobers } from '../src/db/sober';
import { getCurrentSoberStart, SOBER_DAY_MS } from '../src/domain/sober';
import { MAX_HABIT_COUNT, MAX_SOBER_COUNT } from '../src/domain/limits';
import { shiftDate } from '../src/domain/date';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const now = Date.parse('2026-10-14T12:00:00.000Z');
const today = '2026-10-14';
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.ListHeaderComponent)];
}
function harness(file: string, results: Record<string, any> = {}) {
  const state: any[] = [];
  let cursor = 0;
  const routes: unknown[] = [];
  const notices: any[] = [];
  const loaded = new Map<string, any>();
  const evaluate = (path: string): any => {
    if (loaded.has(path)) return loaded.get(path);
    const exports: any = {};
    loaded.set(path, exports);
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      {
        exports,
        require: (name: string) => {
          if (name === 'react/jsx-runtime')
            return {
              jsx: (type: any, props: any) => ({ type, props }),
              jsxs: (type: any, props: any) => ({ type, props }),
              Fragment: 'Fragment',
            };
          if (name === 'react')
            return {
              useState: (initial: any) => {
                const index = cursor++;
                if (!(index in state))
                  state[index] = typeof initial === 'function' ? initial() : initial;
                return [
                  state[index],
                  (value: any) => {
                    state[index] = typeof value === 'function' ? value(state[index]) : value;
                  },
                ];
              },
              useRef: (value: any) => ({ current: value }),
              useEffect: () => {},
              useMemo: (factory: any) => factory(),
            };
          if (name === 'react-native')
            return {
              View: 'View',
              Switch: 'Switch',
              ScrollView: 'ScrollView',
              FlatList: 'FlatList',
            };
          if (name === 'expo-router') return { useScrollToTop: () => {} };
          if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
          if (name === '@tanstack/react-query')
            return { useQuery: ({ kind }: any) => results[kind] ?? { data: [], isError: false } };
          if (name.endsWith('/queries'))
            return {
              habitQueries: {
                list: () => ({ kind: 'habits' }),
                completions: () => ({ kind: 'completions' }),
              },
              soberQueries: {
                list: () => ({ kind: 'sobers' }),
                restarts: () => ({ kind: 'restarts' }),
              },
              useToday: () => today,
              useRecordMutation: () => ({ mutateAsync: async () => {} }),
            };
          if (name.endsWith('/HabitFilterPicker'))
            return evaluate('src/screens/habit/HabitFilterPicker.tsx');
          if (name.endsWith('/SoberFilterPicker'))
            return evaluate('src/screens/sober/SoberFilterPicker.tsx');
          if (name.endsWith('/SettingsProvider'))
            return {
              useSettings: () => ({ settings: DEFAULT_SETTINGS, updateSettings: async () => {} }),
            };
          if (name.endsWith('/ModalNavigationProvider'))
            return {
              useModalNavigation: () => ({ openModal: (route: unknown) => routes.push(route) }),
            };
          if (name.endsWith('/NoticeProvider'))
            return { useNotice: () => ({ showNotice: (notice: any) => notices.push(notice) }) };
          if (name.endsWith('/AppThemeProvider'))
            return { useAppTheme: () => ({ colors: {}, rem: 15 }) };
          if (name.endsWith('/db/habit')) return { sortHabits };
          if (name.endsWith('/db/sober')) return { sortSobers };
          if (name.endsWith('/domain/date')) return { shiftDate };
          if (name.endsWith('/domain/sober')) return { getCurrentSoberStart, SOBER_DAY_MS };
          if (name.endsWith('/domain/limits')) return { MAX_HABIT_COUNT, MAX_SOBER_COUNT };
          if (name.endsWith('/useCurrentMinute')) return { useCurrentMinute: () => now };
          if (name.endsWith('/useScrollFade')) return { useScrollFade: () => ({}) };
          const component = name.split('/').at(-1)!;
          return { [component]: component };
        },
      },
    );
    return exports;
  };
  const exports = evaluate(file);
  return {
    routes,
    notices,
    render: (props?: any) => {
      cursor = 0;
      return Object.values(exports).find((value) => typeof value === 'function')!(props);
    },
  };
}
const habit = (id: number, priority: number) => ({
  id,
  priority,
  name: `습관 ${id}`,
  initial_started_at: '2026-10-01T00:00:00.000Z',
  created_at: `2026-10-0${id}T00:00:00.000Z`,
});
const sober = (id: number, days: number, is_priority = 0) => ({
  id,
  is_priority,
  name: `거리두기 ${id}`,
  initial_started_at: new Date(now - days * SOBER_DAY_MS).toISOString(),
  created_at: '2026-10-01T00:00:00.000Z',
});
function applyPageFilter(ui: ReturnType<typeof harness>, kind: 'Habit' | 'Sober', filter: any) {
  nodes(ui.render())
    .find((node) => node.type === 'ToolbarFilterButton')
    .props.onPress();
  const picker = nodes(ui.render()).find(
    (node) => typeof node.type === 'function' && node.type.name === `${kind}FilterPicker`,
  );
  assert(picker);
  picker.props.onApply(filter);
}
function habitIds(ui: ReturnType<typeof harness>) {
  return nodes(ui.render())
    .filter((node) => node.type === 'HabitBox')
    .map((node) => node.props.habit.id);
}
function soberRows(ui: ReturnType<typeof harness>) {
  return nodes(ui.render()).find((node) => node.type === 'FlatList');
}

test('habit filters combine exact stars with today completion and retain total progress', () => {
  const results = {
    habits: { data: [habit(1, 0), habit(2, 1), habit(3, 1)], isError: false },
    completions: {
      data: [
        { habit_id: 1, date: today },
        { habit_id: 2, date: shiftDate(today, -1) },
      ],
      isError: false,
    },
  };
  const ui = harness('app/(tabs)/habit.tsx', results);
  assert.deepEqual(habitIds(ui), [3, 2, 1]);
  applyPageFilter(ui, 'Habit', { completion: 'UNDONE', priority: 1 });
  assert.deepEqual(habitIds(ui), [3, 2]);
  const progress = nodes(ui.render()).find((node) => node.type === 'HabitTodayProgress');
  assert.equal(progress.props.total, 3);
  assert.equal(progress.props.done, 1);
  results.completions.data.push({ habit_id: 2, date: today });
  assert.deepEqual(habitIds(ui), [3]);
  applyPageFilter(ui, 'Habit', { completion: 'DONE', priority: 1 });
  assert.deepEqual(habitIds(ui), [2]);
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'ToolbarFilterButton').props.label,
    '완료 · ★★',
  );
  applyPageFilter(ui, 'Habit', { completion: 'DONE', priority: 2 });
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'EmptyState').props.title,
    '선택한 조건의 습관이 없어요.',
  );
});

test('sober period thresholds are inclusive exact durations and honor restarts and importance', () => {
  const results = {
    sobers: {
      data: [sober(1, 30, 1), sober(2, 14), sober(3, 7, 1), sober(4, 3), sober(5, 3 - 1 / 1440)],
      isError: false,
    },
    restarts: { data: [] as any[], isError: false },
  };
  const ui = harness('app/(tabs)/sober.tsx', results);
  for (const [days, ids] of [
    [3, [1, 2, 3, 4]],
    [7, [1, 2, 3]],
    [14, [1, 2]],
    [30, [1]],
  ] as const) {
    applyPageFilter(ui, 'Sober', { priorityOnly: false, minimumDays: days });
    assert.deepEqual(
      Array.from(soberRows(ui).props.data, (row: any) => row.sober.id),
      ids,
    );
  }
  applyPageFilter(ui, 'Sober', { priorityOnly: true, minimumDays: 7 });
  assert.deepEqual(
    Array.from(soberRows(ui).props.data, (row: any) => row.sober.id),
    [1, 3],
  );
  results.restarts.data.push({
    id: 1,
    sober_id: 1,
    restarted_at: new Date(now - SOBER_DAY_MS).toISOString(),
  });
  assert.deepEqual(
    Array.from(soberRows(ui).props.data, (row: any) => row.sober.id),
    [3],
  );
  applyPageFilter(ui, 'Sober', { priorityOnly: true, minimumDays: 30 });
  const list = soberRows(ui);
  const empty = nodes(list.props.renderItem({ item: list.props.data[0], index: 0 })).find(
    (node) => node.type === 'EmptyState',
  );
  assert.equal(empty.props.title, '선택한 조건의 거리두기가 없어요.');
});

test('filtered empty lists cannot bypass full habit or sober add limits', () => {
  for (const [kind, maximum, data] of [
    ['habit', MAX_HABIT_COUNT, 'habits'],
    ['sober', MAX_SOBER_COUNT, 'sobers'],
  ] as const) {
    const ui = harness(`app/(tabs)/${kind}.tsx`, {
      [data]: {
        data: Array.from({ length: maximum }, (_, i) =>
          kind === 'habit' ? { ...habit(1, 0), id: i + 1 } : sober(i + 1, 1),
        ),
        isError: false,
      },
    });
    applyPageFilter(
      ui,
      kind === 'habit' ? 'Habit' : 'Sober',
      kind === 'habit'
        ? { completion: 'DONE', priority: null }
        : { priorityOnly: true, minimumDays: 30 },
    );
    nodes(ui.render())
      .find((node) => node.type === 'ToolbarAddButton')
      .props.onPress();
    assert.equal(ui.routes.length, 0);
    assert.equal(ui.notices.length, 1);
  }
});
