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
  assert.equal(
    nodes(tree).filter((node) => node.props.className?.includes('h-1.5 w-1.5')).length,
    1,
  );
  const hidden = CalendarDay({
    ...day,
    selected: day.date,
    showTodayIndicator: false,
    showSelectedIndicator: false,
  });
  assert(!nodes(hidden).some((node) => node.props.className?.includes('h-1.5')));
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
  assert.equal(badge.props.className, 'h-6 w-6 absolute -top-1 -right-2');
  assert.equal(
    cell(tree, '2026-10-06').props.children.props.className,
    'items-center justify-center scale-[1.2]',
  );
  assert.equal(cell(tree, '2026-10-05').props.children, undefined);
  assert.equal(cell(tree, '2026-09-30').props.children, undefined);
});

test('habit calendar fills completed and missed dates while keeping locked history legible', () => {
  const { HabitMonthCalendar } = load('src/screens/habit/HabitMonthCalendar.tsx');
  const tree = HabitMonthCalendar({
    habit: { initial_started_at: '2026-09-01T00:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-07',
    dates: ['2026-09-10', '2026-09-12', '2026-09-13'],
    summary: { completed: 3, missed: 27, rate: 10 },
    disabled: false,
    unavailable: false,
    onMonthChange: () => {},
    onToggle: () => {},
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
      'text-xs text-theme-text-on-accent',
    );
  }
  const missed = cell(tree, '2026-09-11');
  assert.match(missed.props.contentClassName, /bg-theme-border/);
  assert.equal(
    nodes(CalendarDay(missed.props)).find((node) => node.type === 'Text').props.className,
    'text-xs text-theme-text-secondary',
  );
  assert.equal(cell(tree, '2026-08-31').props.children, undefined);
  assert.equal(cell(tree, '2026-08-31').props.dimmed, true);
});

test('habit calendar does not mark missing records as missed while data is unavailable', () => {
  const { HabitMonthCalendar } = load('src/screens/habit/HabitMonthCalendar.tsx');
  const tree = HabitMonthCalendar({
    habit: { initial_started_at: '2026-09-01T00:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-07',
    dates: [],
    summary: { completed: 0, missed: 30, rate: 0 },
    disabled: true,
    unavailable: true,
    onMonthChange: () => {},
    onToggle: () => {},
  });
  const past = cell(tree, '2026-09-11');
  assert.equal(past.props.contentClassName, undefined);
  assert.equal(past.props.textClassName, undefined);
  assert(!past.props.label.includes('놓친'));
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
  assert.equal(cell(tree, '2026-10-06').props.children, undefined);
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
  assert.equal(
    nodes(rendered).filter((node) => node.props.className?.includes('h-1.5 w-1.5')).length,
    1,
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
  const { HabitMonthCalendar } = load('src/screens/habit/HabitMonthCalendar.tsx');
  const months: string[] = [];
  const toggled: string[] = [];
  const props = {
    habit: { initial_started_at: '2026-09-15T12:00:00.000Z' },
    month: '2026-09',
    today: '2026-10-08',
    dates: [],
    summary: { completed: 0, missed: 0, rate: 0 },
    disabled: false,
    unavailable: false,
    onMonthChange: (month: string) => months.push(month),
    onToggle: (date: string) => toggled.push(date),
  };
  const tree = HabitMonthCalendar(props);
  const header = nodes(tree).find((node) => node.type === 'CalendarMonthHeader');
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
  assert.equal(start.props.disabled, true); // Older than four days, but history remains legible.
  assert.equal(start.props.dimmed, false);
  CalendarDay(cell(tree, '2026-10-01').props).props.onPress();
  assert.deepEqual(months, ['2026-10']);
  assert.deepEqual(toggled, []);
  const current = HabitMonthCalendar({ ...props, month: '2026-10' });
  for (const date of ['2026-10-09', '2026-11-01']) {
    assert.equal(cell(current, date).props.disabled, true);
    CalendarDay(cell(current, date).props).props.onPress();
  }
  CalendarDay(cell(current, '2026-10-05').props).props.onPress();
  CalendarDay(cell(current, props.today).props).props.onPress();
  assert.deepEqual(toggled, ['2026-10-05', '2026-10-08']);
});
