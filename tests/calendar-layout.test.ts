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
function load(path: string, states: unknown[], date = '2026-09-30') {
  let cursor = 0;
  const navigations: any[] = [];
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
            Children: { toArray: (children: unknown) => [children].flat() },
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
            useRouter: () => ({ push: (href: unknown) => navigations.push(href) }),
            useLocalSearchParams: () => ({ date }),
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
        if (name === 'tailwind-merge') return require(name);
        if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
        if (name.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => ({ rem: 15, colors: {}, iconSizes: {}, tabContentBottom: 104.5 }),
          };
        if (name.endsWith('/queries'))
          return {
            useToday: () => '2026-10-05',
            useRecordMutation: () => ({ isPending: false }),
            diaryQueries: { month: () => ({}) },
            habitQueries: { completions: () => ({}) },
          };
        if (name.endsWith('domain/calendar')) return { calendarDays };
        if (name.endsWith('domain/date')) return require('../src/domain/date');
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
    { navigations },
  );
}

test('calendar pushes the selected date sheet while preserving the selected month and cell', () => {
  const render = load('app/(tabs)/calendar.tsx', []);
  const tree = render('default');
  assert(!nodes(tree).some((node) => String(node.type).includes('ScrollView')));
  assert.equal(tree.props.children[1].props.style.paddingBottom, 104.5);
  tree.props.children[1].props.children.props.onSelect('2026-09-30');
  assert.equal(render.navigations[0].pathname, '/calendar/[date]');
  assert.equal(render.navigations[0].params.date, '2026-09-30');
  const calendar = render('default').props.children[1].props.children;
  assert.equal(calendar.props.selected, '2026-09-30');
  assert.equal(calendar.props.month, '2026-09');
});

test('date route keeps day info in the stack without closing it before opening another page', () => {
  const render = load('app/calendar/[date].tsx', []);
  const page = render('default');
  assert.equal(page.type, 'BottomSheetPage');
  assert.equal(page.props.backRoute, '/calendar');
  assert.equal(page.props.contentKey, '2026-09-30');
  assert.equal(page.props.title, '9월 30일 수요일');
  const info = page.props.children.props.children;
  assert.equal(info.props.date, '2026-09-30');
  assert.equal(info.key, '2026-09-30');
  assert.equal(info.props.onNavigate, undefined);
});

test('day info diary menu waits for only its own close before pushing the edit form', () => {
  const render = load('src/screens/diary/DiaryMenu.tsx', []);
  const props = { diary: { id: 42, date: '2026-10-04' }, today: '2026-10-05' };
  const menu = nodes(render('DiaryMenu', props)).find((node) => node.type === 'RecordMenuButton');
  menu.props.onPress();
  const sheet = nodes(render('DiaryMenu', props)).find((node) => node.type === 'BottomSheetModal');
  assert.equal(sheet.props.visible, true);
  let afterClose: (() => void) | undefined;
  const body = sheet.props.children((action: () => void) => {
    afterClose = action;
  });
  const edit = nodes(body).find((node) => node.props.title === '일기 수정하기');
  edit.props.onPress();
  assert.equal(render.navigations.length, 0);
  assert(afterClose);
  sheet.props.onClose();
  afterClose();
  assert.equal(render.navigations[0], '/diary/42/edit');
});

for (const month of ['2021-02', '2026-10', '2026-03']) {
  test(`calendar shares the available height across ${calendarDays(month).length / 7} rows`, () => {
    const render = load('src/screens/calendar/CalendarGrid.tsx', []);
    const dayRender = load('src/screens/calendar/CalendarDay.tsx', []);
    const props = {
      fillHeight: true,
      children: calendarDays(month).map((date) =>
        jsx('CalendarDay', {
          date,
          month,
          today: '2026-10-05',
          fillHeight: true,
          onSelect: () => {},
        }),
      ),
    };
    const tree = render('CalendarGrid', props);
    const rows = tree.props.children[1].props.children;
    assert.equal(rows.length, calendarDays(month).length / 7);
    assert(rows.every((row: any) => row.props.className.includes('flex-1')));
    const cells = rows
      .flatMap((row: any) => row.props.children)
      .map((node: any) => dayRender('CalendarDay', node.props));
    assert(cells.every((cell: any) => !cell.props.className.includes('aspect')));
    assert(cells.every((cell: any) => cell.props.className.includes('flex-1')));
    assert(!nodes(tree).some((node) => node.props.onLayout));
    assert(cells.every((cell: any) => cell.props.width === undefined));
    const fixed = dayRender('CalendarDay', { ...props.children[0].props, fillHeight: false });
    assert(fixed.props.className.includes('aspect-[1/1.25]'));
  });
}

test('month header preserves month limits and switches months without changing records', () => {
  const render = load('src/screens/calendar/CalendarMonthHeader.tsx', []);
  const changed: string[] = [];
  const props = {
    month: '2026-09',
    today: '2026-10-07',
    title: '월별 기록',
    onMonthChange: (month: string) => changed.push(month),
  };
  const header = render('CalendarMonthHeader', props);
  nodes(header)
    .find((node) => node.props.accessibilityLabel === '다음 달')
    .props.onPress();
  nodes(header)
    .find((node) => node.props.accessibilityLabel?.includes('이번 달로 이동'))
    .props.onPress();
  assert.deepEqual(changed, ['2026-10', '2026-10']);
  const first = nodes(render('CalendarMonthHeader', { ...props, month: '1900-01' })).find(
    (node) => node.props.accessibilityLabel === '이전 달',
  );
  assert.equal(first.props.disabled, true);
  first.props.onPress();
  const last = nodes(render('CalendarMonthHeader', { ...props, month: '2100-12' })).find(
    (node) => node.props.accessibilityLabel === '다음 달',
  );
  assert.equal(last.props.disabled, true);
  last.props.onPress();
  assert.equal(changed.length, 2);
});
