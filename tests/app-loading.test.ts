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
  let refreshes = 0;
  let write = async () => {};
  const h = harness('../src/settings/SettingsProvider.tsx', {
    'expo-font': { loadAsync: () => fonts.promise },
    'expo-sqlite': { useSQLiteContext: () => db },
    '../db': { withWriteLock: (fn: any) => fn() },
    './model': { DEFAULT_SETTINGS, parseSettings },
    '../widgets/sober': { refreshSoberWidgets: () => refreshes++ },
  });
  const db = { getFirstAsync: () => read.promise, runAsync: () => write() };
  const props = {
    children: 'app',
    onError: (error: Error) => errors.push(error),
  };
  return {
    ...h,
    read,
    fonts,
    errors,
    refreshes: () => refreshes,
    setWrite: (next: () => Promise<void>) => {
      write = next;
    },
    render: () => h.render('SettingsProvider', props),
  };
}

test('widgets refresh only after a theme preference is persisted successfully', async () => {
  const h = settingsHarness();
  h.render();
  h.read.resolve(null);
  h.fonts.resolve();
  await tick();
  const pending = deferred<void>();
  h.setWrite(() => pending.promise);
  const save = h.render().props.value.updateSettings({ themeAccent: 'purple' });
  assert.equal(h.refreshes(), 0);
  pending.resolve();
  await save;
  assert.equal(h.refreshes(), 1);
  h.setWrite(async () => {});
  await h.render().props.value.updateSettings({ fontSize: 'large' });
  assert.equal(h.refreshes(), 1);
  h.setWrite(async () => {
    throw Error('save failed');
  });
  await assert.rejects(
    h.render().props.value.updateSettings({ themeAccent: 'pink' }),
    /save failed/,
  );
  assert.equal(h.refreshes(), 1);
});

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

function loadingHarness(platform = 'ios') {
  const errors: Error[] = [];
  let ready = 0;
  const h = harness('../src/components/AppLoadingScreen.tsx', {
    'react-native': { View: 'View', Image: 'Image', Platform: { OS: platform } },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  });
  const props = { onReady: () => ready++, onError: (error: Error) => errors.push(error) };
  return {
    ...h,
    errors,
    ready: () => ready,
    render: () => h.render('AppLoadingScreen', props),
  };
}

test('startup uses the native splash logo and waits for its load and layout', () => {
  const h = loadingHarness();
  let tree = h.render();
  assert.equal(tree.props.children.length, 2);
  const logo = tree.props.children[1];
  assert.equal(logo.type, 'Image');
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const splash = config.expo.plugins.find((plugin: any) => plugin[0] === 'expo-splash-screen')[1];
  assert.equal(logo.props.source, splash.image.replace('./', '../../'));
  assert(logo.props.className.split(' ').includes(`w-[${splash.imageWidth}px]`));
  assert(logo.props.className.split(' ').includes(`h-[${splash.imageWidth}px]`));
  assert.equal(logo.props.resizeMode, 'contain');
  assert(tree.props.className.includes('items-center justify-center bg-white'));
  tree.props.onLayout();
  h.render();
  assert.equal(h.ready(), 0);
  tree.props.children[1].props.onLoad();
  tree = h.render();
  assert.equal(h.ready(), 1);
  const loadedFirst = loadingHarness();
  const loading = loadedFirst.render();
  loading.props.children[1].props.onLoad();
  loadedFirst.render();
  assert.equal(loadedFirst.ready(), 0);
  loading.props.onLayout();
  loadedFirst.render();
  assert.equal(loadedFirst.ready(), 1);
});

test('loading logo failure reaches retry UI without reporting readiness', () => {
  const h = loadingHarness();
  const tree = h.render();
  tree.props.onLayout();
  tree.props.children[1].props.onError({ nativeEvent: { error: 'wordmark image failed' } });
  h.render();
  assert.equal(h.errors[0].message, 'wordmark image failed');
  assert.equal(h.ready(), 0);
});

test('wordmark selects light and dark images, preserves its ratio and forwards image events', () => {
  const h = harness('../src/components/Wordmark.tsx', {
    'react-native': {
      Image: Object.assign('Image', { resolveAssetSource: () => ({ width: 5024, height: 2268 }) }),
    },
  });
  const onLoad = () => {};
  const onError = () => {};
  for (const mode of ['light', 'dark']) {
    const tree = h.render('Wordmark', { size: 45, mode, onLoad, onError });
    assert.equal(
      tree.props.source,
      `../../assets/ui/${mode === 'dark' ? 'wordmark-dark.png' : 'wordmark.png'}`,
    );
    assert.equal(tree.props.style.height, 45);
    assert.equal(tree.props.style.width, 45 * (5024 / 2268));
    assert.equal(tree.props.onLoad, onLoad);
    assert.equal(tree.props.onError, onError);
    assert.equal(tree.props.accessibilityLabel, 'TOOK');
  }
  assert.equal(h.render('Wordmark', {}).props.source, '../../assets/ui/wordmark.png');
});

test('loading artwork matches each platform native splash source and display size', () => {
  const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8'));
  const splash = config.expo.plugins.find((plugin: any) => plugin[0] === 'expo-splash-screen')[1];
  for (const platform of ['ios', 'android']) {
    const expected = platform === 'android' ? splash.android : splash;
    const logo = loadingHarness(platform).render().props.children[1];
    assert.equal(logo.props.source, expected.image.replace('./', '../../'));
    assert(logo.props.className.split(' ').includes(`w-[${expected.imageWidth}px]`));
    assert(logo.props.className.split(' ').includes(`h-[${expected.imageWidth}px]`));
    assert.equal(logo.props.resizeMode, 'contain');
  }
});
