import { useCalendarNavigation } from './helpers/calendar-navigation';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { calendarDays, calendarHabitProgressCounts } from '../src/domain/calendar';

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
        if (name.endsWith('theme/classes')) return require('../src/theme/classes');
          if (name.endsWith('theme/colors')) return require('../src/theme/colors');
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useMemo: (factory: Function) => factory(),
            useRef: (current: unknown) => ({ current }),
            createRef: () => ({ current: null }),
            useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
          };
        if (name === 'expo-blur') return { BlurTargetView: 'BlurTargetView' };
        if (name === 'react-native') return { Pressable: 'Pressable', View: 'View' };
        if (name === 'date-fns' || name === 'tailwind-merge') return require(name);
        if (name.endsWith('theme/AppThemeProvider'))
          return {
            useAppTheme: () => ({ colors: { achievement: '#DCC17D' }, iconSizes: { lg: 24 } }),
          };
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

test('calendar habit bar shows exact percentages including one percent and hides only zero', () => {
  const { CalendarHabitProgress } = load('src/screens/calendar/CalendarHabitProgress.tsx');
  for (const [done, total] of [[0, 4], [0, 0], [1, 0], [-1, 4], [NaN, 4]])
    assert.equal(CalendarHabitProgress({ done, total }), null);
  for (const [done, total] of [[1, 100], [1, 5], [1, 6], [1, 3], [3, 4], [99, 100], [4, 4]]) {
    const tree = CalendarHabitProgress({ done, total });
    const percent = done / total * 100;
    assert.match(tree.props.className, /\bh-2\b/);
    assert.match(tree.props.className, /\boverflow-hidden\b/);
    assert.doesNotMatch(tree.props.className, /\bh-auto\b/);
    assert.equal(tree.props.accessibilityRole, 'progressbar');
    assert.equal(tree.props.accessibilityValue.now, percent);
    assert.equal(tree.props.accessibilityValue.text, `${done}/${total}개 완료`);
    assert.match(tree.props.children.props.className, /\bh-full\b/);
    assert.equal(tree.props.children.props.style.width, `${percent}%`);
    assert(!nodes(tree).some((node) => ['Svg', 'Path', 'Circle'].includes(node.type)));
  }
  assert.equal(CalendarHabitProgress({ done: 5, total: 4 }).props.children.props.style.width, '100%');
});

test('calendar hides progress while the habit denominator is loading or failed and exposes a retry', () => {
  let isError = false;
  let retries = 0;
  const { DiaryHabitMonthCalendar } = load('src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../queries': {
      diaryQueries: { month: () => 'diary' },
      habitQueries: { list: () => 'habits', completions: () => 'habit' },
    },
    '@tanstack/react-query': {
      useQuery: (kind: string) => ({
        data: kind === 'habits' ? undefined : kind === 'diary' ? [] : [{ date: day.date }],
        isError: kind === 'habits' && isError,
        refetch: () => { if (kind === 'habits') retries++; },
      }),
    },
  });
  const props = { month: day.month, today: day.today, selected: day.date, onMonthChange: () => {}, onSelect: () => {} };
  const loading = DiaryHabitMonthCalendar(props);
  assert(!nodes(loading).some((node) => node.type === 'CalendarHabitProgress'));
  assert(!nodes(cell(loading, day.date)).some((node) => node.type === 'EmotionImage'));
  isError = true;
  const failed = DiaryHabitMonthCalendar(props);
  assert(!nodes(failed).some((node) => node.type === 'CalendarHabitProgress'));
  nodes(failed).find((node) => node.type === 'QueryError').props.onRetry();
  assert.equal(retries, 1);
});

test('date cell owns weekday color, outside-month dimming and optional today/selection indicators', () => {
  const tree = CalendarDay({ ...day, selected: day.date });
  assert.equal(tree.props.accessibilityState.selected, true);
  assert.match(tree.props.accessibilityLabel, /오늘/);
  assert.equal(nodes(tree).filter((node) => node.props.className?.includes('h-1.5 w-1.5')).length, 1);
  assert.equal(nodes(tree).find((node) => node.props.className?.includes('absolute -bottom-0.5')).props.className,
    'absolute -bottom-0.5 h-1.5 w-1.5 ios:curve-continuous rounded-full bg-theme-accent/70');
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
  assert.equal(selected.length, 0);
  CalendarDay({ ...props, date: '2026-09-30' }).props.onPress();
  assert.deepEqual(months, ['2026-09']);
  assert.equal(selected.length, 0);
  CalendarDay(props).props.onPress();
  assert.deepEqual(selected, [day.date]);
});

test('today and selection use one identical bottom dot, including when both are active', () => {
  for (const props of [
    { ...day },
    { ...day, today: '2026-10-08', selected: day.date },
    { ...day, selected: day.date },
  ]) {
    const tree = CalendarDay(props);
    const markers = nodes(tree).filter((node) => node.props.className?.includes('absolute -bottom-0.5'));
    assert.equal(markers.length, 1);
    assert.equal(markers[0].props.className, 'absolute -bottom-0.5 h-1.5 w-1.5 ios:curve-continuous rounded-full bg-theme-accent/70');
    assert.match(tree.props.className, /relative/);
    assert(!nodes(tree).some((node) => node.props.className?.includes('top-')));
    assert(!nodes(tree).find((node) => node.type === 'Text').props.className.includes('rounded-full'));
  }
  for (const props of [
    { month: '2026-09' },
    { showTodayIndicator: false, showSelectedIndicator: false },
    { today: '2026-10-08', selected: '2026-10-06' },
  ]) {
    const hidden = CalendarDay({ ...day, selected: day.date, ...props });
    assert(!nodes(hidden).some((node) => node.props.className?.includes('absolute -bottom-0.5')));
  }
});

test('diary calendar owns decorations and future-date limits while using the default date cell', () => {
  const selected: string[] = [];
  const { DiaryHabitMonthCalendar } = load('src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../queries': {
      diaryQueries: { month: () => 'diary' },
      habitQueries: { list: () => 'habits', completions: () => 'habit' },
    },
    '@tanstack/react-query': {
      useQuery: (kind: string) => ({
        data:
          kind === 'diary'
            ? [{ date: day.date, emotion: 0, created_at: '2026-10-07T00:00:00Z' }]
            : kind === 'habits'
              ? ['2026-10-01', '2026-10-01', '2026-10-01', '2026-10-07', '2026-10-08'].map(
                  (date) => ({ initial_started_at: `${date}T00:00:00Z` }),
                )
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
  assert.equal(nodes(tree).find((node) => node.type === 'CalendarGrid').props.minimumRows, 6);
  const cells = nodes(tree).filter((node) => node.type === 'CalendarDay');
  assert.equal(cells.length, calendarDays(day.month).length);
  assert(!nodes(tree).some((node) => node.type === 'CalendarFrame'));
  for (const item of cells) {
    assert.equal(item.props.showSelectedIndicator, false);
    assert.equal(item.props.disabled, item.props.date > day.today);
    assert.equal(item.props.dimmed, item.props.date > day.today);
    CalendarDay(item.props).props.onPress();
  }
  assert(selected.includes(day.date));
  assert(selected.every((date) => date <= day.today));
  const content = nodes(cell(tree, day.date));
  assert.equal(content.find((node) => node.type === 'EmotionImage').props.fill, true);
  assert.equal(content.find((node) => node.type === 'EmotionImage').props.emotion, 0);
  const progress = content.find((node) => node.type === 'CalendarHabitProgress');
  assert.equal(progress.props.done, 2);
  assert.equal(progress.props.total, 4);
  assert(!content.some((node) => node.type === 'Badge' || node.type === 'BlurTargetView'));
  assert.match(cell(tree, day.date).props.label, /습관 2\/4개 완료/);
  const decoration = cell(tree, day.date).props.children;
  const [artwork, progressSlot] = decoration.props.children;
  assert.equal(artwork.props.className, 'w-full flex-1 min-h-0 items-center justify-center');
  assert.match(progressSlot.props.className, /h-2 w-full/);
  assert.match(progressSlot.props.className, /shrink-0/);
  assert.equal(progressSlot.props.children, progress);
  assert.equal(
    cell(tree, '2026-10-06').props.children.props.className,
    'items-center w-full flex-1 min-h-0 gap-1 py-1',
  );
  const habitOnly = cell(tree, '2026-10-06');
  const selectedHabitOnly = CalendarDay({ ...habitOnly.props, selected: '2026-10-06' });
  assert.equal(selectedHabitOnly.props.accessibilityState.selected, true);
  assert(!nodes(selectedHabitOnly).some((node) => node.props.className?.includes('absolute -bottom-0.5')));
  const todayCell = CalendarDay(cell(tree, day.today).props);
  assert.equal(nodes(todayCell).filter((node) => node.props.className?.includes('absolute -bottom-0.5')).length, 0);
  assert(!nodes(habitOnly).some((node) => node.type === 'EmotionImage'));
  const dateLabel = nodes(habitOnly).find((node) => node.type === 'Text');
  assert.equal(dateLabel.props.children, 6);
  assert.equal(dateLabel.props.className,
    nodes(CalendarDay({ ...day, date: '2026-10-06' })).find((node) => node.type === 'Text').props.className);
  assert.equal(habitOnly.props.children.props.className, decoration.props.className);
  assert.equal(habitOnly.props.children.props.children[0].props.className, artwork.props.className);
  assert.equal(habitOnly.props.children.props.children[1].props.className, progressSlot.props.className);
  const emptyProgress = nodes(habitOnly).find((node) => node.type === 'CalendarHabitProgress');
  assert.equal(emptyProgress.props.done, 1);
  assert.equal(emptyProgress.props.total, 3);
  assert.match(habitOnly.props.label, /일기 없음/);
  for (const date of ['2026-10-05', '2026-09-30']) {
    const empty = cell(tree, date).props.children;
    assert.equal(empty.props.className, decoration.props.className);
    assert.equal(empty.props.children[0].props.className, artwork.props.className);
    assert.equal(empty.props.children[1].props.className, progressSlot.props.className);
    assert(!nodes(empty).some((node) => node.type === 'CalendarHabitProgress'));
    assert.equal(nodes(empty).find((node) => node.type === 'Text').props.children, Number(date.slice(-2)));
  }

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
  assert.equal(nodes(rendered).find((node) => node.props.className?.includes('absolute -bottom-0.5')).props.className,
    'absolute -bottom-0.5 h-1.5 w-1.5 ios:curve-continuous rounded-full bg-theme-accent/70');
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

test('calendar preserves date cell identity and decoration sizing across record changes', () => {
  let diaries: any[] = [];
  let completions: any[] = [];
  const { DiaryHabitMonthCalendar } = load('src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../queries': {
      diaryQueries: { month: () => 'diary' },
      habitQueries: { list: () => 'habits', completions: () => 'habit' },
    },
    '@tanstack/react-query': {
      useQuery: (kind: string) => ({ data: kind === 'diary' ? diaries : kind === 'habits' ? [] : completions }),
    },
  });
  const render = () => {
    const tree = DiaryHabitMonthCalendar({
      month: day.month,
      today: day.today,
      selected: day.date,
      fillHeight: true,
      onMonthChange: () => {},
      onSelect: () => {},
    });
    const dateCell = cell(tree, day.date);
    assert.equal(dateCell.key, day.date);
    return CalendarDay(dateCell.props).props.children[0];
  };
  const empty = render();
  assert.equal(empty.key, 'day-content');
  completions = [{ date: day.date }];
  const habitOnly = render();
  assert.equal(habitOnly.key, empty.key);
  assert.equal(habitOnly.props.children[0].props.className, empty.props.children[0].props.className);
  assert.equal(habitOnly.props.children[1].props.className, empty.props.children[1].props.className);
  assert.equal(nodes(habitOnly).find((node) => node.type === 'Text').props.children,
    nodes(empty).find((node) => node.type === 'Text').props.children);
  assert.equal(habitOnly.props.className, 'items-center w-full flex-1 min-h-0 gap-1 py-1');
  assert(!nodes(habitOnly).some((node) => node.type === 'EmotionImage'));
  diaries = [{ date: day.date, emotion: 0, created_at: `${day.date}T00:00:00Z` }];
  const diaryAndHabit = render();
  assert.equal(diaryAndHabit.key, empty.key);
  assert.equal(diaryAndHabit.props.className, habitOnly.props.className);
  assert.equal(nodes(diaryAndHabit).find((node) => node.type === 'EmotionImage').props.emotion, 0);
  completions = [];
  assert.equal(render().key, empty.key);
  completions = [{ date: day.date }];
  diaries = [];
  assert.equal(render().key, empty.key);
  completions = [];
  assert.equal(render().key, empty.key);
});

test('diary calendar adjacent dates change month without opening day info', () => {
  const months: string[] = [];
  const selected: string[] = [];
  const { DiaryHabitMonthCalendar } = load('src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    'expo-sqlite': { useSQLiteContext: () => ({}) },
    '../../queries': {
      diaryQueries: { month: () => 'diary' },
      habitQueries: { list: () => 'habits', completions: () => 'habit' },
    },
    '@tanstack/react-query': { useQuery: () => ({ data: [] }) },
  });
  const tree = DiaryHabitMonthCalendar({
    month: '2026-09',
    today: '2026-10-14',
    selected: '2026-09-15',
    fillHeight: true,
    onMonthChange: (month: string) => months.push(month),
    onSelect: (date: string) => selected.push(date),
  });
  for (const date of ['2026-08-31', '2026-10-01']) {
    const item = cell(tree, date);
    CalendarDay(item.props).props.onPress();
  }
  assert.deepEqual(months, ['2026-08', '2026-10']);
  assert.equal(selected.length, 0);
  CalendarDay(cell(tree, '2026-09-15').props).props.onPress();
  assert.deepEqual(selected, ['2026-09-15']);
  assert.deepEqual(months, ['2026-08', '2026-10']);
  const current = DiaryHabitMonthCalendar({
    month: '2026-10',
    today: '2026-10-14',
    selected: '2026-10-14',
    fillHeight: true,
    onMonthChange: (month: string) => months.push(month),
    onSelect: (date: string) => selected.push(date),
  });
  const future = CalendarDay(cell(current, '2026-11-01').props);
  assert.equal(future.props.disabled, true);
  future.props.onPress();
  assert.deepEqual(months, ['2026-08', '2026-10']);
  assert.deepEqual(selected, ['2026-09-15']);
});


test('calendar progress uses completion bands at the exact 25 and 75 percent boundaries', () => {
  const { CalendarHabitProgress } = load('src/screens/calendar/CalendarHabitProgress.tsx');
  for (const [done, band] of [[1, 'low'], [24.9, 'low'], [25, 'medium'], [74.9, 'medium'], [75, 'high'], [100, 'high']]) {
    const tree = CalendarHabitProgress({ done, total: 100 });
    assert.equal(tree.props.children.props.className, `h-full bg-theme-progress-${band}`);
    assert.equal(tree.props.children.props.style.width, `${done}%`);
  }
});


test('monthly progress counts match visible days, start dates, boundaries and month navigation', () => {
  const habits = Array.from({ length: 4 }, (_, index) => ({
    initial_started_at: index === 0 ? '2026-09-01T00:00:00' : '2026-10-02T00:00:00',
  }));
  const records = [
    ...Array.from({ length: 4 }, () => ({ date: '2026-10-04' })),
    { date: '2026-10-01' },
    { date: '2026-10-02' },
    ...Array.from({ length: 3 }, () => ({ date: '2026-10-03' })),
    { date: '2026-11-01' },
    { date: '2026-08-31' },
    { date: '2026-09-01' },
  ];
  // Oct 1 is full with only one started habit; Oct 2 is 25%; Oct 3 is 75%.
  assert.deepEqual(calendarHabitProgressCounts(habits, records, '2026-10', '2026-10-03'), { low: 0, medium: 1, high: 2 });
  assert.deepEqual(calendarHabitProgressCounts(habits, records, '2026-09', '2026-10-03'), { low: 0, medium: 0, high: 1 });
  assert.deepEqual(calendarHabitProgressCounts(habits, records, '2026-08', '2026-10-03'), { low: 0, medium: 0, high: 0 });
  assert.deepEqual(calendarHabitProgressCounts([], records, '2026-10', '2026-10-03'), { low: 0, medium: 0, high: 0 });
  assert.deepEqual(calendarHabitProgressCounts(Array.from({ length: 5 }, () => habits[0]), [{ date: '2026-10-01' }], '2026-10', '2026-10-03'), { low: 1, medium: 0, high: 0 });
});
