import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const {
  StackRouter,
  StackActions,
} = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');

// Run the installed navigation reducer, preserving real route keys and history.
function navigation(kind: string, initial: string[]) {
  const detail = `${kind}/[id]/index`;
  const edit = `${kind}/[id]/edit`;
  const routeNames = [
    '(tabs)',
    'calendar/[date]',
    'home/[year]/stats',
    detail,
    edit,
    `${kind}/new`,
  ];
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  const reducer = StackRouter({ initialRouteName: '(tabs)' });
  let state = reducer.getInitialState(options);
  state = {
    ...state,
    index: initial.length - 1,
    routes: initial.map((name, index) => ({
      key: `original-${index}`,
      name,
      params: { id: '42' },
    })),
  };
  const actions: string[] = [];
  const dispatch = (type: string, href = '') => {
    actions.push(type);
    const name = href === `/${kind}` ? '(tabs)' : detail;
    const action =
      type === 'POP'
        ? StackActions.pop(1)
        : type === 'POP_TO'
          ? StackActions.popTo(name, { id: '42' })
          : StackActions.replace(name, { id: '42' });
    state = reducer.getStateForAction(state, action, options);
    assert(state);
  };
  return {
    router: {
      canGoBack: () => state.index > 0,
      back: () => dispatch('POP'),
      dismissTo: (href: string) => dispatch('POP_TO', href),
      replace: (href: string) => dispatch('REPLACE', href),
    },
    actions,
    state: () => state,
    detail,
    edit,
  };
}

// Exercise each actual form's save callback and effects without native views or SQLite writes.
function form(kind: string, router: unknown, isNew = false) {
  const notices: any[] = [];
  let failed!: (error: Error) => void;
  const states: unknown[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let pending = false;
  let saved: (id: number) => void;
  const jsx = (type: unknown, props: unknown) => ({ type, props });
  const fallback = new Proxy({}, { get: (_, name) => String(name) });
  const queries = {
    byId: () => ({}),
  };
  const exports: Record<string, Function> = {};
  const name = kind[0].toUpperCase() + kind.slice(1);
  const source = readFileSync(new URL(`../src/screens/${name}Form.tsx`, import.meta.url), 'utf8');
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: (notice: any) => notices.push(notice) }) };
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (dependency === 'react')
          return {
            useState: (initial: any) => {
              const index = cursor++;
              if (!(index in states))
                states[index] = typeof initial === 'function' ? initial() : initial;
              return [
                states[index],
                (value: unknown) => {
                  states[index] = value;
                },
              ];
            },
            useRef: (current: unknown) => ({ current }),
            useEffect: (effect: () => void) => effects.push(effect),
            useCallback: (callback: unknown) => callback,
          };
        if (dependency === 'expo-router') return { useRouter: () => router };
        if (dependency === 'expo-router/react-navigation') return { usePreventRemove: () => {} };
        if (dependency === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (dependency === '@tanstack/react-query')
          return { useQuery: () => ({ isPending: true }) };
        if (dependency === '../queries')
          return {
            diaryQueries: queries,
            habitQueries: queries,
            soberQueries: queries,
            useToday: () => '2026-10-07',
            useRecordMutation: (
              _work: unknown,
              _scope: unknown,
              success: typeof saved,
              failure: typeof failed,
            ) => {
              failed = failure;
              saved = success;
              return { isPending: pending };
            },
          };
        if (dependency === '../theme/AppThemeProvider')
          return {
            useAppTheme: () => ({ colors: {}, rem: 15, iconSizes: {} }),
          };
        if (dependency === '../domain/constants')
          return {
            HABIT_ICON_OPTIONS: [],
            HABIT_ICON_COLORS: { theme: { label: '기본 테마색' } },
            DEFAULT_HABIT_ICON_COLOR: 'theme',
          };
        if (dependency === '../domain/date') return { isDate: () => false };
        if (dependency === '../domain/sober') return require('../src/domain/sober');
        if (dependency === 'date-fns') return { format: () => '', parseISO: () => new Date() };
        return fallback;
      },
    },
  );
  const pageExports: Record<string, Function> = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/BottomSheetPage.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports: pageExports,
      require: (dependency: string) => {
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (dependency === 'react')
          return { useRef: (current: unknown) => ({ current }), useLayoutEffect: () => {} };
        if (dependency.endsWith('/ModalNavigationProvider'))
          return {
            useModalTransition: () => ({
              beginOpening: () => 1,
              beginClosing: () => 2,
              finishTransition: () => {},
            }),
          };
        if (dependency === 'expo-router') return { useRouter: () => router };
        if (dependency === 'expo-router/react-navigation')
          return { useIsFocused: () => true, useRoute: () => ({ key: 'sheet' }) };
        if (dependency === 'react-native') return { useWindowDimensions: () => ({ height: 800 }) };
        return { BottomSheetModal: 'BottomSheetModal' };
      },
    },
  );
  const render = () => {
    cursor = 0;
    effects = [];
    const page = exports[`${name}Form`]({ id: isNew ? undefined : 42 });
    effects.forEach((effect) => effect());
    return pageExports.BottomSheetPage(page.props);
  };
  return {
    render,
    notices,
    fail: () => failed(new Error('저장 실패')),
    finish: () => saved!(42),
    pending: (value: boolean) => {
      pending = value;
    },
  };
}

for (const kind of ['diary', 'habit', 'sober']) {
  test(`${kind} creation notices appear after closing; cancel and failure never report success`, () => {
    const nav = navigation(kind, ['(tabs)', `${kind}/new`]);
    const screen = form(kind, nav.router, true);
    const initial = screen.render();
    assert.equal(initial.props.onClosed, undefined);
    screen.fail();
    assert.equal(screen.notices.length, 1);
    assert.equal(screen.notices[0].tone, 'error');
    assert.equal(screen.render().props.visible, true);
    screen.finish();
    const closing = screen.render();
    assert.equal(screen.notices.length, 1);
    closing.props.onClose();
    assert.equal(screen.notices.length, 2);
    assert.equal(screen.notices[1].tone, 'success');
    assert.match(screen.notices[1].title, kind === 'diary' ? /저장했어요/ : /추가했어요/);
    const cancelled = form(kind, navigation(kind, ['(tabs)', `${kind}/new`]).router, true);
    cancelled.render().props.onClose();
    assert.equal(cancelled.notices.length, 0);
  });

  test(`${kind} save animates the form close before returning to the original detail`, () => {
    const nav = navigation(kind, ['(tabs)', `${kind}/[id]/index`, `${kind}/[id]/edit`]);
    const screen = form(kind, nav.router);
    screen.render();
    assert.deepEqual(nav.actions, []);
    screen.pending(true);
    screen.finish();
    screen.render();
    assert.deepEqual(nav.actions, []);
    screen.pending(false);
    const closingSheet = screen.render();
    assert.equal(closingSheet.props.visible, false);
    assert.deepEqual(nav.actions, []);
    assert.equal(nav.state().routes.length, 3);
    // The lifecycle invokes onClose only when its downward animation finishes.
    assert.equal(screen.notices.length, 0);
    closingSheet.props.onClose();
    assert.equal(screen.notices.length, 1);
    assert.equal(screen.notices[0].tone, 'success');
    assert.match(screen.notices[0].title, /수정했어요/);
    assert.deepEqual(nav.actions, ['POP']);
    assert.deepEqual(
      nav.state().routes.map((route: any) => route.name),
      ['(tabs)', nav.detail],
    );
    assert.equal(nav.state().routes[1].key, 'original-1');
  });

  test(`${kind} save from a list closes the form without opening a detail`, () => {
    for (const entry of [`${kind}/new`, `${kind}/[id]/edit`]) {
      const nav = navigation(kind, ['(tabs)', entry]);
      const screen = form(kind, nav.router);
      screen.render();
      screen.finish();
      const closingSheet = screen.render();
      assert.equal(closingSheet.props.visible, false);
      assert.deepEqual(nav.actions, []);
      closingSheet.props.onClose();
      assert.deepEqual(
        nav.state().routes.map((route: any) => route.name),
        ['(tabs)'],
      );
      assert.equal(nav.state().routes[0].key, 'original-0');
    }
  });

  test(`${kind} form opened from day info closes back to the same date sheet`, () => {
    const nav = navigation(kind, ['(tabs)', 'calendar/[date]', `${kind}/[id]/edit`]);
    const screen = form(kind, nav.router);
    screen.render();
    screen.finish();
    const closingSheet = screen.render();
    assert.equal(nav.state().routes.length, 3);
    closingSheet.props.onClose();
    assert.deepEqual(
      nav.state().routes.map((route: any) => route.name),
      ['(tabs)', 'calendar/[date]'],
    );
    assert.equal(nav.state().routes[1].key, 'original-1');
  });

  test(`${kind} stats detail and edit preserve the original stats route on return`, () => {
    const nav = navigation(kind, [
      '(tabs)',
      'home/[year]/stats',
      `${kind}/[id]/index`,
      `${kind}/[id]/edit`,
    ]);
    const screen = form(kind, nav.router);
    screen.render();
    screen.finish();
    screen.render().props.onClose();
    assert.equal(nav.state().routes.at(-1).name, nav.detail);
    nav.router.back();
    assert.equal(nav.state().routes.at(-1).name, 'home/[year]/stats');
    assert.equal(nav.state().routes.at(-1).key, 'original-1');
  });

  test(`${kind} save without history falls back to its list`, () => {
    const nav = navigation(kind, [`${kind}/[id]/edit`]);
    const screen = form(kind, nav.router);
    screen.render();
    screen.finish();
    const closingSheet = screen.render();
    assert.equal(closingSheet.props.visible, false);
    assert.deepEqual(nav.actions, []);
    closingSheet.props.onClose();
    assert.deepEqual(nav.actions, ['REPLACE']);
    assert.deepEqual(
      nav.state().routes.map((route: any) => route.name),
      ['(tabs)'],
    );
  });

  test(`${kind} deletion dismisses stacked detail pages to the existing tab route`, () => {
    const nav = navigation(kind, ['(tabs)', navName(kind), navName(kind)]);
    nav.router.dismissTo(`/${kind}`);
    assert.equal(nav.state().routes.length, 1);
    assert.equal(nav.state().routes[0].key, 'original-0');
  });
}
function navName(kind: string) {
  return `${kind}/[id]/index`;
}
