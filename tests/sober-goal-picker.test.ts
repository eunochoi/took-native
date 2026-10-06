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
    const body = shell.props.children((afterClose: () => void) => afterClose());
    const nodes: Node[] = [];
    const walk = (value: any) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value?.props) {
        nodes.push(value);
        walk(value.props.children);
      }
    };
    walk(body);
    return {
      cards: nodes.filter((node) => node.type === 'PickerAction'),
      options: nodes.filter((node) => node.type === 'PickerOption'),
      input: nodes.find((node) => node.type === 'TextInput'),
      button: nodes.find((node) => node.type === 'Button')!,
    };
  };
  return { render, applied };
}

test('goal methods are mutually exclusive through automatic, period and custom transitions', () => {
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
  view.cards[1].props.onPress();
  view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, true, false],
  );
  assert.equal(view.options.length, 9);
  view.cards[2].props.onPress();
  view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, false, true],
  );
  assert.equal(view.options.length, 0);
  view.input!.props.onChangeText('12');
  ui.render().button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 12]);
  ui.render().cards[1].props.onPress();
  view = ui.render();
  assert.equal(view.options.filter((option) => option.props.selected).length, 1);
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['MANUAL', 7]);
  view.cards[0].props.onPress();
  view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [true, false, false],
  );
  assert.equal(view.input, undefined);
  assert.equal(view.options.length, 0);
  view.button.props.onPress();
  assert.deepEqual(ui.applied.at(-1), ['AUTO', null]);
});

test('saved manual values restore the correct method and invalid custom input blocks apply', () => {
  assert.deepEqual(
    picker('MANUAL', 30)
      .render()
      .cards.map((card) => card.props.selected),
    [false, true, false],
  );
  const ui = picker('MANUAL', 12);
  let view = ui.render();
  assert.deepEqual(
    view.cards.map((card) => card.props.selected),
    [false, false, true],
  );
  view.input!.props.onChangeText('');
  view = ui.render();
  assert.equal(view.button.props.disabled, true);
  view.cards[0].props.onPress();
  assert.equal(ui.render().button.props.disabled, false);
});
