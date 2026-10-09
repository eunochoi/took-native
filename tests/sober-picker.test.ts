import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { dateTimeDraft, parseDateTime } from '../src/domain/date';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function renderComponent(file: 'DateTimePicker' | 'DateTimeFields', props: any) {
  const exports: any = {};
  const slots: any[] = [];
  let cursor = 0;
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/components/${file}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      Error,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useState: (initial: any) => {
              const i = cursor++;
              if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
              return [
                slots[i],
                (value: any) => {
                  slots[i] = value;
                },
              ];
            },
          };
        if (name === 'react-native') return { View: 'View', TextInput: 'TextInput' };
        if (name === 'date-fns') return require(name);
        if (name.includes('domain/date')) return { dateTimeDraft, parseDateTime };
        if (name.includes('useCurrentMinute')) return { useCurrentMinute: () => Date.now() };
        if (name.includes('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: {} }) };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return () => {
    cursor = 0;
    return exports[file](props);
  };
}
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

test('start picker offers one full-width action, keeps changes local, and applies only after accepted close', () => {
  const applied: string[] = [];
  const render = renderComponent('DateTimePicker', {
    mode: 'start',
    title: '날짜',
    value: '2024-01-01T00:00:00.000Z',
    onClose: () => {},
    onApply: (iso: string) => applied.push(iso),
  });
  const fields = nodes(render()).find((node) => node.type === 'DateTimeFields');
  const draft = { date: '2024-02-03', hour: '10', minute: '20' };
  fields.props.onChange(draft);
  assert.equal(applied.length, 0);
  assert.equal(
    nodes(render()).find((node) => node.type === 'DateTimeFields').props.draft.date,
    draft.date,
  );
  assert.equal(
    nodes(render()).some((node) => node.props.accessibilityLabel === '다시 시작 메모'),
    false,
  );
  let apply: (() => void) | undefined;
  const button = render().props.footer((action: () => void) => {
    apply = action;
    return true;
  });
  assert.equal(button.type, 'Button');
  assert.equal(button.props.label, '선택 완료');
  button.props.onPress();
  assert.equal(applied.length, 0);
  render().props.onClose();
  apply!();
  assert.deepEqual(applied, [parseDateTime(draft, Date.now())]);
});

test('invalid clock keeps the picker open, and cancellation discards the draft on reopening', () => {
  let closes = 0;
  let applies = 0;
  const props = {
    mode: 'start',
    title: '날짜',
    value: '2024-01-01T00:00:00.000Z',
    onClose: () => {
      closes++;
    },
    onApply: () => {
      applies++;
    },
  };
  const render = renderComponent('DateTimePicker', props);
  nodes(render())
    .find((node) => node.type === 'DateTimeFields')
    .props.onChange({ date: '2024-02-03', hour: '24', minute: '20' });
  render()
    .props.footer(() => {
      throw new Error('invalid values must not close');
    })
    .props.onPress();
  assert(nodes(render()).some((node) => node.props.accessibilityRole === 'alert'));
  render().props.onClose();
  assert.equal(applies, 0);
  assert.equal(closes, 1);
  const reopened = renderComponent('DateTimePicker', props);
  assert.deepEqual(
    { ...nodes(reopened()).find((node) => node.type === 'DateTimeFields').props.draft },
    dateTimeDraft(props.value),
  );
});

test('shared fields retain the start calendar and collapsed restart selector without a nested modal', () => {
  for (const collapsible of [false, true]) {
    const render = renderComponent('DateTimeFields', {
      draft: dateTimeDraft('2024-01-01T00:00:00.000Z'),
      collapsible,
      onChange: () => {},
    });
    assert.equal(
      nodes(render()).some((node) => node.type === 'DatePickerCalendar'),
      !collapsible,
    );
    assert.equal(
      nodes(render()).some((node) => node.type === 'BottomSheetModal'),
      false,
    );
    if (collapsible) {
      nodes(render())
        .find((node) => node.type === 'FormPickerRow')
        .props.onPress();
      assert(nodes(render()).some((node) => node.type === 'DatePickerCalendar'));
    }
  }
});

test('disabled shared fields reject calendar, month and clock changes during save', () => {
  let changes = 0;
  const render = renderComponent('DateTimeFields', {
    draft: dateTimeDraft('2024-01-01T00:00:00.000Z'),
    disabled: true,
    onChange: () => changes++,
  });
  const calendar = nodes(render()).find((node) => node.type === 'DatePickerCalendar');
  calendar.props.onSelect('2024-02-03');
  calendar.props.onMonthChange('2024-02');
  for (const input of nodes(render()).filter((node) => node.type === 'TextInput')) {
    assert.equal(input.props.editable, false);
    input.props.onChangeText('22');
  }
  assert.equal(changes, 0);
  assert.equal(
    nodes(render()).find((node) => node.type === 'DatePickerCalendar').props.month,
    '2024-01',
  );
});
