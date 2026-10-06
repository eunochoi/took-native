import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { calendarDays } from '../src/domain/calendar';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
function nodes(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function load(path: string, states: unknown[]) {
  let cursor = 0;
  let focusCleanup: (() => void) | undefined;
  const exports: Record<string, Function> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('theme/classes')) return require('../src/theme/classes');
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useCallback: (fn: Function) => fn,
            useRef: (value: unknown) => {
              const index = cursor++;
              states[index] ??= { current: value };
              return states[index];
            },
            useState: (initial: unknown) => {
              const index = cursor++;
              if (states[index] === undefined) states[index] = initial;
              return [
                states[index],
                (next: unknown) => {
                  states[index] = next;
                },
              ];
            },
          };
        if (name === 'expo-router')
          return {
            useFocusEffect: (effect: () => () => void) => {
              focusCleanup ??= effect();
            },
          };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query') return { useQuery: () => ({ data: [] }) };
        if (name === 'react-native')
          return {
            View: 'View',
            useWindowDimensions: () => ({ height: 900 }),
          };
        if (name === 'react-native-safe-area-context')
          return {
            useSafeAreaInsets: () => ({ top: 24, bottom: 20 }),
          };
        if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
        if (name.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => ({ rem: 15, colors: {}, iconSizes: {}, tabContentBottom: 104.5 }),
          };
        if (name.endsWith('/queries'))
          return {
            useToday: () => '2026-10-05',
            diaryQueries: { month: () => ({}) },
            habitQueries: { completions: () => ({}) },
          };
        if (name.endsWith('domain/calendar')) return { calendarDays };
        if (name.endsWith('useMonthSwipe'))
          return {
            useMonthSwipe: () => ({ panHandlers: {}, changeMonth: () => {} }),
          };
        if (name.endsWith('ColorTransition')) return { ColorView: 'ColorView' };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return Object.assign(
    (name: string, props?: any) => {
      cursor = 0;
      return exports[name](props);
    },
    { blur: () => focusCleanup?.() },
  );
}

test('calendar opens a fixed-height date sheet immediately and closes before navigating', () => {
  const render = load('app/(tabs)/calendar.tsx', []);
  let tree = render('default');
  assert(!nodes(tree).some((node) => String(node.type).includes('ScrollView')));
  assert.equal(tree.props.children[1].props.style.paddingBottom, 104.5);
  assert.equal(tree.props.children[2].props.visible, false);
  tree.props.children[1].props.children.props.onSelect('2026-09-30');
  tree = render('default');
  const sheet = tree.props.children[2];
  assert.equal(sheet.props.visible, true);
  assert.equal(sheet.props.fixedHeight, true);
  assert.equal(sheet.props.maxHeight, 810);
  assert.equal(sheet.props.contentKey, '2026-09-30');
  assert.equal(sheet.props.title, '9월 30일 수요일');
  let afterClose: (() => void) | undefined;
  const info = sheet.props.children((action: () => void) => {
    afterClose = action;
  }).props.children;
  assert.equal(info.props.date, '2026-09-30');
  let navigated = false;
  info.props.onNavigate(() => {
    navigated = true;
  });
  assert.equal(navigated, false);
  afterClose!();
  assert.equal(navigated, true);
  sheet.props.onClose();
  assert.equal(render('default').props.children[2].props.visible, false);
});

test('new selections reset the sheet content and leaving the page closes it', () => {
  const render = load('app/(tabs)/calendar.tsx', []);
  render('default').props.children[1].props.children.props.onSelect('2026-10-04');
  render('default').props.children[1].props.children.props.onSelect('2026-10-03');
  const sheet = render('default').props.children[2];
  assert.equal(sheet.props.contentKey, '2026-10-03');
  assert.equal(sheet.props.children(() => {}).props.children.key, '2026-10-03');
  render.blur();
  assert.equal(render('default').props.children[2].props.visible, false);
});

for (const month of ['2021-02', '2026-10', '2026-03']) {
  test(`calendar shares the available height across ${calendarDays(month).length / 7} rows`, () => {
    const render = load('src/screens/calendar/MonthCalendar.tsx', [350, 300]);
    const props = {
      month,
      selected: `${month}-01`,
      today: '2026-10-05',
      onMonthChange: () => {},
      onSelect: () => {},
      fillHeight: true,
    };
    const tree = render('MonthCalendar', props);
    const grid = tree.props.children.at(-1).props.children[1];
    const rows = grid.props.children;
    assert.equal(rows.length, calendarDays(month).length / 7);
    assert(rows.every((row: any) => row.props.className.includes('flex-1')));
    const cells = rows.flatMap((row: any) => row.props.children);
    assert(cells.every((cell: any) => !cell.props.className.includes('aspect')));
    assert(cells.every((cell: any) => cell.props.className.includes('flex-1')));
    assert(!nodes(tree).some((node) => node.props.onLayout));
    assert(cells.every((cell: any) => cell.props.children.props.width === undefined));
    const fixed = render('MonthCalendar', { ...props, fillHeight: false });
    const fixedGrid = fixed.props.children.at(-1).props.children[1];
    assert(
      fixedGrid.props.children.every((row: any) =>
        row.props.children.every((cell: any) => cell.props.className.includes('aspect-[1/1.25]')),
      ),
    );
  });
}
