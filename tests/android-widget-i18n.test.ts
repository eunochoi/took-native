import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { mockI18n } from './helpers/i18n';
import { defaultWidgetSettings } from '../src/widgets/sober/model';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function configuration(records: any[] = [{ id: 1, name: '나의 기록' }]) {
  let language: 'ko' | 'en' = 'en';
  const states = new Map<string, any[]>();
  let slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let failSave = false;
  let failLoad = false;
  let back = () => false;
  const saved: any[] = [];
  const rendered: any[] = [];
  const results: string[] = [];
  const db = {};
  const appSettings = { themeAccent: 'purple' };
  const props = {
    widgetInfo: { widgetId: 10, width: 180, height: 180 },
    renderWidget: (tree: any) => rendered.push(tree),
    setResult: (result: string) => results.push(result),
  };
  const effect = (callback: () => any, deps: unknown[]) => {
    const index = cursor++;
    const previous = slots[index];
    if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    const record = { deps, cleanup: undefined as any };
    slots[index] = record;
    effects.push(() => {
      previous?.cleanup?.();
      record.cleanup = callback();
    });
  };
  const modules: any = {
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    react: {
      useState: (initial: any) => {
        const index = cursor++;
        const state = slots;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value: any) => {
            state[index] = typeof value === 'function' ? value(state[index]) : value;
          },
        ];
      },
      useEffect: effect,
      useCallback: (callback: any, deps: unknown[]) => {
        const index = cursor++;
        if (!slots[index] || deps.some((value, i) => !Object.is(value, slots[index].deps[i])))
          slots[index] = { deps, callback };
        return slots[index].callback;
      },
    },
    'react-native': {
      View: 'View',
      ScrollView: 'ScrollView',
      Text: 'NativeText',
      ActivityIndicator: 'Spinner',
      BackHandler: {
        addEventListener: (_event: any, listener: any) => {
          back = listener;
          return { remove: () => {} };
        },
      },
    },
    'react-native-gesture-handler': { GestureHandlerRootView: 'Root' },
    'react-native-safe-area-context': {
      SafeAreaProvider: 'SafeAreaProvider',
      SafeAreaView: 'SafeAreaView',
    },
    'expo-sqlite': { SQLiteProvider: 'SQLiteProvider', useSQLiteContext: () => db },
    'react-native-android-widget': { WidgetPreview: 'Preview' },
    '../../settings/SettingsProvider': {
      SettingsProvider: 'SettingsProvider',
      useSettings: () => ({ settings: appSettings }),
    },
    '../../theme/AppThemeProvider': { AppThemeProvider: 'AppThemeProvider' },
    '../../theme/classes': {},
    '../../db/schema': { initializeDatabase: () => {} },
    '../../db/sober': {
      getSoberList: async () => {
        if (failLoad) throw new Error('failed');
        return records;
      },
      getSoberRestarts: async () => [],
    },
    '../../db': { withReadLock: (work: any) => work() },
    './model': { defaultWidgetSettings },
    './storage': {
      loadWidgetSettings: async () => (records.length ? defaultWidgetSettings(1) : null),
      saveWidgetSettings: async (id: number, value: any) => {
        if (failSave) throw new Error('failed');
        saved.push({ id, value: { ...value } });
      },
    },
    './task': { renderSoberWidget: async () => ({ language }) },
    './SoberWidget': { SoberWidget: 'Widget' },
    './WidgetAppearanceFields': { WidgetAppearanceFields: 'Appearance' },
  };
  const load = (file: string) => {
    const exports: any = {};
    runInNewContext(
      ts.transpileModule(
        readFileSync(new URL(`../src/widgets/sober/${file}.tsx`, import.meta.url), 'utf8'),
        {
          compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
        },
      ).outputText,
      {
        exports,
        Error,
        require: (name: string) => {
          if (name.endsWith('/i18n/react')) return mockI18n(() => language);
          if (name in modules) return modules[name];
          const component = name.split('/').at(-1)!;
          if (['Button', 'Text', 'PickerOption', 'BottomSheetModal'].includes(component))
            return { [component]: component };
          throw new Error(`Unexpected dependency: ${name}`);
        },
      },
    );
    return exports;
  };
  const run = (component: any, value: any, key: string) => {
    slots = states.get(key) ?? [];
    states.set(key, slots);
    cursor = 0;
    effects = [];
    const tree = component(value);
    effects.splice(0).forEach((callback) => callback());
    return tree;
  };
  const outer = load('ConfigurationScreen').SoberWidgetConfiguration;
  const root = () => run(outer, props, 'outer');
  const child = nodes(root()).find(
    (node) => typeof node.type === 'function' && node.type.name === 'ConfigurationContent',
  );
  const appearance = load('WidgetAppearanceFields').WidgetAppearanceFields;
  return {
    render: () => run(child.type, props, 'content'),
    root,
    appearance: (value: any) => run(appearance, value, 'appearance'),
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
    failSave: (value: boolean) => {
      failSave = value;
    },
    failLoad: () => {
      failLoad = true;
    },
    back: () => back(),
    saved,
    rendered,
    results,
  };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('widget configuration translates previews and appearance while preserving selected IDs through retry', async () => {
  const ui = configuration();
  ui.render();
  await tick();
  let tree = ui.render();
  assert(nodes(tree).some((node) => node.props.children === 'Cut Back settings'));
  const preview = () =>
    nodes(ui.render())
      .find((node) => node.type === 'Preview')
      .props.renderWidget({ width: 180, height: 180 });
  assert.equal(preview().props.language, 'en');
  assert.equal(preview().props.themeAccent, 'purple');
  assert.equal(preview().props.sober.name, '나의 기록');
  const appearanceProps = nodes(tree).find((node) => node.type === 'Appearance').props;
  const choices = nodes(ui.appearance(appearanceProps)).filter(
    (node) => node.type === 'PickerOption',
  );
  assert.deepEqual(
    choices.map((node) => node.props.accessibilityLabel),
    ['White background', 'Black background', 'Transparent background', 'Black text', 'White text'],
  );
  choices[1].props.onPress();
  choices[4].props.onPress();
  const apply = () =>
    nodes(ui.render()).find(
      (node) => node.type === 'Button' && ['Apply', '적용'].includes(node.props.label),
    );
  ui.failSave(true);
  apply().props.onPress();
  await tick();
  assert(
    nodes(ui.render()).some(
      (node) => node.props.children === 'Could not save widget settings. Please try again.',
    ),
  );
  assert.deepEqual(ui.results, []);
  ui.setLanguage('ko');
  assert.equal(preview().props.language, 'ko');
  assert.equal(preview().props.settings.background, 'black');
  assert.equal(preview().props.settings.textColor, 'white');
  assert(
    nodes(ui.render()).some(
      (node) => node.props.children === '위젯 설정을 저장하지 못했어요. 다시 시도해주세요.',
    ),
  );
  ui.failSave(false);
  apply().props.onPress();
  await tick();
  assert.deepEqual(ui.saved, [
    { id: 10, value: { soberId: 1, background: 'black', textColor: 'white' } },
  ]);
  assert.deepEqual(ui.results, ['ok']);
  assert.equal(ui.rendered.length, 1);
});

test('empty and failed widget configurations show English guidance and preserve cancellation', async () => {
  const empty = configuration([]);
  empty.render();
  await tick();
  let tree = empty.render();
  assert(
    nodes(tree).some((node) => node.props.children === 'Add a Cut Back item in the app first.'),
  );
  assert.equal(
    nodes(tree).find((node) => node.type === 'Button' && node.props.label === 'Apply').props
      .disabled,
    true,
  );
  assert.equal(empty.back(), true);
  assert.deepEqual(empty.results, ['cancel']);
  const failed = configuration();
  failed.failLoad();
  failed.render();
  await tick();
  assert(
    nodes(failed.render()).some(
      (node) => node.props.children === 'Could not load items. Reopen widget settings.',
    ),
  );
  const root = failed.root();
  nodes(root)
    .find((node) => node.type === 'SettingsProvider')
    .props.onError(new Error('settings failed'));
  assert(
    nodes(failed.root()).some(
      (node) => node.props.children === 'Could not load settings. Please try again.',
    ),
  );
});
