import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const {
  StackRouter,
  StackActions,
} = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');

function harness() {
  const routeNames = [
    '(tabs)',
    'habit/[id]/index',
    'diary/[id]/index',
    'sober/[id]/index',
    'sober/[id]/day/[date]',
    'sober/[id]/restart/new',
    'sober/[id]/restart/[restartId]/edit',
    'sober/[id]/memos',
    'habit/new',
    'privacy',
  ];
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  const reducer = StackRouter({ initialRouteName: '(tabs)' });
  let state = reducer.getInitialState(options);
  let owner = state.routes[0].key;
  const dispatched: any[] = [];
  const pending: any[] = [];
  let fail = false;
  const slots = new Map<string, any[]>();
  const cleanups = new Map<string, (() => void)[]>();
  let cursor = 0;
  const router = {
    push: (href: string) => {
      if (fail) throw new Error('navigation failed');
      dispatched.push(href);
      const [, kind, id, child, value, action] = href.split('/');
      const name =
        kind === 'privacy'
          ? kind
          : child === 'day'
            ? 'sober/[id]/day/[date]'
            : child === 'restart'
              ? value === 'new'
                ? 'sober/[id]/restart/new'
                : 'sober/[id]/restart/[restartId]/edit'
              : child === 'memos'
                ? 'sober/[id]/memos'
                : id === 'new'
                  ? `${kind}/new`
                  : `${kind}/[id]/index`;
      pending.push(
        StackActions.push(name, {
          id,
          date: child === 'day' ? value : undefined,
          restartId: action === 'edit' ? value : undefined,
        }),
      );
    },
    canGoBack: () => state.index > 0,
    back: () => {
      pending.push(StackActions.pop(1));
    },
    replace: () => {
      pending.push(StackActions.replace('(tabs)'));
    },
  };
  const jsx = (type: any, props: any) => {
    if (type?.context) type.context.value = props.value;
    return { type, props };
  };
  const react = {
    createContext: () => {
      const context: any = { value: null };
      context.Provider = { context };
      return context;
    },
    useContext: (context: any) => context.value,
    useMemo: (fn: any) => fn(),
    useRef: (current: any) => {
      const values = slots.get(owner) ?? [];
      slots.set(owner, values);
      const index = cursor++;
      return values[index] ?? (values[index] = { current });
    },
    useLayoutEffect: (effect: any) => {
      const values = slots.get(owner) ?? [];
      slots.set(owner, values);
      const index = cursor++;
      if (values[index]) return;
      values[index] = true;
      const cleanup = effect();
      if (cleanup) cleanups.set(owner, [...(cleanups.get(owner) ?? []), cleanup]);
    },
  };
  let navigation: any;
  const dependencies: any = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { useRouter: () => router },
    'expo-router/react-navigation': {
      useNavigation: () => {
        const key = owner;
        return { isFocused: () => state.routes[state.index].key === key };
      },
      useIsFocused: () => state.routes[state.index].key === owner,
      useRoute: () => ({ key: owner }),
      useNavigationState: (select: Function) => select(state),
    },
    'react-native': {
      View: 'View',
      Pressable: 'Pressable',
      useWindowDimensions: () => ({ height: 800 }),
    },
    './BottomSheetModal': { BottomSheetModal: 'Sheet' },
    'date-fns': require('date-fns'),
    'date-fns/locale': require('date-fns/locale'),
    '../../components/AppIcon': { AppIcon: 'AppIcon' },
    '../../components/HabitIcon': { HabitIcon: 'HabitIcon' },
    '../../components/Text': { Text: 'Text' },
    '../../domain/constants': { resolveIconColor: () => '#123456' },
    '../../domain/date': require('../src/domain/date.ts'),
    '../../theme/AppThemeProvider': {
      useAppTheme: () => ({ colors: { accent: '#123456' }, rem: 15, iconSizes: { sm: 18 } }),
    },
    './HabitMenu': { HabitMenu: 'HabitMenu' },
    './HabitStars': { HabitStars: 'HabitStars' },
  };
  function load(file: string) {
    const exports: any = {};
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      {
        exports,
        Error,
        require: (name: string) => {
          if (name.endsWith('/ModalNavigationProvider')) return navigation;
          assert(name in dependencies, `Unexpected import: ${name}`);
          return dependencies[name];
        },
      },
    );
    return exports;
  }
  navigation = load('../src/navigation/ModalNavigationProvider.tsx');
  owner = 'provider';
  navigation.ModalNavigationProvider({ children: null });
  const controller = navigation.useModalTransition();
  const { BottomSheetPage } = load('../src/components/BottomSheetPage.tsx');
  const { HabitBox } = load('../src/screens/habit/HabitBox.tsx');
  const rootKey = state.routes[0].key;
  return {
    controller,
    dispatched,
    rootKey,
    fail: (value: boolean) => {
      fail = value;
    },
    hooks: (key = state.routes[state.index].key) => {
      owner = key;
      return navigation.useModalNavigation();
    },
    habitCard: (onToggle: () => void) => {
      owner = rootKey;
      return HabitBox({
        habit: { id: 1, name: '운동', initial_started_at: '2026-10-01T00:00:00' },
        today: '2026-10-08',
        records: [],
        disabled: false,
        onToggle,
      });
    },
    flush: () => {
      for (const action of pending.splice(0)) {
        const previous = state.routes;
        state = reducer.getStateForAction(state, action, options);
        assert(state);
        for (const route of previous) {
          if (!state.routes.some((next: any) => next.key === route.key)) {
            cleanups.get(route.key)?.forEach((cleanup) => cleanup());
            cleanups.delete(route.key);
          }
        }
      }
    },
    state: () => state,
    page: (props: any = {}, key = state.routes[state.index].key) => {
      owner = key;
      cursor = 0;
      return BottomSheetPage({ title: '정보', backRoute: '/', ...props }).props.children.props;
    },
    presentation: (key: string) => {
      owner = key;
      cursor = 0;
      return BottomSheetPage({ title: '정보', backRoute: '/' }).props;
    },
    unmount: (key: string) => {
      cleanups.get(key)?.forEach((cleanup) => cleanup());
      cleanups.delete(key);
    },
  };
}

test('habit card rapid taps open one information sheet while completion remains independent', () => {
  const h = harness();
  let toggles = 0;
  const card = h.habitCard(() => toggles++);
  const nodes: any[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    for (const child of [node.props?.children].flat()) visit(child);
  };
  visit(card);
  const information = nodes.find((node) => node.props.accessibilityLabel === '운동 습관 정보');
  const completion = nodes.find((node) => node.props.accessibilityRole === 'checkbox');
  for (let i = 0; i < 30; i++) information.props.onPress();
  completion.props.onPress();
  assert.deepEqual(h.dispatched, ['/habit/1']);
  assert.equal(toggles, 1);
  h.flush();
  assert.equal(h.state().routes.length, 2);
  const page = h.page();
  page.onOpening();
  page.onOpened();
  information.props.onPress();
  assert.equal(h.dispatched.length, 1);
});

test('same card and different cards share an immediate lock before navigation dispatch commits', () => {
  const h = harness();
  const first = h.hooks();
  const second = h.hooks();
  assert.equal(first.openModal('/habit/1'), true);
  for (let i = 0; i < 30; i++) {
    assert.equal(first.openModal('/habit/1'), false);
    assert.equal(second.openModal('/habit/2'), false);
  }
  assert.deepEqual(h.dispatched, ['/habit/1']);
  h.flush();
  assert.equal(h.state().routes.length, 2);
  const page = h.page();
  page.onOpening();
  assert.equal(h.controller.openModal('/habit/2'), false);
  page.onOpened();
  assert.equal(h.hooks().openModal('/diary/3'), true);
  h.flush();
  assert.equal(h.state().routes.length, 3);
});

test('closing stays locked until the route is actually removed and allows reopening afterward', () => {
  const h = harness();
  h.hooks().openModal('/habit/1');
  h.flush();
  const page = h.page();
  page.onOpening();
  page.onOpened();
  assert.equal(page.onBeforeClose(), true);
  assert.equal(h.controller.openModal('/habit/1'), false);
  page.onClose();
  assert.equal(h.controller.openModal('/habit/1'), false);
  assert.equal(h.state().routes.length, 2);
  h.flush();
  assert.equal(h.state().routes.length, 1);
  assert.equal(h.hooks().openModal('/habit/1'), true);
});

test('close during entry is rejected without changing ownership or unlocking navigation', () => {
  const h = harness();
  h.hooks().openModal('/habit/1');
  h.flush();
  const page = h.page();
  page.onOpening();
  assert.equal(page.onBeforeClose(), false);
  assert.equal(h.controller.openModal('/habit/2'), false);
  page.onOpened();
  assert.equal(page.onBeforeClose(), true);
});

test('unfocused cards cannot open routes after the current modal has finished entering', () => {
  const h = harness();
  const source = h.hooks();
  source.openModal('/habit/1');
  h.flush();
  const page = h.page();
  page.onOpening();
  page.onOpened();
  assert.equal(source.openModal('/habit/2'), false);
  assert.equal(h.hooks().openModal('/diary/2'), true);
});

test('push failures release the pending lock immediately', () => {
  const h = harness();
  h.fail(true);
  assert.throws(() => h.hooks().openModal('/habit/1'), /navigation failed/);
  h.fail(false);
  assert.equal(h.hooks().openModal('/habit/1'), true);
});

test('deep-linked entry locks navigation and stale completions cannot release a newer transition', () => {
  const h = harness();
  const first = h.controller.beginOpening('first');
  const second = h.controller.beginOpening('second');
  h.controller.finishTransition('first', first);
  assert.equal(h.controller.openModal('/habit/1'), false);
  h.controller.finishTransition('second', first);
  assert.equal(h.controller.openModal('/habit/1'), false);
  h.controller.finishTransition('second', second);
  assert.equal(h.controller.openModal('/habit/1'), true);
});

test('an interrupted route unmount releases its own opening lock', () => {
  const h = harness();
  h.hooks().openModal('/habit/1');
  h.flush();
  const key = h.state().routes.at(-1).key;
  h.page().onOpening();
  h.unmount(key);
  assert.equal(h.controller.openModal('/habit/2'), true);
});

test('domain dismissal guards do not acquire a lock and unfocused sheets cannot close', () => {
  const h = harness();
  h.hooks().openModal('/habit/1');
  h.flush();
  const page = h.page({ onBeforeClose: () => false });
  page.onOpening();
  page.onOpened();
  assert.equal(page.onBeforeClose(), false);
  assert.equal(h.controller.openModal('/diary/1'), true);
  h.flush();
  const underlying = h.page({}, h.state().routes[1].key);
  assert.equal(underlying.onBeforeClose(), false);
});

test('all card and menu modal launches use the shared gate', () => {
  for (const file of [
    'src/screens/habit/HabitBox.tsx',
    'src/screens/sober/SoberBox.tsx',
    'src/screens/diary/DiaryCard.tsx',
    'src/screens/diary/DiaryMenu.tsx',
    'src/screens/habit/HabitMenu.tsx',
    'src/screens/sober/SoberMenu.tsx',
    'src/screens/calendar/DayInfoHabitSection.tsx',
    'src/screens/calendar/DayInfoDiarySection.tsx',
    'src/screens/home/HabitAnalysis.tsx',
    'src/screens/home/SoberAnalysis.tsx',
    'app/(tabs)/habit.tsx',
    'app/(tabs)/sober.tsx',
    'app/(tabs)/calendar.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/setting.tsx',
  ]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert(source.includes('useModalNavigation'), file);
    assert(!source.includes('router.push('), file);
  }
  const source = readFileSync(
    new URL('../src/screens/home/TodayRecordSection.tsx', import.meta.url),
    'utf8',
  );
  assert(!/router\.push\([^)]*(?:\/\$\{|\/new)/.test(source));
});

for (const path of [
  ['/sober/1', '/sober/1/day/2026-10-09', '/sober/1/restart/new'],
  ['/sober/1', '/sober/1/restart/new'],
  ['/sober/1', '/sober/1/day/2026-10-09', '/sober/1/restart/2/edit'],
  ['/sober/1', '/sober/1/memos'],
]) {
  test(`nested sheet history restores its immediate parent: ${path.join(' -> ')}`, () => {
    const h = harness();
    let parentKey = h.rootKey;
    for (const href of path) {
      parentKey = h.state().routes.at(-1).key;
      assert.equal(h.hooks().openModal(href), true);
      h.flush();
      const page = h.page();
      page.onOpening();
      page.onOpened();
    }
    const hidden = h.presentation(parentKey);
    assert.equal(hidden.pointerEvents, 'none');
    assert.equal(hidden.importantForAccessibility, 'no-hide-descendants');
    assert.equal(hidden.className, 'flex-1');
    assert.equal(hidden.children.props.visible, true);
    assert.equal(hidden.children.props.dimBackdrop, parentKey === h.state().routes[1].key);
    assert.equal(h.page().dimBackdrop, false);
    const page = h.page();
    assert.equal(page.onBeforeClose(), true);
    page.onClose();
    h.flush();
    assert.equal(h.state().routes.at(-1).key, parentKey);
    const restored = h.presentation(parentKey);
    assert.equal(restored.pointerEvents, 'auto');
    assert.equal(restored.className, 'flex-1');
    assert.equal(restored.children.props.visible, true);
    assert.equal(h.hooks().openModal('/sober/2'), true);
  });
}
