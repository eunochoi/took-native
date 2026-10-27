import { mockI18n } from './helpers/i18n';
import { translateErrorMessage } from '../src/i18n/errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function find(tree: any, predicate: (node: any) => boolean): any {
  if (Array.isArray(tree)) return tree.map((child) => find(child, predicate)).find(Boolean);
  if (!tree || typeof tree !== 'object') return undefined;
  return predicate(tree) ? tree : find(tree.props?.children, predicate);
}

function startupHarness() {
  let language: 'ko' | 'en' = 'ko';
  const state: any[] = [];
  const timers = new Map<number, { at: number; run: () => void }>();
  const effects: (() => void)[] = [];
  const cleanups = new Map<number, () => void>();
  let cursor = 0;
  let ready = false;
  let readingNavigation = false;
  let now = 0;
  let nextTimer = 0;
  let hideCalls = 0;
  const exports: any = {};
  const componentNames = [
    'AppThemeProvider',
    'GestureHandlerRootView',
    'SettingsProvider',
    'NoticeProvider',
    'AppLoadingScreen',
    'ModalNavigationProvider',
    'FirstRunOnboarding',
  ];
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      setTimeout(run: () => void, delay: number) {
        const id = ++nextTimer;
        timers.set(id, { at: now + delay, run });
        return id;
      },
      clearTimeout: (id: number) => timers.delete(id),
      require(name: string) {
        if (name.endsWith('/i18n/react')) return mockI18n(() => language);
        if (name.endsWith('/i18n/errors')) return { translateErrorMessage };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            createContext: () => ({ Provider: 'AppReadyProvider' }),
            useContext: () => ready,
            useCallback: (fn: Function) => fn,
            useEffect: (fn: () => void | (() => void), deps: any[]) => {
              if (readingNavigation) return;
              const i = cursor++;
              if (i in state && deps.every((value, index) => value === state[i][index])) return;
              state[i] = deps;
              effects.push(() => {
                cleanups.get(i)?.();
                const cleanup = fn();
                if (cleanup) cleanups.set(i, cleanup);
                else cleanups.delete(i);
              });
            },
            useState: (initial: any) => {
              const i = cursor++;
              if (!(i in state)) state[i] = initial;
              return [
                state[i],
                (value: any) => {
                  state[i] = typeof value === 'function' ? value(state[i]) : value;
                },
              ];
            },
          };
        if (name === 'react-native')
          return {
            View: 'View',
            AppState: { addEventListener: () => ({ remove() {} }) },
            Pressable: 'Pressable',
            Text: 'NativeText',
            Platform: { OS: 'ios' },
          };
        if (name === 'react-native-safe-area-context')
          return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
        if (name === '../src/theme/colors') return { themeColors: () => ({}) };
        if (name === 'expo-splash-screen')
          return {
            preventAutoHideAsync: async () => {},
            hideAsync: async () => {
              hideCalls++;
            },
          };
        if (name === 'expo-sqlite') return { SQLiteProvider: 'SQLiteProvider' };
        if (name === '@tanstack/react-query')
          return { QueryClient: class {}, QueryClientProvider: 'QueryClientProvider' };
        if (name === 'expo-router') return { Stack: Object.assign(() => {}, { Screen: 'Screen' }) };
        if (name === 'expo-router/react-navigation')
          return {
            ThemeProvider: 'ThemeProvider',
            DarkTheme: { colors: {} },
            DefaultTheme: { colors: {} },
          };
        if (name.includes('AppThemeProvider'))
          return {
            AppThemeProvider: 'AppThemeProvider',
            useAppTheme: () => ({ colors: {}, mode: 'light' }),
          };
        return Object.fromEntries(componentNames.map((component) => [component, component]));
      },
    },
  );
  const render = () => {
    cursor = 0;
    const tree = exports.default();
    effects.splice(0).forEach((effect) => effect());
    ready = find(tree, (node) => node.type === 'AppReadyProvider')?.props.value ?? false;
    return tree;
  };
  return {
    render,
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of timers) {
        if (timer.at > now) continue;
        timers.delete(id);
        timer.run();
      }
    },
    guide(navigation: any) {
      readingNavigation = true;
      try {
        return find(
          navigation.type(navigation.props),
          (node) => node.type === 'FirstRunOnboarding',
        );
      } finally {
        readingNavigation = false;
      }
    },
    hideCalls: () => hideCalls,
    pendingTimers: () => timers.size,
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

test('startup reaches cached SQLite children only after readiness and the 1.5 second minimum', () => {
  const h = startupHarness();
  const { render } = h;
  const first = render();
  const context = (tree: any) => find(tree, (node) => node.type === 'AppReadyProvider');
  const sqlite = find(first, (node) => node.type === 'SQLiteProvider');
  // Keep the initial Navigation element, as SQLiteProvider's comparison ignores children.
  const navigation = find(
    sqlite,
    (node) => typeof node.type === 'function' && node.type.name === 'Navigation',
  );
  assert.equal(context(first).props.value, false);
  assert.equal(h.guide(navigation).props.ready, false);
  navigation.props.onReady();
  assert.equal(context(render()).props.value, false);
  const loading = find(first, (node) => node.type === 'AppLoadingScreen');
  loading.props.onReady();
  assert.equal(context(render()).props.value, false);
  h.advance(1499);
  const waiting = render();
  assert.equal(context(waiting).props.value, false);
  assert.ok(find(waiting, (node) => node.type === 'AppLoadingScreen'));
  assert.equal(h.hideCalls(), 0);
  assert.equal(h.guide(navigation).props.ready, false);
  h.advance(1);
  const finished = render();
  assert.equal(context(finished).props.value, true);
  assert.equal(
    find(finished, (node) => node.type === 'AppLoadingScreen'),
    undefined,
  );
  assert.equal(h.hideCalls(), 1);
  assert.equal(h.guide(navigation).props.ready, true);
  assert.equal(navigation.props.ready, undefined);
  render();
  assert.equal(h.hideCalls(), 1);
});

test('slow startup waits for images and navigation without adding another splash delay', () => {
  const h = startupHarness();
  const first = h.render();
  h.advance(2500);
  h.render();
  assert.equal(h.hideCalls(), 0);
  find(first, (node) => node.type === 'AppLoadingScreen').props.onReady();
  h.render();
  assert.equal(h.hideCalls(), 0);
  find(first, (node) => node.type?.name === 'Navigation').props.onReady();
  const finished = h.render();
  assert.equal(h.hideCalls(), 1);
  assert.equal(find(finished, (node) => node.type === 'AppReadyProvider').props.value, true);
  assert.equal(h.pendingTimers(), 0);
});

test('startup errors reveal retry UI immediately and retry does not restart the minimum', () => {
  const h = startupHarness();
  const first = h.render();
  find(first, (node) => node.type === 'SQLiteProvider').props.onError(new Error('database failed'));
  const errorScreen = h.render();
  assert.equal(
    find(errorScreen, (node) => node.type === 'AppLoadingScreen'),
    undefined,
  );
  find(errorScreen, (node) => node.type === 'SafeAreaView').props.onLayout();
  assert.equal(h.hideCalls(), 1);
  h.advance(1500);
  h.render();
  find(errorScreen, (node) => node.type === 'Pressable').props.onPress();
  const retry = h.render();
  find(retry, (node) => node.type === 'AppLoadingScreen').props.onReady();
  find(retry, (node) => node.type?.name === 'Navigation').props.onReady();
  const finished = h.render();
  assert.equal(find(finished, (node) => node.type === 'AppReadyProvider').props.value, true);
  assert.equal(h.hideCalls(), 2);
  assert.equal(h.pendingTimers(), 0);
});

test('unmount cancels the splash minimum timer', () => {
  const h = startupHarness();
  h.render();
  assert.equal(h.pendingTimers(), 1);
  h.unmount();
  assert.equal(h.pendingTimers(), 0);
  h.advance(1500);
  assert.equal(h.hideCalls(), 0);
});

test('startup failure changes language while preserving retry and the original database error', () => {
  const h = startupHarness();
  const first = h.render();
  const error = new Error('지원하지 않는 DB 버전입니다.');
  find(first, (node) => node.type === 'SQLiteProvider').props.onError(error);
  h.setLanguage('en');
  const screen = h.render();
  const texts = find(screen, (node) => node.type === 'SafeAreaView').props.children;
  assert.equal(texts[0].props.children, 'Could not start the app');
  assert.equal(texts[1].props.children, 'This database version is not supported.');
  assert.equal(
    texts[2].props.children,
    'Your existing records have not been deleted. Please try again.',
  );
  assert.equal(texts[3].props.children.props.children, 'Try again');
  h.setLanguage('ko');
  assert.equal(
    find(h.render(), (node) => node.type === 'SafeAreaView').props.children[1].props.children,
    error.message,
  );
  texts[3].props.onPress();
  assert(find(h.render(), (node) => node.type === 'SQLiteProvider'));
  assert.equal(error.message, '지원하지 않는 DB 버전입니다.');
});
