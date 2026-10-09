import { useCalendarNavigation } from './helpers/calendar-navigation';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { calendarDays } from '../src/domain/calendar';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
function evaluate(
  source: string,
  globals: Record<string, any> = {},
  mocks: Record<string, any> = {},
) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      ...globals,
      require: (name: string) => {
        if (name in mocks) return mocks[name];
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react') return { useMemo: (factory: Function) => factory() };
        if (name === 'react-native') return { Pressable: 'Pressable', View: 'View' };
        if (name === 'date-fns' || name === 'tailwind-merge') return require(name);
        if (name.endsWith('domain/calendar')) return require('../src/domain/calendar');
        if (name.endsWith('useCalendarNavigation')) return { useCalendarNavigation };
        if (name.endsWith('domain/date')) return require('../src/domain/date');
        if (name.endsWith('domain/constants')) return require('../src/domain/constants');
        if (name.endsWith('hooks/useMonthSwipe'))
          return { useMonthSwipe: () => ({ panHandlers: {} }) };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return exports;
}
function load(file: string, mocks: Record<string, any> = {}) {
  return evaluate(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {}, mocks);
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const { CalendarDay } = load('src/screens/calendar/CalendarDay.tsx');
const cell = (tree: any, date: string) =>
  nodes(tree).find((node) => node.type === 'CalendarDay' && node.props.date === date);

const day = { date: '2026-10-07', month: '2026-10', today: '2026-10-07', onSelect: () => {} };

test('date cell owns weekday color, outside-month dimming and optional today/selection indicators', () => {
  const tree = CalendarDay({ ...day, selected: day.date });
  assert.equal(tree.props.accessibilityState.selected, true);
  assert.match(tree.props.accessibilityLabel, /오늘/);
  assert.equal(nodes(tree).filter((node) => node.props.className?.includes('h-1.5 w-4')).length, 1);
  assert.match(
    nodes(tree).find((node) => node.type === 'Text').props.className,
    /bg-theme-accent text-theme-text-on-accent w-7 h-7 leading-7 text-center rounded-full/,
  );
  const hidden = CalendarDay({
    ...day,
    selected: day.date,
    showTodayIndicator: false,
    showSelectedIndicator: false,
  });
  assert(!nodes(hidden).some((node) => node.props.className?.includes('h-1.5')));
  assert(!nodes(hidden).some((node) => node.props.className?.includes('bg-theme-accent')));
  for (const [date, color] of [
    ['2026-10-07', 'text-theme-text-secondary'],
    ['2026-10-10', 'text-theme-calendar-saturday'],
    ['2026-10-11', 'text-theme-calendar-sunday'],
  ]) {
    assert.equal(
      nodes(CalendarDay({ ...day, date })).find((node) => node.type === 'Text').props.className,
      `text-xs ${color}`,
    );
  }
  assert.match(CalendarDay({ ...day, date: '2026-09-30' }).props.className, /opacity-30/);
  const locked = CalendarDay({ ...day, disabled: true });
  assert.equal(locked.props.disabled, true);
  assert.match(locked.props.className, /opacity-100/);
  assert.match(CalendarDay({ ...day, dimmed: true }).props.className, /opacity-30/);
});

test('date cell guards disabled presses and handles adjacent-month navigation without toggling records', () => {
  const selected: string[] = [];
  const months: string[] = [];
  const props = {
    ...day,
    onSelect: (date: string) => selected.push(date),
    onMonthChange: (month: string) => months.push(month),
  };
  CalendarDay({ ...props, disabled: true }).props.onPress();
  CalendarDay({ ...props, date: 'invalid' }).props.onPress();
  assert.deepEqual(selected, []);
  CalendarDay({ ...props, date: '2026-09-30' }).props.onPress();
  assert.deepEqual(months, ['2026-09']);
  assert.deepEqual(selected, []);
  CalendarDay(props).props.onPress();
  assert.deepEqual(selected, [day.date]);
});

test('diary calendar owns decorations and future-date limits while using the default date cell', () => {
  const selected: string[] = [];
  const { DiaryHabitMonthCalendar } = load('src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../queries': {
      diaryQueries: { month: () => 'diary' },
      habitQueries: { completions: () => 'habit' },
    },
    '@tanstack/react-query': {
      useQuery: (kind: string) => ({
        data:
          kind === 'diary'
            ? [{ date: day.date, emotion: 0, created_at: '2026-10-07T00:00:00Z' }]
            : [{ date: day.date }, { date: day.date }, { date: '2026-10-06' }],
      }),
    },
  });
  const tree = DiaryHabitMonthCalendar({
    month: day.month,
    today: day.today,
    selected: day.date,
    fillHeight: true,
    onMonthChange: () => {},
    onSelect: (date: string) => selected.push(date),
  });
  const cells = nodes(tree).filter((node) => node.type === 'CalendarDay');
  assert.equal(cells.length, calendarDays(day.month).length);
  assert(!nodes(tree).some((node) => node.type === 'CalendarFrame'));
  for (const item of cells) {
    assert.equal(item.props.disabled, item.props.date > day.today);
    assert.equal(item.props.dimmed, item.props.date > day.today);
    CalendarDay(item.props).props.onPress();
  }
  assert(selected.includes(day.date));
  assert(selected.every((date) => date <= day.today));
  const content = nodes(cell(tree, day.date));
  assert.equal(content.find((node) => node.type === 'EmotionImage').props.fill, true);
  const badge = content.find((node) => node.type === 'Badge');
  assert.equal(badge.props.children, 2);
  assert.equal(badge.props.className, 'h-auto w-auto py-0.5 px-1.5 absolute -top-1 -right-2');
  assert.equal(
    cell(tree, '2026-10-06').props.children.props.className,
    'items-center justify-center scale-[1.2]',
  );
  assert.equal(cell(tree, '2026-10-05').props.children, undefined);
  assert.equal(cell(tree, '2026-09-30').props.children, undefined);
});

test('habit calendar colors completed and empty history without enabling record changes', () => {
  const { HabitMonthStatistics } = load('src/screens/habit/HabitMonthStatistics.tsx');
  const tree = HabitMonthStatistics({
    habit: { initial_started_at: '2026-09-01T00:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-07',
    dates: ['2026-09-10', '2026-09-12', '2026-09-13'],
    summary: { completed: 3, missed: 27, rate: 10 },
    unavailable: false,
    onMonthChange: () => {},
  });
  for (const date of ['2026-09-10', '2026-09-12', '2026-09-13']) {
    const item = cell(tree, date);
    assert.equal(item.props.children, undefined);
    assert.match(item.props.contentClassName, /bg-theme-accent/);
    const rendered = CalendarDay(item.props);
    assert.equal(rendered.props.disabled, true);
    assert.match(rendered.props.className, /opacity-100/);
    assert.equal(
      nodes(rendered).find((node) => node.type === 'Text').props.className,
      'text-xs font-medium text-theme-text-on-accent',
    );
  }
  for (const [date, color] of [
    ['2026-09-11', 'text-theme-text-secondary'],
    ['2026-09-19', 'text-theme-calendar-saturday'],
    ['2026-09-20', 'text-theme-calendar-sunday'],
  ]) {
    const empty = cell(tree, date);
    assert.match(empty.props.contentClassName, /bg-theme-calendar-empty/);
    assert.equal(
      nodes(CalendarDay(empty.props)).find((node) => node.type === 'Text').props.className,
      `text-xs ${color} font-medium`,
    );
  }
  assert.equal(cell(tree, '2026-08-31').props.children, undefined);
  assert.equal(cell(tree, '2026-08-31').props.dimmed, true);
});

test('habit calendar does not mark missing records as empty while data is unavailable', () => {
  const { HabitMonthStatistics } = load('src/screens/habit/HabitMonthStatistics.tsx');
  const tree = HabitMonthStatistics({
    habit: { initial_started_at: '2026-09-01T00:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-07',
    dates: [],
    summary: { completed: 0, missed: 30, rate: 0 },
    unavailable: true,
    onMonthChange: () => {},
  });
  const past = cell(tree, '2026-09-11');
  assert.equal(past.props.contentClassName, undefined);
  assert.equal(past.props.textClassName, 'font-medium');
  assert(!past.props.label.includes('실천 기록 없음'));
  assert.equal(CalendarDay(past.props).props.disabled, true);
  assert.match(CalendarDay(past.props).props.className, /opacity-100/);
});

test('sober calendar owns restart counts and permits only dates inside its record range', () => {
  const { SoberMonthCalendar } = load('src/screens/sober/SoberMonthCalendar.tsx');
  const selected: string[] = [];
  const tree = SoberMonthCalendar({
    month: day.month,
    today: day.today,
    selected: day.date,
    firstDate: '2026-10-01',
    recordsByDate: new Map([[day.date, [{ id: 1 }, { id: 2 }]]]),
    onMonthChange: () => {},
    onSelect: (date: string) => selected.push(date),
  });
  const recorded = cell(tree, day.date);
  assert.equal(recorded.props.children.props.children.props.children, 2);
  assert.equal(recorded.props.label, `${day.date}, 다시 시작 2회`);
  assert.equal(recorded.props.showSelectedIndicator, false);
  assert.match(recorded.props.children.props.className, /bg-theme-accent/);
  assert.equal(
    recorded.props.children.props.children.props.className,
    'text-xs font-medium text-theme-text-on-accent',
  );
  for (const [date, color] of [
    ['2026-10-06', 'text-theme-text-secondary'],
    ['2026-10-03', 'text-theme-calendar-saturday'],
    ['2026-10-04', 'text-theme-calendar-sunday'],
  ]) {
    const noRestart = cell(tree, date);
    assert.equal(noRestart.props.children, undefined);
    assert.match(noRestart.props.contentClassName, /bg-theme-calendar-empty/);
    const renderedText = nodes(CalendarDay(noRestart.props)).find((node) => node.type === 'Text');
    assert.equal(renderedText.props.children, Number(date.slice(-2)));
    assert.equal(renderedText.props.className, `text-xs ${color} font-medium`);
  }
  assert.equal(cell(tree, '2026-10-08').props.contentClassName, undefined);
  assert.equal(cell(tree, '2026-09-30').props.children, undefined);
  for (const item of nodes(tree).filter((node) => node.type === 'CalendarDay')) {
    CalendarDay(item.props).props.onPress();
  }
  assert(selected.includes(day.date));
  assert(selected.every((date) => date >= '2026-10-01' && date <= day.today));
});

test('date picker owns its min/future range and default selection indicator', () => {
  const { DatePickerCalendar } = load('src/screens/calendar/DatePickerCalendar.tsx');
  const selected: string[] = [];
  const tree = DatePickerCalendar({
    month: day.month,
    today: day.today,
    selected: '2026-10-05',
    minDate: '2026-10-03',
    onMonthChange: () => {},
    onSelect: (date: string) => selected.push(date),
  });
  const header = nodes(tree).find((node) => node.type === 'CalendarHeader');
  assert.equal(header.props.centerTitle, true);
  for (const item of nodes(tree).filter((node) => node.type === 'CalendarDay'))
    CalendarDay(item.props).props.onPress();
  assert.deepEqual(selected, [
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
  ]);
  const rendered = CalendarDay(cell(tree, '2026-10-05').props);
  assert.match(
    nodes(rendered).find((node) => node.type === 'Text').props.className,
    /bg-theme-accent text-theme-text-on-accent w-7 h-7 leading-7 text-center rounded-full/,
  );
});

test('day detail falls back to today for a direct future-date route', () => {
  const source = readFileSync(new URL('../app/calendar/[date].tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile(
    'detail.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let expression: any;
  function visit(node: any) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'selected')
      expression = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert(expression);
  for (const [date, expected] of [
    ['2026-10-08', day.today],
    [day.today, day.today],
    ['2026-10-06', '2026-10-06'],
    ['invalid', day.today],
  ]) {
    assert.equal(
      evaluate(`exports.selected = ${expression.getText(ast)};`, {
        date,
        today: day.today,
        isDate: require('../src/domain/date').isDate,
      }).selected,
      expected,
    );
  }
});

test('habit start and future boundaries block adjacent cells and share guarded month navigation', () => {
  const { HabitMonthStatistics } = load('src/screens/habit/HabitMonthStatistics.tsx');
  const months: string[] = [];
  const props = {
    habit: { initial_started_at: '2026-09-15T12:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-08',
    dates: [],
    summary: { completed: 0, missed: 0, rate: 0 },
    unavailable: false,
    onMonthChange: (month: string) => months.push(month),
  };
  const tree = HabitMonthStatistics(props);
  const header = nodes(tree).find((node) => node.type === 'CalendarHeader');
  assert.equal(header.props.navigation.canGoPrevious, false);
  assert.equal(header.props.navigation.canGoNext, true);
  header.props.navigation.changeMonth(-1);
  assert.deepEqual(months, []);
  for (const date of ['2026-08-31', '2026-09-14']) {
    const item = cell(tree, date);
    assert.equal(item.props.disabled, true);
    assert.equal(item.props.dimmed, true);
    CalendarDay(item.props).props.onPress();
  }
  const start = cell(tree, '2026-09-15');
  assert.equal(start.props.disabled, true); // Current-month dates only display history.
  assert.equal(start.props.dimmed, false);
  CalendarDay(cell(tree, '2026-10-01').props).props.onPress();
  assert.deepEqual(months, ['2026-10']);
  const current = HabitMonthStatistics({ ...props, month: '2026-10' });
  for (const date of ['2026-10-09', '2026-11-01']) {
    assert.equal(cell(current, date).props.disabled, true);
    CalendarDay(cell(current, date).props).props.onPress();
  }
  CalendarDay(cell(current, '2026-10-05').props).props.onPress();
  CalendarDay(cell(current, props.today).props).props.onPress();
  for (const item of nodes(current).filter((node) => node.type === 'CalendarDay')) {
    assert.equal(item.props.onSelect, undefined);
    if (item.props.date.slice(0, 7) === props.today.slice(0, 7)) {
      assert.equal(CalendarDay(item.props).props.disabled, true);
      CalendarDay(item.props).props.onPress();
    }
  }
  assert.match(cell(current, props.today).props.contentClassName, /bg-theme-calendar-empty/);
  assert.match(cell(current, '2026-10-05').props.contentClassName, /bg-theme-calendar-empty/);
});

test('habit detail only queries completion records and exposes no write action to its statistics', () => {
  const habit = {
    id: 1,
    name: '독서',
    icon_key: 'reading',
    icon_color: 'theme',
    priority: 1,
    initial_started_at: '2026-10-01T00:00:00.000Z',
  };
  const { default: HabitDetail } = load('app/habit/[id]/index.tsx', {
    'expo-router': {
      useLocalSearchParams: () => ({ id: '1' }),
      useRouter: () => ({ dismissTo() {} }),
    },
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../../src/theme/AppThemeProvider': { useAppTheme: () => ({ rem: 15 }) },
    '../../../src/queries': {
      habitQueries: { byId: () => 'habit', completionsByHabit: () => 'completions' },
      useToday: () => day.today,
      useRecordMutation: () => assert.fail('habit detail must not create completion mutations'),
    },
    '@tanstack/react-query': {
      useQuery: (kind: string) => ({
        data: kind === 'habit' ? habit : [{ date: '2026-10-06' }],
        isPending: false,
        isError: false,
      }),
    },
  });
  const stats = nodes(HabitDetail()).find((node) => node.type === 'HabitStatistics');
  assert.deepEqual(Array.from(stats.props.dates), ['2026-10-06']);
  assert.equal(stats.props.onToggle, undefined);
  assert.equal(stats.props.disabled, undefined);
  assert.equal(stats.props.unavailable, false);
});
