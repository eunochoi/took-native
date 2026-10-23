import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';
import { ACCENT_PALETTES } from '../src/theme/colors';

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

function loadingHarness() {
  const errors: Error[] = [];
  let ready = 0;
  const h = harness('../src/components/AppLoadingScreen.tsx', {
    'react-native': {
      View: 'View',
      Image: Object.assign('Image', { resolveAssetSource: () => ({ width: 100, height: 36 }) }),
    },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    './Wordmark': { Wordmark: 'Wordmark' },
  });
  const props = { onReady: () => ready++, onError: (error: Error) => errors.push(error) };
  return {
    ...h,
    errors,
    ready: () => ready,
    render: () => h.render('AppLoadingScreen', props),
  };
}

test('startup waits for logo, layout and cat request, including a failed cat image', () => {
  const h = loadingHarness();
  let tree = h.render();
  assert.equal(tree.props.children[1].type, 'Wordmark');
  tree.props.onLayout();
  // A failed decorative cat image must not block startup.
  tree.props.children[2].props.onLoadEnd();
  h.render();
  assert.equal(h.ready(), 0);
  tree.props.children[1].props.onLoad();
  tree = h.render();
  assert.equal(h.ready(), 1);
});

test('loading logo failure reaches retry UI without reporting readiness', () => {
  const h = loadingHarness();
  const tree = h.render();
  tree.props.onLayout();
  tree.props.children[2].props.onLoadEnd();
  tree.props.children[1].props.onError({ nativeEvent: { error: 'wordmark image failed' } });
  h.render();
  assert.equal(h.errors[0].message, 'wordmark image failed');
  assert.equal(h.ready(), 0);
});

test('wordmark selects all 12 accent and mode images, preserves its ratio and forwards image events', () => {
  const h = harness('../src/components/Wordmark.tsx', {
    'react-native': {
      Image: Object.assign('Image', { resolveAssetSource: () => ({ width: 1826, height: 896 }) }),
    },
    '../theme/colors': { ACCENT_PALETTES },
  });
  const onLoad = () => {};
  const onError = () => {};
  for (const mode of ['light', 'dark']) {
    for (const [name, palette] of Object.entries(ACCENT_PALETTES)) {
      const tree = h.render('Wordmark', {
        size: 45,
        accentColor: palette.accent,
        mode,
        onLoad,
        onError,
      });
      const filename =
        mode === 'dark'
          ? `wordmark-${name}-dark.png`
          : name === 'blue'
            ? 'wordmark.png'
            : `wordmark-${name}.png`;
      assert.equal(tree.props.source, `../../assets/ui/${filename}`);
      assert.equal(tree.props.style.height, 45);
      assert.equal(tree.props.style.width, 45 * (1826 / 896));
      assert.equal(tree.props.onLoad, onLoad);
      assert.equal(tree.props.onError, onError);
      assert.equal(tree.props.accessibilityLabel, 'TOOK');
    }
  }
  assert.equal(
    h.render('Wordmark', { mode: 'dark', accentColor: '#unknown' }).props.source,
    '../../assets/ui/wordmark-blue-dark.png',
  );
  assert.equal(h.render('Wordmark', {}).props.source, '../../assets/ui/wordmark.png');
  assert.equal(
    h.render('Wordmark', { accentColor: '#unknown' }).props.source,
    '../../assets/ui/wordmark.png',
  );
});
