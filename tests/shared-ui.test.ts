import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function load(name: string, colors: Record<string, string> = {}) {
  const exports: Record<string, Function> = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/components/${name}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (dependency === 'react-native')
          return {
            Pressable: 'Pressable',
            ActivityIndicator: 'ActivityIndicator',
            View: 'View',
            Image: 'Image',
          };
        if (dependency.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ iconSizes: { md: 24 }, colors }) };
        return { Text: 'Text', AppIcon: 'AppIcon' };
      },
    },
  );
  return exports[name];
}

test('shared submit button retains busy/disabled accessibility, loading indicator and submit callback', () => {
  const button = load('FormSubmitButton');
  let writes = 0;
  const saving = button({
    label: '저장 중...',
    loading: true,
    disabled: true,
    accessibilityState: { selected: true },
  });
  assert.equal(saving.props.disabled, true);
  assert.equal(saving.props.accessibilityState.busy, true);
  assert.equal(saving.props.accessibilityState.selected, true);
  assert.equal(saving.props.children[0].type, 'ActivityIndicator');
  const ready = button({ label: '저장하기', onPress: () => writes++ });
  assert.equal(ready.props.accessibilityState.busy, false);
  assert.equal(ready.props.children[0], false);
  ready.props.onPress();
  assert.equal(writes, 1);
});

test('shared underline tab retains selection, accessibility and the caller selection action', () => {
  const tab = load('UnderlineTab');
  let selected = 'top';
  const bottom = tab({
    selected: false,
    children: '하위 Top 3',
    accessibilityLabel: '하위 기록',
    onPress: () => {
      selected = 'bottom';
    },
  });
  assert.equal(bottom.props.accessibilityRole, 'tab');
  assert.equal(bottom.props.accessibilityState.selected, false);
  assert.equal(bottom.props.accessibilityLabel, '하위 기록');
  bottom.props.onPress();
  assert.equal(selected, 'bottom');
  assert.equal(
    tab({ selected: true, children: '하위 Top 3' }).props.accessibilityState.selected,
    true,
  );
});

test('shared menu button passes each record menu label, disabled state and opening action through', () => {
  const menu = load('RecordMenuButton');
  let opened = 0;
  const node = menu({
    accessibilityLabel: '일기 메뉴',
    accessibilityState: { expanded: true, disabled: true },
    disabled: true,
    onPress: () => opened++,
  });
  assert.equal(node.props.accessibilityLabel, '일기 메뉴');
  assert.equal(node.props.accessibilityState.expanded, true);
  assert.equal(node.props.disabled, true);
  node.props.onPress();
  assert.equal(opened, 1);
});

test('organic badges follow theme changes and keep restart color independent', () => {
  for (const colors of [
    { accent: '#8CADE2', accentDeep: '#7C9BCE', soberRestart: '#DA909C' },
    { accent: '#629E9A', accentDeep: '#4D817E', soberRestart: '#DA909C' },
  ]) {
    const badge = load('OrganicBadge', colors);
    for (const [tone, expected] of [
      ['home', colors.accent],
      ['calendar', colors.accentDeep],
      ['restart', colors.soberRestart],
    ]) {
      const node = badge({ tone, children: 3 });
      assert.equal(node.props.children[0].props.style.tintColor, expected);
      assert.equal(node.props.children[1].props.children, 3);
    }
  }
});
