import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import type { Habit } from '../src/db/types';
import type { SoberStreak } from '../src/domain/sober';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Render actual section components with persistent hooks; native views remain inert test nodes.
function section(path: string, name: string, initialProps: Record<string, unknown>) {
  const localRequire = createRequire(new URL(`../${path}`, import.meta.url));
  const exports: Record<string, Function> = {};
  const slots: any[] = [];
  const calls = { month: 0, year: 0, calendar: 0 };
  let cursor = 0;
  let nodes: any[] = [];
  let props = initialProps;
  const jsx = (type: unknown, props: any, key?: string) => {
    const node = { type, props, key };
    nodes.push(node);
    return node;
  };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency === 'react')
          return {
            useState: (initial: unknown) => {
              const index = cursor++;
              slots[index] ??= { value: initial };
              return [
                slots[index].value,
                (value: unknown) => {
                  slots[index].value = value;
                },
              ];
            },
            useMemo: (factory: () => unknown, deps: unknown[]) => {
              const index = cursor++;
              const previous = slots[index];
              if (!previous || deps.some((value, i) => !Object.is(previous.deps[i], value)))
                slots[index] = { value: factory(), deps };
              return slots[index].value;
            },
          };
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react-native') return { View: 'View', Pressable: 'Pressable' };
        if (dependency.endsWith('hooks/useMonthSwipe'))
          return {
            useMonthSwipe: (month: string, onChange: (month: string) => void) => ({
              changeMonth: (amount: number) =>
                onChange(localRequire('../../domain/date').shiftMonth(month, amount)),
              panHandlers: {},
            }),
          };
        if (dependency === 'expo-router') return { useRouter: () => ({ push: () => undefined }) };
        if (dependency.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, rem: 15, iconSizes: {} }) };
        if (dependency.endsWith('/MonthCalendar')) return { MonthCalendar: 'MonthCalendar' };
        if (dependency.endsWith('/CalendarDay')) return { CalendarDay: 'CalendarDay' };
        if (dependency.includes('/components/')) return { Text: 'Text', AppIcon: 'AppIcon' };
        if (dependency.endsWith('domain/habitStats')) {
          const domain = localRequire(dependency);
          return {
            ...domain,
            getHabitMonthSummary: (...args: unknown[]) => {
              calls.month++;
              return domain.getHabitMonthSummary(...args);
            },
            getHabitYearSummary: (...args: unknown[]) => {
              calls.year++;
              return domain.getHabitYearSummary(...args);
            },
          };
        }
        if (dependency === 'date-fns') {
          const date = localRequire(dependency);
          return {
            ...date,
            eachDayOfInterval: (...args: unknown[]) => {
              calls.calendar++;
              return date.eachDayOfInterval(...args);
            },
          };
        }
        return localRequire(dependency);
      },
    },
  );
  return {
    calls,
    render: (patch: Record<string, unknown> = {}) => {
      props = { ...props, ...patch };
      nodes = [];
      cursor = 0;
      const result = exports[name](props);
      return { result, nodes };
    },
  };
}

const records: SoberStreak[] = Array.from({ length: 8 }, (_, index) => ({
  start: `2024-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
  end: `2024-02-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
  current: false,
  duration: (index + 3) * 86400000,
}));
const habit: Habit = {
  id: 1,
  name: '걷기',
  priority: 1,
  icon_key: 'walking',
  icon_color: 'theme',
  created_date: '2024-03-01',
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
};
const habits = Array.from({ length: 6 }, (_, index) => ({
  ...habit,
  id: index + 1,
  name: `습관 ${index + 1}`,
  completed: index < 4,
}));
const rows = (nodes: any[]) =>
  nodes.filter((node) => typeof node.key === 'string' && node.key.startsWith('2024-01-'));
const expandButton = (nodes: any[]) =>
  nodes.find(
    (node) =>
      node.type === 'Pressable' && typeof node.props.accessibilityState?.expanded === 'boolean',
  );

test('long records mount only five rows when collapsed and preserve ordering through expand/collapse', () => {
  const ui = section('src/screens/sober/SoberLongRecords.tsx', 'SoberLongRecords', { records });
  const collapsed = ui.render();
  assert.equal(rows(collapsed.nodes).length, 5);
  assert(!collapsed.nodes.some((node) => node.props.onLayout));
  expandButton(collapsed.nodes).props.onPress();
  const expanded = ui.render();
  assert.deepEqual(
    rows(expanded.nodes).map((node) => node.key),
    records.map((item) => `${item.start}:${item.end}`),
  );
  assert.equal(expandButton(expanded.nodes).props.accessibilityState.expanded, true);
  expandButton(expanded.nodes).props.onPress();
  assert.equal(rows(ui.render().nodes).length, 5);
});

test('long records omit the whole section when empty and the toggle at five rows', () => {
  const ui = section('src/screens/sober/SoberLongRecords.tsx', 'SoberLongRecords', { records: [] });
  assert.equal(ui.render().result, null);
  const exact = ui.render({ records: records.slice(0, 5) });
  assert.equal(rows(exact.nodes).length, 5);
  assert.equal(expandButton(exact.nodes), undefined);
});

test('day habits preview five rows, expand in order and retain totals and completion actions', () => {
  const toggles: unknown[][] = [];
  const ui = section('src/screens/calendar/DayInfoHabitSection.tsx', 'DayInfoHabitSection', {
    habits,
    date: '2024-03-10',
    today: '2024-03-10',
    pendingId: null,
    onToggle: (...args: unknown[]) => toggles.push(args),
  });
  const collapsed = ui.render();
  assert.equal(
    collapsed.nodes.filter((node) => node.props.accessibilityRole === 'checkbox').length,
    5,
  );
  assert.equal(expandButton(collapsed.nodes).props.accessibilityState.expanded, false);
  assert(
    collapsed.nodes.some(
      (node) => JSON.stringify(node.props.children) === JSON.stringify([4, '/', 6, ' 완료']),
    ),
  );
  expandButton(collapsed.nodes).props.onPress();
  const expanded = ui.render();
  const checkboxes = expanded.nodes.filter((node) => node.props.accessibilityRole === 'checkbox');
  assert.equal(checkboxes.length, 6);
  assert.deepEqual(
    expanded.nodes
      .filter((node) => node.type === 'Text' && /^습관 \d$/.test(node.props.children))
      .map((node) => node.props.children),
    habits.map((item) => item.name),
  );
  checkboxes[4].props.onPress();
  assert.deepEqual(toggles, [[5, true]]);
  expandButton(expanded.nodes).props.onPress();
  assert.equal(
    ui.render().nodes.filter((node) => node.props.accessibilityRole === 'checkbox').length,
    5,
  );
  assert.equal(expandButton(ui.render({ habits: habits.slice(0, 5) }).nodes), undefined);
});

test('day habits retain the recent-four-day lock and future empty state', () => {
  const ui = section('src/screens/calendar/DayInfoHabitSection.tsx', 'DayInfoHabitSection', {
    habits,
    date: '2024-03-06',
    today: '2024-03-10',
    pendingId: null,
    onToggle: () => undefined,
  });
  assert(
    ui
      .render()
      .nodes.filter((node) => node.props.accessibilityRole === 'checkbox')
      .every((node) => node.props.disabled),
  );
  const editable = ui.render({ date: '2024-03-07' });
  assert(
    editable.nodes
      .filter((node) => node.props.accessibilityRole === 'checkbox')
      .every((node) => !node.props.disabled),
  );
  const future = ui.render({ date: '2024-03-11' });
  assert.equal(
    future.nodes.filter((node) => node.props.accessibilityRole === 'checkbox').length,
    0,
  );
  assert.equal(expandButton(future.nodes), undefined);
  assert(
    future.nodes.some((node) => node.props.children === '미래 날짜에는 습관을 기록할 수 없어요.'),
  );
});

test('habit statistics reuse calculations for unrelated updates and refresh only the changed period', () => {
  const dates = ['2024-03-07'];
  const ui = section('src/screens/habit/HabitStatistics.tsx', 'HabitStatistics', {
    habit,
    dates,
    today: '2024-03-10',
    disabled: false,
    unavailable: false,
    onToggle: () => undefined,
  });
  ui.render();
  assert.deepEqual(ui.calls, { month: 1, year: 1, calendar: 0 });
  ui.render({ disabled: true });
  assert.deepEqual(ui.calls, { month: 1, year: 1, calendar: 0 });
  ui.render({ disabled: false })
    .nodes.find((node) => node.props.accessibilityLabel === '이전 연도')
    .props.onPress();
  ui.render();
  assert.deepEqual(ui.calls, { month: 1, year: 2, calendar: 0 });
  ui.render()
    .nodes.find((node) => node.type === 'MonthCalendar')
    .props.onMonthChange('2024-02');
  ui.render();
  assert.deepEqual(ui.calls, { month: 2, year: 2, calendar: 0 });
});

test('habit statistics reflect replacement records and the same checkbox toggle direction', () => {
  const toggles: unknown[][] = [];
  const ui = section('src/screens/habit/HabitStatistics.tsx', 'HabitStatistics', {
    habit,
    dates: [],
    today: '2024-03-10',
    disabled: false,
    unavailable: false,
    onToggle: (...args: unknown[]) => toggles.push(args),
  });
  const calendar = ui.render().nodes.find((node) => node.type === 'MonthCalendar');
  assert.equal(calendar.props.canSelect('2024-03-10'), true);
  assert.equal(calendar.props.canSelect('2024-03-06'), false);
  calendar.props.onSelect('2024-03-10');
  assert.deepEqual(toggles, [['2024-03-10', true]]);
  const filled = ui
    .render({ dates: ['2024-03-10'] })
    .nodes.find((node) => node.type === 'MonthCalendar');
  filled.props.onSelect('2024-03-10');
  assert.deepEqual(toggles[1], ['2024-03-10', false]);
  assert.equal(
    filled.props.renderDay({ date: '2024-03-10', outside: false }).props.label,
    '2024-03-10, 완료 기록 있음',
  );
  assert.deepEqual(ui.calls, { month: 2, year: 2, calendar: 0 });
  ui.render({ today: '2024-03-11' });
  assert.deepEqual(ui.calls, { month: 3, year: 2, calendar: 0 });
});
