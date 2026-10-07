import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import type { Habit, Sober, SoberRestart } from '../src/db/types';
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
        if (dependency.endsWith('hooks/useCurrentMinute'))
          return { useCurrentMinute: () => Date.parse('2024-01-11T00:00:00Z') };
        if (dependency.endsWith('/UnderlineTab')) return { UnderlineTab: 'UnderlineTab' };
        if (dependency.endsWith('/AnalysisHeader')) return { AnalysisHeader: 'AnalysisHeader' };
        if (dependency.endsWith('/HabitMonthCalendar'))
          return { HabitMonthCalendar: 'HabitMonthCalendar' };
        if (dependency.endsWith('/CalendarGrid')) return { CalendarGrid: 'CalendarGrid' };
        if (dependency.endsWith('domain/calendar')) return localRequire(dependency);
        if (dependency.endsWith('/CalendarMonthHeader'))
          return { CalendarMonthHeader: 'CalendarMonthHeader' };
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

const records: SoberStreak[] = Array.from({ length: 25 }, (_, index) => ({
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

test('sober analysis ranks individual past and current streaks across items', () => {
  const start = '2024-01-01T00:00:00Z';
  const sober: Sober = {
    id: 1,
    name: '커피',
    description: null,
    icon_key: 'coffee',
    icon_color: 'theme',
    is_priority: 0,
    initial_started_at: start,
    goal_mode: 'AUTO',
    goal_days: null,
    created_at: start,
    updated_at: start,
  };
  const restarts: SoberRestart[] = [8, 4].map((day, index) => ({
    id: index + 1,
    sober_id: 1,
    restarted_at: `2024-01-${String(day).padStart(2, '0')}T00:00:00Z`,
    memo: null,
    created_at: start,
    updated_at: start,
  }));
  const ui = section('src/screens/home/SoberAnalysis.tsx', 'SoberAnalysis', {
    sobers: [sober, { ...sober, id: 2, name: '야식', initial_started_at: '2024-01-09T00:00:00Z' }],
    restarts,
  });
  const durations = (nodes: any[]) =>
    nodes
      .filter((node) => node.type === 'Text' && /^\d+일 \d+시간 \d+분$/.test(node.props.children))
      .map((node) => node.props.children);
  const longest = ui.render();
  assert.deepEqual(durations(longest.nodes), ['4일 0시간 0분', '3일 0시간 0분', '3일 0시간 0분']);
  assert.equal(
    longest.nodes.filter((node) => node.type === 'Text' && node.props.children === '커피').length,
    3,
  );
  const header = longest.nodes.find((node) => node.type === 'AnalysisHeader');
  assert.equal(header.props.children.join(''), '전체 거리두기 항목 2개');
  const timeRows = longest.nodes
    .filter((node) => node.type === 'Text' && Array.isArray(node.props.children))
    .map((node) => node.props.children.join(''));
  assert.equal(timeRows.filter((text) => text.startsWith('시작 시간 : ')).length, 3);
  assert.equal(timeRows.filter((text) => text.startsWith('종료 시간 : ')).length, 3);
  assert(
    longest.nodes.some(
      (node) =>
        node.type === 'Text' &&
        node.props.children === '진행 중' &&
        node.props.className === 'text-sm text-theme-accent',
    ),
  );
  longest.nodes
    .find((node) => node.type === 'UnderlineTab' && node.props.children === '짧게 유지한 순')
    .props.onPress();
  const shortest = ui.render();
  assert.deepEqual(durations(shortest.nodes), ['2일 0시간 0분', '3일 0시간 0분', '3일 0시간 0분']);
  assert.equal(
    shortest.nodes.filter(
      (node) =>
        node.type === 'Text' &&
        Array.isArray(node.props.children) &&
        node.props.children[0] === '종료 시간 :' &&
        node.props.children.some(
          (child: any) =>
            child?.props?.children === '진행 중' &&
            child.props.className === 'text-sm text-theme-accent',
        ),
    ).length,
    2,
  );
  const empty = ui.render({ sobers: [], restarts: [] });
  assert(
    empty.nodes.some(
      (node) => node.type === 'Text' && node.props.children === '아직 거리두기 기록이 없어요.',
    ),
  );
});

test('long records show five rows when collapsed and at most twenty when expanded', () => {
  const ui = section('src/screens/sober/SoberLongRecords.tsx', 'SoberLongRecords', { records });
  const collapsed = ui.render();
  assert.equal(rows(collapsed.nodes).length, 5);
  assert(!collapsed.nodes.some((node) => node.props.onLayout));
  expandButton(collapsed.nodes).props.onPress();
  const expanded = ui.render();
  assert.deepEqual(
    rows(expanded.nodes).map((node) => node.key),
    records.slice(0, 20).map((item) => `${item.start}:${item.end}`),
  );
  assert.equal(expandButton(expanded.nodes).props.accessibilityState.expanded, true);
  expandButton(expanded.nodes).props.onPress();
  assert.equal(rows(ui.render().nodes).length, 5);
});

test('ranked records keep the heading and description without an empty message or toggle', () => {
  const ui = section('src/screens/sober/SoberLongRecords.tsx', 'SoberLongRecords', { records: [] });
  const empty = ui.render();
  for (const text of ['거리두기 기록', '오래 유지한 순으로 최대 20개의 기록을 보여드려요.']) {
    assert(empty.nodes.some((node) => node.type === 'Text' && node.props.children === text));
  }
  assert.equal(rows(empty.nodes).length, 0);
  assert(
    !empty.nodes.some(
      (node) => node.type === 'Text' && String(node.props.children).includes('없어요'),
    ),
  );
  assert.equal(expandButton(empty.nodes), undefined);
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

test('day habits retain the recent-four-day lock and empty state for dates without habits', () => {
  const ui = section('src/screens/calendar/DayInfoHabitSection.tsx', 'DayInfoHabitSection', {
    habits,
    date: '2024-03-06',
    today: '2024-03-10',
    pendingId: null,
    onToggle: () => undefined,
  });
  const locked = ui.render();
  const lockedCheckboxes = locked.nodes.filter(
    (node) => node.props.accessibilityRole === 'checkbox',
  );
  assert.equal(lockedCheckboxes.length, 5);
  assert(
    lockedCheckboxes.every(
      (node) => node.props.disabled && node.props.className.includes('opacity-60'),
    ),
  );
  assert.deepEqual(
    lockedCheckboxes.map((node) => node.props.accessibilityState.checked),
    [true, true, true, true, false],
  );
  const lockMessage = '습관 체크는 오늘부터 3일 전까지 변경할 수 있어요.';
  assert(locked.nodes.some((node) => node.props.children === lockMessage));
  assert(
    locked.nodes
      .filter((node) => node.props.accessibilityLabel?.endsWith('습관 정보 보기'))
      .every((node) => !node.props.disabled && !node.props.className.includes('opacity-60')),
  );
  const editable = ui.render({ date: '2024-03-07' });
  assert(
    editable.nodes
      .filter((node) => node.props.accessibilityRole === 'checkbox')
      .every((node) => !node.props.disabled && node.props.className.includes('opacity-100')),
  );
  assert(!editable.nodes.some((node) => node.props.children === lockMessage));
  const empty = ui.render({ date: '2024-03-06', habits: [] });
  assert.equal(empty.nodes.filter((node) => node.props.accessibilityRole === 'checkbox').length, 0);
  assert.equal(expandButton(empty.nodes), undefined);
  assert(!empty.nodes.some((node) => node.props.children === lockMessage));
  assert(empty.nodes.some((node) => node.props.children === '이날은 등록된 습관 항목이 없어요.'));
  assert(
    !empty.nodes.some((node) => node.type === 'AppIcon' && node.props.name === 'lock-outline'),
  );
  const recentEmpty = ui.render({ date: '2024-03-10', habits: [] });
  assert(
    recentEmpty.nodes.some((node) => node.props.children === '이날은 등록된 습관 항목이 없어요.'),
  );
  assert(
    !recentEmpty.nodes.some(
      (node) =>
        node.type === 'Text' &&
        Array.isArray(node.props.children) &&
        node.props.children.includes(' 완료'),
    ),
  );
  const unchecked = ui.render({ habits: habits.map((habit) => ({ ...habit, completed: false })) });
  assert.equal(
    unchecked.nodes.filter((node) => node.props.accessibilityRole === 'checkbox').length,
    5,
  );
  assert(
    unchecked.nodes.some(
      (node) => JSON.stringify(node.props.children) === JSON.stringify([0, '/', 6, ' 완료']),
    ),
  );
  assert(
    !unchecked.nodes.some(
      (node) =>
        typeof node.props.children === 'string' && node.props.children.includes('습관이 없어요'),
    ),
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
    .nodes.find((node) => node.type === 'HabitMonthCalendar')
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
  const calendar = ui.render().nodes.find((node) => node.type === 'HabitMonthCalendar');
  const monthUi = section(
    'src/screens/habit/HabitMonthCalendar.tsx',
    'HabitMonthCalendar',
    calendar.props,
  );
  const dayProps = (nodes: any[], date: string) =>
    nodes.find((node) => node.type === 'CalendarDay' && node.props.date === date).props;
  const dateCell = section('src/screens/calendar/CalendarDay.tsx', 'CalendarDay', {});
  const press = (props: Record<string, unknown>) => dateCell.render(props).result.props.onPress();
  const currentNodes = monthUi.render().nodes;
  const current = dayProps(currentNodes, '2024-03-10');
  assert.equal(current.disabled, false);
  const locked = dayProps(currentNodes, '2024-03-06');
  assert.equal(locked.disabled, true);
  press(locked);
  assert.deepEqual(toggles, []);
  press(current);
  assert.deepEqual(toggles, [['2024-03-10', true]]);
  const updatedProps = ui
    .render({ dates: ['2024-03-10'] })
    .nodes.find((node) => node.type === 'HabitMonthCalendar').props;
  const checked = dayProps(monthUi.render(updatedProps).nodes, '2024-03-10');
  press(checked);
  assert.deepEqual(toggles[1], ['2024-03-10', false]);
  assert.equal(checked.label, '2024-03-10, 완료 기록 있음');
  const future = dayProps(monthUi.render().nodes, '2024-03-11');
  press(future);
  assert.equal(future.disabled, true);
  assert.equal(toggles.length, 2);
  const busy = dayProps(monthUi.render({ disabled: true }).nodes, '2024-03-10');
  press(busy);
  assert.equal(toggles.length, 2);
  assert.deepEqual(ui.calls, { month: 2, year: 2, calendar: 0 });
  ui.render({ today: '2024-03-11' });
  assert.deepEqual(ui.calls, { month: 3, year: 2, calendar: 0 });
});
