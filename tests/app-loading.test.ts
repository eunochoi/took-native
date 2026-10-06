import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function harness(path: string, modules: Record<string, any>) {
  const slots: any[] = [];
  const effects: (() => void)[] = [];
  const cleanups: (() => void)[] = [];
  let cursor = 0;
  const exports: any = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            createContext: () => ({ Provider: 'Provider' }),
            useRef: (value: any) => {
              const index = cursor++;
              return slots[index] ?? (slots[index] = { current: value });
            },
            useState: (value: any) => {
              const index = cursor++;
              if (!(index in slots)) slots[index] = value;
              return [
                slots[index],
                (next: any) => {
                  slots[index] = next;
                },
              ];
            },
            useEffect: (fn: any, deps: any[]) => {
              const index = cursor++;
              if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) {
                slots[index] = deps;
                effects.push(() => {
                  const cleanup = fn();
                  if (cleanup) cleanups.push(cleanup);
                });
              }
            },
          };
        if (name in modules) return modules[name];
        if (name.startsWith('@expo/vector-icons/')) return { font: {} };
        if (name.includes('/assets/')) return name;
        throw new Error('Unexpected import: ' + name);
      },
    },
  );
  return {
    render(name: string, props: any) {
      cursor = 0;
      const tree = exports[name](props);
      effects.splice(0).forEach((fn) => fn());
      return tree;
    },
    unmount: () => cleanups.forEach((fn) => fn()),
  };
}
function settingsHarness() {
  const read = deferred<any>();
  const fonts = deferred<void>();
  const errors: Error[] = [];
  const h = harness('../src/settings/SettingsProvider.tsx', {
    'expo-font': { loadAsync: () => fonts.promise },
    'expo-sqlite': { useSQLiteContext: () => db },
    '../db': { withWriteLock: (fn: any) => fn() },
    './model': { DEFAULT_SETTINGS, parseSettings },
  });
  const db = { getFirstAsync: () => read.promise, runAsync: async () => {} };
  const props = {
    children: 'app',
    onError: (error: Error) => errors.push(error),
  };
  return { ...h, read, fonts, errors, render: () => h.render('SettingsProvider', props) };
}

test('saved settings reach app only after fonts finish loading', async () => {
  const h = settingsHarness();
  assert.equal(h.render(), null);
  h.read.resolve({
    value: JSON.stringify({ ...DEFAULT_SETTINGS, themeAccent: 'yellow', themeMode: 'system' }),
  });
  await tick();
  assert.equal(h.render(), null);
  h.fonts.resolve();
  await tick();
  const tree = h.render();
  assert.equal(tree.props.children, 'app');
  assert.equal(tree.props.value.settings.themeAccent, 'yellow');
  assert.equal(tree.props.value.settings.themeMode, 'system');
});

test('font failure reaches retry UI without revealing the app', async () => {
  const h = settingsHarness();
  h.render();
  h.read.resolve(null);
  await tick();
  const error = new Error('font failed');
  h.fonts.reject(error);
  await tick();
  assert.equal(h.errors[0], error);
  assert.equal(h.render(), null);
});

test('late settings read after unmount cannot reveal the app', async () => {
  const h = settingsHarness();
  h.render();
  h.unmount();
  h.read.resolve(null);
  await tick();
  assert.equal(h.render(), null);
  assert.equal(h.errors.length, 0);
});

test('startup waits for layout and both image requests, including a failed image', () => {
  const h = harness('../src/components/AppLoadingScreen.tsx', {
    'react-native': {
      View: 'View',
      Image: Object.assign('Image', { resolveAssetSource: () => ({ width: 100, height: 36 }) }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  });
  let ready = 0;
  const props = { onReady: () => ready++ };
  const render = () => h.render('AppLoadingScreen', props);
  let tree = render();
  tree.props.onLayout();
  tree = render();
  assert.equal(ready, 0);
  tree.props.children[1].props.onLoadEnd();
  tree = render();
  assert.equal(ready, 0);
  // React Native calls onLoadEnd for failure as well, so startup cannot hang.
  tree.props.children[2].props.onLoadEnd();
  render();
  assert.equal(ready, 1);
});
