import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { getSoberSummary, formatSoberDuration, formatSoberGoal } from '../src/domain/sober';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function scenario() {
  const slots: any[] = [];
  let cursor = 0;
  const exports: Record<string, Function> = {};
  const sober = {
    id: 1,
    name: '커피',
    icon_key: 'coffee',
    icon_color: 'theme',
    initial_started_at: '2026-10-01T00:00:00.000Z',
    goal_mode: 'AUTO',
    goal_days: null,
  };
  const record = { id: 2, sober_id: 1, restarted_at: '2026-10-04T00:00:00.000Z', memo: '메모' };
  const writes: any[] = [];
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../app/sober/[id]/index.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: () => {} }) };
        if (name.endsWith('theme/classes')) return require('../src/theme/classes');
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useState: (initial: unknown) => {
              const index = cursor++;
              slots[index] ??= { value: initial };
              return [
                slots[index].value,
                (value: unknown) => {
                  slots[index].value = value;
                },
              ];
            },
            useRef: (current: unknown) => ({ current }),
            useMemo: (factory: Function) => factory(),
          };
        if (name === 'react-native') return { View: 'View', ScrollView: 'ScrollView' };
        if (name === 'expo-router')
          return {
            useLocalSearchParams: () => ({ id: '1' }),
            useRouter: () => ({ push() {}, replace() {} }),
          };
        if (name === 'expo-router/react-navigation') return { usePreventRemove() {} };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query')
          return { useQuery: ({ kind }: any) => ({ data: kind === 'sober' ? sober : [record] }) };
        if (name.endsWith('/queries'))
          return {
            soberQueries: {
              byId: () => ({ kind: 'sober' }),
              restarts: () => ({ kind: 'restarts' }),
            },
            useRecordMutation: () => ({
              isPending: false,
              mutateAsync: async (action: unknown) => {
                writes.push(action);
              },
            }),
          };
        if (name.endsWith('/domain/sober'))
          return { getSoberSummary, formatSoberDuration, formatSoberGoal };
        if (name.endsWith('/useCurrentMinute'))
          return { useCurrentMinute: () => Date.parse('2026-10-05T12:00:00Z') };
        if (name.endsWith('/useScrollFade')) return { useScrollFade: () => ({}) };
        if (name.endsWith('/AppThemeProvider'))
          return { useAppTheme: () => ({ rem: 15, colors: {} }) };
        if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
        if (name.startsWith('@expo/')) return { __esModule: true, default: 'Icon' };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  function nodes(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  function render() {
    cursor = 0;
    return nodes(exports.default());
  }
  return { render, record, writes };
}

test('sober detail opens the next overlay only after its current sheet closes', () => {
  const ui = scenario();
  const calendar = ui.render().find((node) => node.type === 'SoberMonthCalendar');
  calendar.props.onSelect('2026-10-04');
  let nodes = ui.render();
  const day = nodes.find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  assert(day);
  let afterClose: (() => void) | undefined;
  const info = day.props.children((action: () => void) => {
    afterClose = action;
    return true;
  });
  info.props.onMenu(ui.record);
  assert.equal(
    ui.render().filter((node) => node.type === 'BottomSheetModal' && node.props.visible).length,
    1,
  );
  day.props.onClose();
  afterClose!();
  nodes = ui.render();
  const menu = nodes.find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  assert.equal(menu.props.title, '다시 시작 기록');
  const actions = menu.props.children((action: () => void) => {
    afterClose = action;
    return true;
  });
  actions.props.children[0].props.onPress();
  assert(!ui.render().some((node) => node.type === 'DateTimePicker'));
  menu.props.onClose();
  afterClose!();
  nodes = ui.render();
  const picker = nodes.find((node) => node.type === 'DateTimePicker');
  assert.equal(picker.props.value, ui.record.restarted_at);
  assert.equal(picker.props.memo, '메모');
  assert(!nodes.some((node) => node.type === 'BottomSheetModal' && node.props.visible));
  picker.props.onApply('2026-10-04T01:00:00Z', '수정');
  assert.equal(ui.writes[0].input.id, 2);
  picker.props.onClose();
  assert(!ui.render().some((node) => node.type === 'DateTimePicker'));
});

test('sober delete retains its selected record and cancellation leaves every overlay closed', () => {
  const ui = scenario();
  ui.render()
    .find((node) => node.type === 'SoberMonthCalendar')
    .props.onSelect('2026-10-04');
  const day = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  let next: (() => void) | undefined;
  day.props
    .children((action: () => void) => {
      next = action;
      return true;
    })
    .props.onMenu(ui.record);
  day.props.onClose();
  next!();
  const menu = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  menu.props
    .children((action: () => void) => {
      next = action;
      return true;
    })
    .props.children[1].props.onPress();
  menu.props.onClose();
  next!();
  const confirm = ui.render().find((node) => node.type === 'ConfirmModal');
  assert.equal(confirm.props.visible, true);
  confirm.props.onCancel();
  assert.equal(ui.writes.length, 0);
  assert(
    !ui
      .render()
      .some(
        (node) => ['BottomSheetModal', 'ConfirmModal'].includes(node.type) && node.props.visible,
      ),
  );
});
