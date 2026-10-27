import { mockI18n, formatDisplayDate, soberI18n } from './helpers/i18n';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
type Node = { type: string; props: any };

// Run the real picker handlers and re-render its draft state without native UI.
function picker(mode: 'AUTO' | 'MANUAL', days: number | null) {
  let language: 'ko' | 'en' = 'ko';
  const states: unknown[] = [];
  let cursor = 0;
  const exports: Record<string, Function> = {};
  const jsx = (type: string, props: any): Node => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/screens/sober/SoberGoalPicker.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/i18n/react')) return mockI18n(() => language);
        if (name.endsWith('/i18n/format')) return { formatDisplayDate };
        if (name.endsWith('/i18n/sober')) return soberI18n;
        if (name === 'react')
          return {
            useState: (initial: unknown) => {
              const index = cursor++;
              if (!(index in states)) states[index] = initial;
              return [
                states[index],
                (value: unknown) => {
                  states[index] = value;
                },
              ];
            },
          };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name.endsWith('/domain/sober')) return require('../src/domain/sober');
        if (name.endsWith('/domain/limits')) return require('../src/domain/limits');
        return Object.fromEntries(
          [
            'View',
            'TextInput',
            'Text',
            'Button',
            'BottomSheetModal',
            'PickerOption',
            'PickerAction',
          ].map((key) => [key, key]),
        );
      },
    },
  );
  const applied: unknown[][] = [];
  const render = () => {
    cursor = 0;
    const shell = exports.SoberGoalPicker({
      mode,
      days,
      onClose: () => undefined,
      onApply: (...args: unknown[]) => applied.push(args),
    });
    const body = [
      shell.props.children,
      shell.props.footer((afterClose: () => void) => afterClose()),
    ];
    const nodes: Node[] = [];
    const walk = (value: any) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value?.props) {
        nodes.push(value);
        walk(value.props.children);
      }
    };
    walk(body);
    const editor = nodes.find((node) => node.type === 'BottomSheetModal');
    const editorButton = editor?.props.footer((afterClose?: () => void) => {
      editor.props.onClose();
      afterClose?.();
      return true;
    });
    return {
      shell,
      editor,
      editorButton,
      cards: nodes.filter((node) => node.type === 'PickerAction'),
      options: nodes.filter((node) => node.type === 'PickerOption'),
      input: nodes.find((node) => node.type === 'TextInput'),
      button: nodes.find((node) => node.type === 'Button')!,
    };
  };
  return {
    render,
    applied,
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
  };
}

test('period and custom editors only commit to the goal card on completion', () => {
  const ui = picker('AUTO', null);
  let view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.title),
    ['자동 목표', '기간 선택', '직접 입력'],
  );
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [true, false, false],
  );
  assert.match(view.cards[0].props.note, /^\* 3일 → 7일/);
  assert.equal(view.editor, undefined);
  assert.equal(view.options.length, 0);
  assert.equal(view.input, undefined);

  view.cards[1].props.onPress();
  view = ui.render();
  assert.equal(view.editor!.props.title, '목표 기간 선택');
  assert.equal(view.shell.props.onBeforeClose(), false);
  assert.equal(view.shell.props.dismissOnBack, false);
  assert.equal(view.button.props.disabled, true);
  assert.equal(view.cards[0].props.selected, true);
  assert.equal(view.options.length, 9);
  view.options.find((option) => option.props.accessibilityLabel === '1개월')!.props.onPress();
  assert.equal(ui.render().cards[0].props.selected, true);
  ui.render().editorButton.props.onPress();
  view = ui.render();
  assert.equal(view.editor, undefined);
  assert.equal(view.options.length, 0);
  assert.equal(view.shell.props.onBeforeClose(), true);
  assert.equal(view.shell.props.dismissOnBack, true);
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, true, false],
  );
  assert.equal(view.cards[1].props.note, '선택한 목표: 1개월');
  assert.equal(ui.applied.length, 0);
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 30]);

  view.cards[2].props.onPress();
  view = ui.render();
  assert.equal(view.editor!.props.title, '목표 일수 입력');
  assert.equal(view.input!.props.value, '30');
  view.input!.props.onChangeText('12');
  ui.render().editorButton.props.onPress();
  view = ui.render();
  assert.equal(view.input, undefined);
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, false, true],
  );
  assert.equal(view.cards[2].props.note, '선택한 목표: 12일');
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 12]);

  view.cards[1].props.onPress();
  view = ui.render();
  assert.equal(
    view.options.find((option) => option.props.selected)!.props.accessibilityLabel,
    '7일',
  );
  view.editorButton.props.onPress();
  view = ui.render();
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 7]);
  view.cards[0].props.onPress();
  ui.render().button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['AUTO', null]);
});

test('dismissing an editor discards its candidate and preserves the previous method and days', () => {
  const ui = picker('MANUAL', 30);
  let view = ui.render();
  assert.equal(view.input, undefined);
  assert.equal(view.options.length, 0);
  view.cards[1].props.onPress();
  view = ui.render();
  assert.equal(
    view.options.find((option) => option.props.selected)!.props.accessibilityLabel,
    '1개월',
  );
  view.options.find((option) => option.props.accessibilityLabel === '3일')!.props.onPress();
  ui.render().editor!.props.onClose();
  view = ui.render();
  assert.equal(view.cards[1].props.note, '선택한 목표: 1개월');
  view.cards[2].props.onPress();
  ui.render().input!.props.onChangeText('99');
  ui.render().editor!.props.onClose();
  view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, true, false],
  );
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 30]);
  view.cards[2].props.onPress();
  assert.equal(ui.render().input!.props.value, '30');

  const automatic = picker('AUTO', null);
  automatic.render().cards[1].props.onPress();
  automatic.render().editor!.props.onClose();
  automatic.render().button.props.onPress();
  assert.deepEqual(automatic.applied.at(-1), ['AUTO', null]);
});

test('custom days retain saved values and reject invalid entries before they can affect the goal', () => {
  const ui = picker('MANUAL', 12);
  let view = ui.render();
  assert.equal(view.cards[2].props.selected, true);
  assert.equal(view.input, undefined);
  view.cards[2].props.onPress();
  assert.equal(ui.render().input!.props.value, '12');
  for (const value of ['', '0', '-1', '1.5', '36501', 'abc', ' 7']) {
    ui.render().input!.props.onChangeText(value);
    view = ui.render();
    assert.equal(view.editorButton.props.disabled, true);
    view.editorButton.props.onPress();
    assert(view.editor);
    assert.equal(view.cards[2].props.note, '선택한 목표: 12일');
    assert.equal(ui.applied.length, 0);
  }
  for (const value of ['1', '36500', '00007']) {
    ui.render().input!.props.onChangeText(value);
    view = ui.render();
    assert.equal(view.editorButton.props.disabled, false);
    view.editorButton.props.onPress();
    view = ui.render();
    assert.equal(view.cards[2].props.note, `선택한 목표: ${Number(value)}일`);
    view.button.props.onPress();
    assert.deepEqual(ui.applied.at(-1), ['MANUAL', Number(value)]);
    view.cards[2].props.onPress();
  }
});

test('English custom goal rejects zero, preserves the draft across languages and keeps MANUAL days', () => {
  const ui = picker('AUTO', null);
  ui.setLanguage('en');
  assert.equal(ui.render().shell.props.title, 'How long would you like to cut back?');
  ui.render().cards[2].props.onPress();
  assert.equal(ui.render().input!.props.accessibilityLabel, 'Custom goal days');
  ui.render().input!.props.onChangeText('0');
  assert.equal(ui.render().editorButton!.props.disabled, true);
  ui.render().input!.props.onChangeText('123');
  ui.render().editorButton!.props.onPress();
  assert.equal(ui.render().cards[2].props.note, 'Selected goal: 123 days');
  ui.setLanguage('ko');
  assert.equal(ui.render().cards[2].props.note, '선택한 목표: 123일');
  ui.render().button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 123]);
});
