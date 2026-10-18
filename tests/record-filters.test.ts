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
  return [
    tree,
    ...nodes(tree.props?.children),
    ...nodes(tree.props?.ListHeaderComponent),
    ...nodes(tree.props?.ListFooterComponent),
  ];
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
          if (name.endsWith('theme/classes')) return require('../src/theme/classes');
          if (name.endsWith('theme/colors')) return require('../src/theme/colors');
          if (name.endsWith('domain/selection')) return require('../src/domain/selection');
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
              Pressable: 'Pressable',
              Switch: 'Switch',
              ScrollView: 'ScrollView',
              FlatList: 'FlatList',
            };
          if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
          if (name.endsWith('/domain/constants')) return require('../src/domain/constants');
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
            return { useAppTheme: () => ({ colors: {}, rem: 15, iconSizes: { sm: 13.125 } }) };
          if (name.endsWith('/db/habit')) return { sortHabits };
          if (name.endsWith('/db/sober')) return { sortSobers };
          if (name.endsWith('/domain/date')) return require('../src/domain/date');
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
  applyPageFilter(ui, 'Habit', { completedOnly: false, priorities: [1] });
  assert.deepEqual(habitIds(ui), [3, 2]);
  const progress = nodes(ui.render()).find((node) => node.type === 'HabitTodayProgress');
  assert.equal(progress.props.habits.length, 3);
  assert.equal(progress.props.records, results.completions.data);
  results.completions.data.push({ habit_id: 2, date: today });
  assert.deepEqual(habitIds(ui), [3, 2]);
  applyPageFilter(ui, 'Habit', { completedOnly: true, priorities: [1] });
  assert.deepEqual(habitIds(ui), [2]);
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'ToolbarFilterButton').props.label,
    '완료 · ★★',
  );
  applyPageFilter(ui, 'Habit', { completedOnly: true, priorities: [2] });
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
        ? { completedOnly: true, priorities: [] }
        : { priorityOnly: true, minimumDays: 30 },
    );
    nodes(ui.render())
      .find((node) => node.type === 'ToolbarAddButton')
      .props.onPress();
    assert.equal(ui.routes.length, 0);
    assert.equal(ui.notices.length, 1);
  }
});


test('habit grid pins total progress first and pads rows after including the summary', () => {
  for (const count of [1, 2, 3, 4]) {
    const results = {
      habits: { data: Array.from({ length: count }, (_, index) => habit(index + 1, 0)) },
      completions: { data: [{ habit_id: 1, date: today }] },
    };
    const ui = harness('app/(tabs)/habit.tsx', results);
    const tree = ui.render();
    const grid = nodes(tree).find((node) => node.props.className === 'flex-row flex-wrap');
    const cells = grid.props.children;
    assert.equal(cells.length, Math.ceil((count + 2) / 2) * 2);
    assert.equal(cells[0].props.children.type, 'HabitTodayProgress');
    assert.equal(cells[0].props.children.props.habits.length, count);
    assert.equal(nodes(tree).filter((node) => node.type === 'HabitTodayProgress').length, 1);
    assert.equal(nodes(tree).filter((node) => node.type === 'HabitBox').length, count);
    assert.equal(cells.at(-1).props.children === null, count % 2 === 1);
    const add = nodes(tree).find(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === '습관 추가',
    );
    assert(add);
    assert.equal(
      nodes(add)
        .find((node) => node.type === 'Text')
        .props.children.join(''),
      `(${count}/${MAX_HABIT_COUNT})`,
    );
    assert.equal(cells[count + 1].props.children, add);
    add.props.onPress();
    assert.equal(ui.routes[0], '/habit/new');
    for (const [index, cell] of cells.entries()) {
      assert(cell.props.className.includes(index < cells.length - 2 ? 'border-b ' : 'border-b-0'));
      assert(cell.props.className.includes(index % 2 === 0 ? 'border-r' : 'border-r-0'));
    }
    applyPageFilter(ui, 'Habit', { completedOnly: true, priorities: [2] });
    const filtered = ui.render();
    assert.equal(nodes(filtered).filter((node) => node.type === 'HabitBox').length, 0);
    const summary = nodes(filtered).find((node) => node.type === 'HabitTodayProgress');
    assert.equal(summary.props.habits.length, count);
    assert.equal(summary.props.records, results.completions.data);
    const filteredAdd = nodes(filtered).find(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === '습관 추가',
    );
    assert.equal(
      nodes(filteredAdd)
        .find((node) => node.type === 'Text')
        .props.children.join(''),
      `(${count}/${MAX_HABIT_COUNT})`,
    );
    assert.equal(
      nodes(filtered).find((node) => node.type === 'EmptyState').props.title,
      '선택한 조건의 습관이 없어요.',
    );
  }
  const empty = harness('app/(tabs)/habit.tsx', {
    habits: { data: [] },
    completions: { data: [] },
  }).render();
  assert(!nodes(empty).some((node) => node.type === 'HabitTodayProgress'));
  assert.equal(
    nodes(empty).find((node) => node.type === 'EmptyState').props.title,
    '아직 만든 습관이 없어요.',
  );
  const loading = harness('app/(tabs)/habit.tsx', {
    habits: { data: undefined },
    completions: { data: undefined },
  }).render();
  assert(nodes(loading).some((node) => node.type === 'HabitListSkeleton'));
  assert(!nodes(loading).some((node) => node.type === 'HabitTodayProgress'));
});


test('habit grid hides add at the total limit even when filters hide habits', () => {
  const results = {
    habits: { data: Array.from({ length: MAX_HABIT_COUNT }, (_, index) => habit(index + 1, 0)) },
    completions: { data: [], isError: false },
  };
  const ui = harness('app/(tabs)/habit.tsx', results);
  const addButton = (tree: any) =>
    nodes(tree).find(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === '습관 추가',
    );
  assert(!addButton(ui.render()));
  applyPageFilter(ui, 'Habit', { completedOnly: true, priorities: [] });
  assert(!addButton(ui.render()));
  results.habits.data.pop();
  const available = addButton(ui.render());
  assert(available);
  assert.equal(available.props.disabled, false);
  results.completions.isError = true;
  const failed = addButton(ui.render());
  assert.equal(failed.props.disabled, true);
  failed.props.onPress();
  assert.equal(ui.routes.length, 0);
  const emptyUi = harness('app/(tabs)/habit.tsx', {
    habits: { data: [] },
    completions: { data: [] },
  });
  assert(!addButton(emptyUi.render()));
  const loading = harness('app/(tabs)/habit.tsx', {
    habits: { data: undefined },
    completions: { data: undefined },
  });
  assert(!addButton(loading.render()));
});


test('habit summary shows average completion without created capacity', () => {
  const ui = harness('src/screens/habit/HabitTodayProgress.tsx');
  const tree = ui.render({ total: 8, done: 6, today, habits: [], records: [] });
  const labels = nodes(tree)
    .filter((node) => node.type === 'Text')
    .map((node) =>
      Array.isArray(node.props.children) ? node.props.children.join('') : node.props.children,
    );
  assert(!labels.some((label) => String(label).includes('생성')));
  assert(labels.includes('습관 흐름'));
  assert(labels.includes('최근 4일'));
  assert(labels.includes('평균 완료율 0%'));
  assert(!nodes(tree).some((node) => node.type === 'ProgressBar'));
});


test('four-day summary uses eligible habits, newest-first dates and live completion changes', () => {
  const ui = harness('src/screens/habit/HabitTodayProgress.tsx');
  const props = {
    total: 2,
    done: 2,
    today,
    habits: [
      { id: 1, initial_started_at: '2026-10-12T00:00:00' },
      { id: 2, initial_started_at: '2026-10-14T00:00:00' },
    ],
    records: [
      { habit_id: 1, date: today },
      { habit_id: 2, date: today },
      { habit_id: 1, date: '2026-10-12' },
      { habit_id: 1, date: '2026-10-12' },
      { habit_id: 2, date: '2026-10-12' },
      { habit_id: 99, date: '2026-10-12' },
    ],
  };
  assert(nodes(ui.render(props)).some((node) => node.props.children === '평균 완료율 67%'));
  const bars = nodes(ui.render(props)).filter((node) => node.props.accessibilityRole === 'image');
  assert.equal(bars.length, 4);
  for (const [index, bar] of bars.entries()) {
    assert(bar.props.accessibilityLabel.startsWith(shiftDate(today, -index)));
  }
  assert.deepEqual(
    bars.map((bar) => bar.props.children[0].props.children),
    ['오늘', '화', '월', '일'],
  );
  assert.match(bars[0].props.accessibilityLabel, /오늘, 2개 중 2개 완료, 100%/);
  assert.match(bars[1].props.accessibilityLabel, /1개 중 0개 완료, 0%/);
  assert.match(bars[2].props.accessibilityLabel, /1개 중 1개 완료, 100%/);
  assert.match(bars[3].props.accessibilityLabel, /시작한 습관 없음/);
  props.records.splice(1, 1);
  assert(nodes(ui.render(props)).some((node) => node.props.children === '평균 완료율 50%'));
  const updated = nodes(ui.render({ ...props, done: 1 })).filter(
    (node) => node.props.accessibilityRole === 'image',
  );
  assert.match(updated[0].props.accessibilityLabel, /2개 중 1개 완료, 50%/);
  assert.equal(updated[0].props.children[1].props.children.props.style.height, '50%');
});


test('habit boxes label the first day today and retain weekday labels and completion actions', () => {
  const ui = harness('src/screens/habit/HabitBox.tsx');
  const toggles: unknown[] = [];
  const tree = ui.render({
    habit: { ...habit(1, 0), icon_color: 'sky' },
    today,
    records: [],
    disabled: false,
    onToggle: (...args: unknown[]) => toggles.push(args),
  });
  const days = nodes(tree).filter((node) => node.props.accessibilityRole === 'checkbox');
  assert.deepEqual(
    days.map((node) => node.props.children[0].props.children),
    ['오늘', '화', '월', '일'],
  );
  days[0].props.onPress();
  assert.deepEqual(toggles, [[1, today, true]]);
});


test('habit multi-priority filters combine with completed-only and select-all restores all priorities', () => {
  const ui = harness('app/(tabs)/habit.tsx', {
    habits: { data: [habit(1, 0), habit(2, 1), habit(3, 2)] },
    completions: {
      data: [
        { habit_id: 1, date: today },
        { habit_id: 3, date: today },
      ],
    },
  });
  applyPageFilter(ui, 'Habit', { completedOnly: false, priorities: [2, 0] });
  assert.deepEqual(habitIds(ui), [3, 1]);
  applyPageFilter(ui, 'Habit', { completedOnly: true, priorities: [1, 2] });
  assert.deepEqual(habitIds(ui), [3]);
  applyPageFilter(ui, 'Habit', { completedOnly: false, priorities: [2, 1, 0] });
  assert.deepEqual(habitIds(ui), [3, 2, 1]);
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'ToolbarFilterButton').props.label,
    '필터',
  );
});
