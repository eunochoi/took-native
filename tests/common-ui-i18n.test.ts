import { translateErrorMessage } from '../src/i18n/errors';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import tokens from '../src/theme/tokens.json';
import { mockI18n } from './helpers/i18n';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any, type?: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== 'object') return [];
  return [...(!type || tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
function harness() {
  let language: 'ko' | 'en' = 'ko';
  const components = new Map<string, any>();
  const Tabs = Object.assign(() => {}, { Screen: 'Tab' });
  const Image = Object.assign(() => {}, {
    resolveAssetSource: () => ({ width: 400, height: 100 }),
  });
  const theme = {
    colors: {},
    rem: 15,
    iconSizes: { md: 24 },
    navigationHeight: 64,
    navigationBottom: 20,
  };
  function load(path: string, name: string) {
    if (components.has(path)) return components.get(path)[name];
    const exports: any = {};
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      {
        exports,
        require: (dependency: string) => {
          if (dependency.endsWith('/i18n/errors')) return { translateErrorMessage };
          if (dependency.endsWith('/i18n/react')) return mockI18n(() => language);
          if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx };
          if (dependency === 'react')
            return {
              useState: (value: unknown) => [value, () => {}],
              useRef: (current: unknown) => ({ current }),
              useEffect: () => {},
            };
          if (dependency === 'react-native')
            return {
              View: 'View',
              Pressable: 'Pressable',
              Switch: 'Switch',
              ActivityIndicator: 'Spinner',
              Image,
              Platform: { OS: 'ios', select: (values: any) => values.ios },
              Easing: { ease: 0, out: () => 0 },
            };
          if (dependency === 'expo-router')
            return { Tabs, useRouter: () => ({ canGoBack: () => false, replace: () => {} }) };
          if (dependency === 'react-native-safe-area-context')
            return { useSafeAreaInsets: () => ({ top: 0 }) };
          if (dependency === 'tailwind-merge') return require(dependency);
          if (dependency.endsWith('/tokens.json')) return tokens;
          if (dependency.endsWith('/AppThemeProvider')) return { useAppTheme: () => theme };
          if (dependency.endsWith('/SettingsProvider'))
            return { useSettings: () => ({ settings: { themeAccent: 'blue' } }) };
          if (dependency.endsWith('.png')) return dependency;
          if (dependency === 'expo-status-bar') return { StatusBar: 'StatusBar' };
          const component = dependency.split('/').at(-1)!;
          return { [component]: component };
        },
      },
    );
    components.set(path, exports);
    return exports[name];
  }
  return {
    load,
    component: (name: string) => load(`src/components/${name}.tsx`, name),
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
  };
}

test('tab titles and navigation accessibility names switch language while keeping route identities', () => {
  const h = harness();
  const layout = h.load('app/(tabs)/_layout.tsx', 'default');
  const nav = h.component('BottomNav');
  const names = ['index', 'calendar', 'diary', 'habit', 'sober', 'setting'];
  const routes = names.map((name) => ({ name, key: `${name}-key` }));
  const navigated: string[] = [];
  const props = {
    state: { index: 0, routes },
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => navigated.push(name),
    },
  };
  for (const language of ['ko', 'en', 'ko'] as const) {
    h.setLanguage(language);
    const expected =
      language === 'en'
        ? ['Home', 'Calendar', 'Diary', 'Habits', 'Cut Back', 'Settings']
        : ['홈', '월간 기록', '일기 목록', '습관 관리', '거리두기', '설정'];
    const tabs = nodes(layout(), 'Tab');
    assert.deepEqual(
      tabs.map((node) => node.props.options.title),
      expected,
    );
    assert.deepEqual(
      tabs.map((node) => node.props.name),
      names,
    );
    const tree = nav(props);
    const buttons = nodes(tree, 'Pressable');
    assert.deepEqual(
      buttons.map((node) => node.props.accessibilityLabel),
      expected,
    );
    assert.equal(
      nodes(tree).find((node) => node.props.accessibilityRole === 'tablist').props
        .accessibilityLabel,
      language === 'en' ? 'Main menu' : '주요 메뉴',
    );
    buttons[4].props.onPress();
  }
  assert.deepEqual(navigated, ['sober', 'sober', 'sober']);
});

test('common default actions switch language and caller-provided labels remain intact', () => {
  const h = harness();
  const confirm = h.component('ConfirmModal');
  const queryError = h.component('QueryError');
  const add = h.component('ToolbarAddButton');
  const header = h.component('BottomSheetHeader');
  const props = {
    visible: true,
    title: 'Delete?',
    message: 'Example',
    confirmLabel: 'Delete',
    onCancel: () => {},
    onConfirm: () => {},
  };
  for (const language of ['en', 'ko'] as const) {
    h.setLanguage(language);
    const expectedCancel = language === 'en' ? 'Cancel' : '취소';
    const modal = confirm(props);
    assert.equal(
      nodes(
        modal.props.footer(() => true),
        'Button',
      )[0].props.label,
      expectedCancel,
    );
    assert.equal(
      nodes(
        confirm({ ...props, cancelLabel: 'Keep it' }).props.footer(() => true),
        'Button',
      )[0].props.label,
      'Keep it',
    );
    const error = queryError({ message: 'Original service message', onRetry: () => {} });
    assert.equal(
      nodes(error, 'Pressable')[0].props.accessibilityLabel,
      language === 'en' ? 'Try again' : '다시 시도',
    );
    assert.equal(nodes(error, 'Text')[0].props.children, 'Original service message');
    assert.equal(
      add({ onPress: () => {} }).props.accessibilityLabel,
      language === 'en' ? 'Add' : '추가',
    );
    assert.equal(
      add({ label: 'Add photo', onPress: () => {} }).props.accessibilityLabel,
      'Add photo',
    );
    assert.equal(
      nodes(header({ onClose: () => {} }), 'Pressable')[0].props.accessibilityLabel,
      language === 'en' ? 'Close' : '닫기',
    );
  }
  h.setLanguage('en');
  assert.equal(
    nodes(h.component('RecordHeader')({ title: 'Record' }), 'Pressable')[0].props
      .accessibilityLabel,
    'Back',
  );
  assert.equal(h.component('Wordmark')({}).props.accessibilityLabel, 'BlooLog logo');
  assert.equal(
    h.component('AppLoadingScreen')({ onReady: () => {}, onError: () => {} }).props
      .accessibilityLabel,
    'BlooLog launch screen',
  );
  assert.equal(
    nodes(h.component('QueryState')({ query: { isPending: true, error: null } }), 'Spinner')[0]
      .props.accessibilityLabel,
    'Loading records',
  );
});

test('English filter actions retain reset and deferred apply semantics', () => {
  const h = harness();
  h.setLanguage('en');
  const events: string[] = [];
  const filter = h.component('FilterSheet')({
    title: 'Diary filters',
    resetInHeader: true,
    onReset: () => events.push('reset'),
    onApply: () => events.push('apply'),
    onClose: () => {},
  });
  assert.equal(filter.props.headerAction.props.accessibilityLabel, 'Reset selection');
  filter.props.headerAction.props.onPress();
  const apply = nodes(
    filter.props.footer((action: () => void) => {
      events.push('close');
      action();
    }),
    'Button',
  )[0];
  assert.equal(apply.props.label, 'Apply');
  assert.equal(apply.props.accessibilityLabel, 'Apply Diary filters');
  apply.props.onPress();
  assert.deepEqual(events, ['reset', 'close', 'apply']);
});

test('English sort choices and summaries preserve custom-order priority exclusion and stored enum values', () => {
  const h = harness();
  h.setLanguage('en');
  const sort = h.component('RecordSortPicker');
  const applied: unknown[][] = [];
  const tree = sort({
    title: 'Sort',
    sort: 'CUSTOM',
    priorityFirst: true,
    allowCustom: true,
    onClose: () => {},
    onApply: (...args: unknown[]) => applied.push(args),
  });
  assert.deepEqual(
    nodes(tree, 'PickerOption').map((node) => node.props.accessibilityLabel),
    ['Newest first', 'Oldest first', 'Custom'],
  );
  assert.equal(nodes(tree, 'Switch')[0].props.value, false);
  const text = nodes(tree, 'Text')
    .map((node) => node.props.children)
    .join(' ');
  assert(!/[가-힣]/.test(text));
  assert(
    nodes(tree, 'InfoNotice').some((node) => node.props.children === 'Shown in your chosen order.'),
  );
  tree.props.footer((action: () => void) => action()).props.onPress();
  assert.deepEqual(applied, [['CUSTOM', false]]);
  const toolbar = h.component('ToolbarSortButton')({
    sort: 'ASC',
    priorityFirst: true,
    recordSort: 'ASC',
    accessibilityLabel: 'Sort records',
    onPress: () => {},
  });
  assert.equal(toolbar.props.label, 'Priority · Short streak · Oldest');
  assert(!/[가-힣]/.test(toolbar.props.accessibilityLabel));
});
