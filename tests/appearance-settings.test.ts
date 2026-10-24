import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings/model';
import { ACCENT_KEYS, ACCENT_LABELS } from '../src/theme/accents';
import { ACCENT_PALETTES } from '../src/theme/colors';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any, type: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== 'object') return [];
  return [
    ...(tree.type === type ? [tree] : []),
    ...[tree.props?.children].flat().flatMap((child) => nodes(child, type)),
  ];
}

function load(path: string, dependencies: Record<string, unknown>) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      Error,
      require: (name: string) => {
        assert(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}

function harness(rem = 15) {
  const changed: Partial<Settings>[] = [];
  const component = load('../src/screens/settings/AppearanceSettingsSection.tsx', {
    'react-native': { View: 'View', Pressable: 'Pressable' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/AppIcon': { AppIcon: 'Icon' },
    '../../components/PickerOption': { PickerOption: 'Option' },
    '../../components/Text': { Text: 'Text' },
    '../../theme/AppThemeProvider': { useAppTheme: () => ({ rem }) },
    '../../theme/accents': { ACCENT_KEYS, ACCENT_LABELS },
    '../../theme/colors': { ACCENT_PALETTES },
    './EmotionIconStyleSelector': { EmotionIconStyleSelector: 'EmotionSelector' },
  }).AppearanceSettingsSection;
  return {
    changed,
    render: (settings: Partial<Settings> = {}, disabled = false, dimmed = disabled) =>
      component({
        settings: { ...DEFAULT_SETTINGS, ...settings },
        disabled,
        dimmed,
        onChange: (patch: Partial<Settings>) => changed.push(patch),
      }),
  };
}

test('background and font size each expose three visual choices and save immediately', () => {
  const ui = harness();
  const tree = ui.render();
  const options = nodes(tree, 'Option');
  assert.equal(options.length, 6);
  assert.deepEqual(
    options.map((option) => option.props.accessibilityLabel),
    [
      '배경 색상, 밝게',
      '배경 색상, 어둡게',
      '배경 색상, 자동, 기기 설정 따르기',
      '폰트 크기, 작게',
      '폰트 크기, 보통',
      '폰트 크기, 크게',
    ],
  );
  assert.deepEqual(
    nodes(tree, 'Icon').map((icon) => icon.props.name),
    ['theme-light', 'theme-dark', 'theme-system'],
  );
  assert(options.every((option) => option.props.className.split(' ').includes('h-28')));
  assert(options.every((option) => option.props.className.split(' ').includes('py-4')));
  assert(
    options.every((option) => option.props.children[0].props.className.split(' ').includes('h-10')),
  );
  assert(
    options.every((option) =>
      option.props.children[1].props.className.split(' ').includes('leading-5'),
    ),
  );
  const previews = nodes(tree, 'Text').filter((text) => text.props.children === '가나다');
  assert.equal(previews.length, 3);
  for (const [index, size] of [13, 17, 23].entries()) {
    assert.equal(previews[index].props.size, size);
    assert.equal(previews[index].props.numberOfLines, 1);
    assert.equal(previews[index].props.adjustsFontSizeToFit, true);
  }
  for (const option of options) option.props.onPress();
  assert.deepEqual(
    ui.changed.map((patch) => ({ ...patch })),
    [
      { themeMode: 'light' },
      { themeMode: 'dark' },
      { themeMode: 'system' },
      { fontSize: 'small' },
      { fontSize: 'normal' },
      { fontSize: 'large' },
    ],
  );
});

test('font previews keep fixed sizes and line heights at every app root size', () => {
  for (const [rem, fontSize] of [
    [14, 'small'],
    [15, 'normal'],
    [16, 'large'],
  ] as const) {
    const tree = harness(rem).render({ fontSize });
    const previews = nodes(tree, 'Text').filter((text) => text.props.children === '가나다');
    assert.deepEqual(
      previews.map((preview) => preview.props.size),
      [13, 17, 23],
    );
    assert.deepEqual(
      previews.map((preview) => preview.props.style.lineHeight),
      [16.25, 21.25, 28.75],
    );
    assert(previews.every((preview) => preview.props.allowFontScaling === false));
  }
});

test('appearance selections and right-side labels follow persisted settings', () => {
  const ui = harness();
  const tree = ui.render({
    themeMode: 'system',
    fontSize: 'large',
    emotionStyle: 'simple',
    themeAccent: 'purple',
  });
  const options = nodes(tree, 'Option');
  assert.deepEqual(
    options
      .filter((option) => option.props.selected)
      .map((option) => option.props.accessibilityLabel),
    ['배경 색상, 자동, 기기 설정 따르기', '폰트 크기, 크게'],
  );
  const texts = nodes(tree, 'Text');
  assert.deepEqual(
    texts
      .filter((text) => text.props.accessibilityRole === 'header')
      .map((text) => text.props.children),
    ['화면 꾸미기'],
  );
  for (const label of ['단순형', '보라', '자동', '크게']) {
    assert(
      texts.some(
        (text) => text.props.children === label && text.props.className.includes('ml-auto'),
      ),
    );
  }
  const colors = nodes(tree, 'Pressable');
  assert.equal(colors.length, 6);
  assert.equal(colors.filter((color) => color.props.accessibilityState.checked).length, 1);
  colors.find((color) => color.props.accessibilityLabel === '초록 강조 색상')!.props.onPress();
  assert.equal(ui.changed[0].themeAccent, 'green');
  const emotion = nodes(tree, 'EmotionSelector')[0];
  assert.equal(emotion.props.value, 'simple');
  emotion.props.onChange('emoji');
  assert.equal(ui.changed[1].emotionStyle, 'emoji');
  const updated = nodes(ui.render({ themeMode: 'dark', fontSize: 'small' }), 'Option');
  assert.deepEqual(
    updated
      .filter((option) => option.props.selected)
      .map((option) => option.props.accessibilityLabel),
    ['배경 색상, 어둡게', '폰트 크기, 작게'],
  );
});

test('all appearance choices disable during saves and retain the existing dimming behavior', () => {
  const ui = harness();
  for (const dimmed of [true, false]) {
    const tree = ui.render({}, true, dimmed);
    const options = nodes(tree, 'Option');
    assert(options.every((option) => option.props.disabled));
    assert(
      options.every((option) =>
        option.props.className.includes(dimmed ? 'opacity-40' : 'opacity-100'),
      ),
    );
    assert(nodes(tree, 'Pressable').every((color) => color.props.disabled));
    const emotion = nodes(tree, 'EmotionSelector')[0];
    assert.equal(emotion.props.disabled, true);
    assert.equal(emotion.props.dimmed, dimmed);
  }
});
