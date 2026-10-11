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

test('startup readiness reaches cached SQLite children through context after both loading events', () => {
  const state: any[] = [];
  let cursor = 0;
  let ready = false;
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
      require(name: string) {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            createContext: () => ({ Provider: 'AppReadyProvider' }),
            useContext: () => ready,
            useCallback: (fn: Function) => fn,
            useEffect: () => {},
            useState: (initial: any) => {
              const i = cursor++;
              if (!(i in state)) state[i] = initial;
              return [
                state[i],
                (value: any) => {
                  state[i] = value;
                },
              ];
            },
          };
        if (name === 'react-native') return { View: 'View', AppState: {}, Pressable: 'Pressable' };
        if (name === 'expo-splash-screen') return { preventAutoHideAsync: async () => {} };
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
    return exports.default();
  };
  const first = render();
  const context = (tree: any) => find(tree, (node) => node.type === 'AppReadyProvider');
  const sqlite = find(first, (node) => node.type === 'SQLiteProvider');
  // Keep the initial Navigation element, as SQLiteProvider's comparison ignores children.
  const navigation = find(
    sqlite,
    (node) => typeof node.type === 'function' && node.type.name === 'Navigation',
  );
  const guide = () =>
    find(navigation.type(navigation.props), (node) => node.type === 'FirstRunOnboarding');
  assert.equal(context(first).props.value, false);
  assert.equal(guide().props.ready, false);
  navigation.props.onReady();
  ready = context(render()).props.value;
  assert.equal(ready, false);
  const loading = find(first, (node) => node.type === 'AppLoadingScreen');
  loading.props.onReady();
  ready = context(render()).props.value;
  assert.equal(ready, true);
  assert.equal(guide().props.ready, true);
  assert.equal(navigation.props.ready, undefined);
});
