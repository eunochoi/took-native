import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any, type: string): any[] {
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

test('time picker rejects invalid input, stays open on failure and closes after saving or disabling', async () => {
  const slots: any[] = [];
  let cursor = 0;
  let fail = true;
  let closes = 0;
  const applied: any[] = [];
  const component = load('../src/screens/settings/NotificationTimePicker.tsx', {
    react: {
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
    },
    'react-native': { View: 'View', TextInput: 'TextInput' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Modal' },
    '../../components/Button': { Button: 'Button' },
    '../../components/Text': { Text: 'Text' },
  }).NotificationTimePicker;
  function render() {
    cursor = 0;
    const modal = component({
      title: '일기 작성 알림',
      value: '21:00',
      onClose: () => {},
      onApply: async (time: any) => {
        applied.push(time);
        if (fail) throw new Error('예약 실패');
      },
    });
    return {
      modal,
      body: modal.props.children(() => {
        closes++;
      }),
      tree: jsx('Fragment', {
        children: [
          modal.props.children(() => {
            closes++;
          }),
          modal.props.footer(() => {
            closes++;
          }),
        ],
      }),
    };
  }
  assert.equal(render().modal.props.footer(() => {}).type, 'Button');
  assert.equal(nodes(render().body, 'Button')[0].props.label, '알림 해제');
  nodes(render().tree, 'TextInput')[0].props.onChangeText('24');
  nodes(render().tree, 'Button')
    .find((node) => node.props.label !== '알림 해제')!
    .props.onPress();
  assert.equal(applied.length, 0);
  assert(nodes(render().tree, 'Text').some((node) => node.props.accessibilityRole === 'alert'));
  nodes(render().tree, 'TextInput')[0].props.onChangeText('9');
  nodes(render().tree, 'Button')
    .find((node) => node.props.label !== '알림 해제')!
    .props.onPress();
  assert.equal(render().modal.props.onBeforeClose(), false);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(applied, ['09:00']);
  assert.equal(closes, 0);
  assert(nodes(render().tree, 'Text').some((node) => node.props.children === '예약 실패'));
  fail = false;
  nodes(render().tree, 'Button')
    .find((node) => node.props.label !== '알림 해제')!
    .props.onPress();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(closes, 1);
  nodes(render().tree, 'Button')
    .find((node) => node.props.label === '알림 해제')!
    .props.onPress();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(applied.at(-1), null);
  assert.equal(closes, 2);
});
