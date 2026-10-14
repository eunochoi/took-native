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
    '../theme/fonts': { wordmarkFont: { FredokaWordmark: 'wordmark.ttf' } },
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

function loadingHarness() {
  const fonts = deferred<void>();
  const errors: Error[] = [];
  let ready = 0;
  const h = harness('../src/components/AppLoadingScreen.tsx', {
    'react-native': {
      View: 'View',
      Image: Object.assign('Image', { resolveAssetSource: () => ({ width: 100, height: 36 }) }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-font': { loadAsync: () => fonts.promise },
    '../theme/fonts': { wordmarkFont: { FredokaWordmark: 'wordmark.ttf' } },
    './Wordmark': { Wordmark: 'Wordmark' },
  });
  const props = { onReady: () => ready++, onError: (error: Error) => errors.push(error) };
  return {
    ...h,
    fonts,
    errors,
    ready: () => ready,
    render: () => h.render('AppLoadingScreen', props),
  };
}

test('startup waits for font, layout and cat request, including a failed image', async () => {
  const h = loadingHarness();
  let tree = h.render();
  assert.equal(tree.props.children[1], false);
  tree.props.onLayout();
  // React Native calls onLoadEnd for failure as well, so startup cannot hang.
  tree.props.children[2].props.onLoadEnd();
  h.render();
  assert.equal(h.ready(), 0);
  h.fonts.resolve();
  await tick();
  tree = h.render();
  assert.equal(tree.props.children[1].type, 'Wordmark');
  assert.equal(h.ready(), 1);
});

test('loading font failure reaches retry UI without reporting readiness', async () => {
  const h = loadingHarness();
  const tree = h.render();
  tree.props.onLayout();
  tree.props.children[2].props.onLoadEnd();
  const error = new Error('wordmark font failed');
  h.fonts.reject(error);
  await tick();
  h.render();
  assert.equal(h.errors[0], error);
  assert.equal(h.ready(), 0);
});

test('unmounted loading screen ignores a late font load or failure', async () => {
  for (const reject of [false, true]) {
    const h = loadingHarness();
    h.render();
    h.unmount();
    if (reject) h.fonts.reject(new Error('late font failure'));
    else h.fonts.resolve();
    await tick();
    assert.equal(h.errors.length, 0);
    assert.equal(h.ready(), 0);
  }
});
