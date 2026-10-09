import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

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

function harness() {
  const slots: any[] = [];
  let cursor = 0;
  const react = {
    useState: (initial: any) => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (value: any) => {
          slots[i] = value;
        },
      ];
    },
    useRef: (initial: any) => {
      const i = cursor++;
      return slots[i] ?? (slots[i] = { current: initial });
    },
  };
  const component = load('../src/screens/settings/AppearanceSettingsPicker.tsx', {
    react,
    'react-native': { View: 'View' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    '../../components/Button': { Button: 'Button' },
    '../../components/PickerOption': { PickerOption: 'Option' },
    '../../components/Text': { Text: 'Text' },
  }).AppearanceSettingsPicker;
  let apply: (value: string) => Promise<void> = async () => {};
  const applied: string[] = [];
  let closes = 0;
  return {
    applied,
    closes: () => closes,
    setApply: (next: typeof apply) => {
      apply = next;
    },
    render: (value = 'light') => {
      cursor = 0;
      const modal = component({
        title: '배경 색상',
        value,
        values: ['light', 'dark', 'system'],
        labels: { light: '밝게', dark: '어둡게', system: '시스템' },
        onClose: () => {
          closes++;
        },
        onApply: async (next: string) => {
          applied.push(next);
          await apply(next);
        },
      });
      return {
        modal,
        options: nodes(modal.props.children, 'Option'),
        texts: nodes(modal.props.children, 'Text'),
        save: modal.props.footer(() => {
          closes++;
        }).props,
      };
    },
  };
}

test('appearance selection stays temporary, cancel discards it and reopening uses persisted settings', () => {
  const ui = harness();
  assert.equal(ui.render().options[0].props.selected, true);
  ui.render().options[1].props.onPress();
  assert.equal(ui.render().options[1].props.selected, true);
  assert.deepEqual(ui.applied, []);
  ui.render().modal.props.onClose();
  assert.deepEqual(ui.applied, []);
  const reopened = harness();
  assert.equal(reopened.render('system').options[2].props.selected, true);
});

test('appearance save prevents duplicate submissions and dismissal until persistence completes', async () => {
  const ui = harness();
  let finish!: () => void;
  ui.setApply(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  ui.render().options[1].props.onPress();
  const save = ui.render().save.onPress;
  const pending = save();
  await save();
  assert.deepEqual(ui.applied, ['dark']);
  assert.equal(ui.render().modal.props.onBeforeClose(), false);
  assert.equal(ui.render().save.disabled, true);
  assert(ui.render().options.every((option) => option.props.disabled));
  assert.equal(ui.closes(), 0);
  finish();
  await pending;
  assert.equal(ui.closes(), 1);
  assert.equal(ui.render().modal.props.onBeforeClose(), true);
});

test('failed appearance saves keep the selection open for retry and clear errors on success', async () => {
  const ui = harness();
  ui.setApply(async () => {
    throw new Error('저장 실패');
  });
  ui.render().options[2].props.onPress();
  await ui.render().save.onPress();
  assert.equal(ui.closes(), 0);
  assert.equal(ui.render().options[2].props.selected, true);
  assert.equal(ui.render().save.disabled, false);
  assert(ui.render().texts.some((text) => text.props.children === '저장 실패'));
  ui.setApply(async () => {});
  await ui.render().save.onPress();
  assert.deepEqual(ui.applied, ['system', 'system']);
  assert.equal(ui.closes(), 1);
  assert(!ui.render().texts.some((text) => text.props.accessibilityRole === 'alert'));
});

test('appearance rows open the correct picker and forward only the saved setting', async () => {
  const slots: any[] = [];
  let cursor = 0;
  const applied: any[] = [];
  const changed: any[] = [];
  const component = load('../src/screens/settings/AppearanceSettingsSection.tsx', {
    react: {
      useState: (initial: any) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [
          slots[i],
          (next: any) => {
            slots[i] = next;
          },
        ];
      },
    },
    'react-native': { View: 'View', Pressable: 'Pressable' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/Text': { Text: 'Text' },
    '../../theme/accents': { ACCENT_KEYS: [], ACCENT_LABELS: {} },
    '../../theme/colors': { ACCENT_PALETTES: {} },
    './AppearanceSettingsPicker': { AppearanceSettingsPicker: 'Picker' },
  }).AppearanceSettingsSection;
  const render = (disabled = false) => {
    cursor = 0;
    return component({
      settings: { themeMode: 'dark', fontSize: 'normal' },
      disabled,
      onChange: (patch: any) => changed.push(patch),
      onApply: async (patch: any) => {
        applied.push(patch);
      },
    });
  };
  assert(nodes(render(true), 'Pressable').every((row) => row.props.disabled));
  const rows = nodes(render(), 'Pressable');
  assert.equal(rows[0].props.accessibilityLabel, '배경 색상, 어둡게');
  rows[0].props.onPress();
  let picker = nodes(render(), 'Picker')[0];
  assert.equal(picker.props.value, 'dark');
  assert.equal(applied.length, 0);
  await picker.props.onApply('light');
  assert.equal(applied[0].themeMode, 'light');
  picker.props.onClose();
  assert.equal(nodes(render(), 'Picker').length, 0);
  nodes(render(), 'Pressable')[1].props.onPress();
  picker = nodes(render(), 'Picker')[0];
  assert.equal(picker.props.title, '폰트 크기');
  assert.equal(picker.props.value, 'normal');
  await picker.props.onApply('large');
  assert.equal(applied[1].fontSize, 'large');
  assert.deepEqual(changed, []);
});
