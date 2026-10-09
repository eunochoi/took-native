import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { getSoberSummary, formatSoberDuration, formatSoberGoal } from '../src/domain/sober';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function scenario(file = '../app/sober/[id]/index.tsx') {
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
  let mutationFn: Function;
  let pending = false;
  let resolveWrite: (() => void) | undefined;
  let failed = false;
  const notices: any[] = [];
  const pushes: any[] = [];
  const jsx = (type: unknown, props: any) => ({ type, props });
  function load(file: string, exports: Record<string, Function>) {
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      {
        exports,
        require: (name: string) => {
          if (name.endsWith('/SoberRestartActions')) {
            const actions: Record<string, Function> = {};
            load('../src/screens/sober/SoberRestartActions.tsx', actions);
            return actions;
          }
          if (name.endsWith('/ModalNavigationProvider'))
            return {
              useModalNavigation: () => ({ openModal: (href: unknown) => pushes.push(href) }),
            };
          if (name.endsWith('/NoticeProvider'))
            return { useNotice: () => ({ showNotice: (notice: unknown) => notices.push(notice) }) };
          if (name.endsWith('theme/classes')) return require('../src/theme/classes');
          if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
          if (name === 'react')
            return {
              createElement: (type: unknown, props: any) => jsx(type, props),
              useState: (initial: unknown) => {
                const index = cursor++;
                slots[index] ??= { value: typeof initial === 'function' ? initial() : initial };
                return [
                  slots[index].value,
                  (value: unknown) => {
                    slots[index].value = value;
                  },
                ];
              },
              useRef: (current: unknown) => {
                const index = cursor++;
                return slots[index] ?? (slots[index] = { current });
              },
              useMemo: (factory: Function) => factory(),
            };
          if (name === 'react-native') return { View: 'View', ScrollView: 'ScrollView' };
          if (name === 'expo-router')
            return {
              useLocalSearchParams: () => ({ id: '1', date: '2026-10-04' }),
              useRouter: () => ({ push() {}, replace() {} }),
            };
          if (name === 'expo-router/react-navigation') return { usePreventRemove() {} };
          if (name.endsWith('/db/sober'))
            return {
              deleteSoberRestart: async (_db: unknown, id: number, owner: number) =>
                writes.push({ id, owner }),
            };
          if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
          if (name === '@tanstack/react-query')
            return {
              useQuery: ({ kind }: any) => ({ data: kind === 'sober' ? sober : [record] }),
              useInfiniteQuery: () => ({ data: { pages: [{ records: [record] }] } }),
            };
          if (name.endsWith('/queries'))
            return {
              soberQueries: {
                byId: () => ({ kind: 'sober' }),
                restarts: () => ({ kind: 'restarts' }),
                memos: () => ({}),
              },
              useRecordMutation: (
                fn: Function,
                _scope: string,
                onSuccess?: Function,
                onError?: Function,
              ) => {
                mutationFn = fn;
                return {
                  isPending: pending,
                  mutateAsync: async (action: unknown) => {
                    pending = true;
                    try {
                      await mutationFn(action);
                      await new Promise<void>((resolve) => {
                        resolveWrite = resolve;
                      });
                      if (failed) throw new Error('삭제 실패');
                      onSuccess?.();
                    } catch (error) {
                      onError?.(error);
                      throw error;
                    } finally {
                      pending = false;
                    }
                  },
                };
              },
            };
          if (name.endsWith('/domain/date')) return require('../src/domain/date');
          if (name.endsWith('/domain/sober'))
            return { getSoberSummary, formatSoberDuration, formatSoberGoal };
          if (name.endsWith('/useCurrentMinute'))
            return { useCurrentMinute: () => Date.parse('2026-10-05T12:00:00Z') };
          if (name.endsWith('/useScrollFade')) return { useScrollFade: () => ({}) };
          if (name.endsWith('/AppThemeProvider'))
            return { useAppTheme: () => ({ rem: 15, colors: {}, iconSizes: { sm: 18 } }) };
          if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
          if (name.startsWith('@expo/')) return { __esModule: true, default: 'Icon' };
          const component = name.split('/').at(-1)!;
          return { [component]: component };
        },
      },
    );
  }
  load(file, exports);
  function nodes(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (typeof node.type === 'function') return nodes(node.type(node.props));
    return [node, ...nodes(node.props?.children)];
  }
  function render() {
    cursor = 0;
    return nodes(exports.default());
  }
  return {
    render,
    record,
    nodes,
    writes,
    pushes,
    notices,
    completeWrite: (fail = false) => {
      failed = fail;
      resolveWrite?.();
    },
  };
}

test('memo launcher pushes a route above sober detail without closing its sheet', () => {
  const ui = scenario();
  const nodes = ui.render();
  const button = nodes.find(
    (node) => node.type === 'Button' && node.props.label === '메모 기록보기',
  );
  assert.equal(button.props.subtle, true);
  button.props.onPress();
  assert.equal(ui.pushes.length, 1);
  assert.equal(ui.pushes[0].pathname, '/sober/[id]/memos');
  assert.equal(ui.pushes[0].params.id, '1');
  assert.equal(
    ui.render().find((node) => node.type === 'BottomSheetPage').props.closeRequested,
    undefined,
  );
});

test('calendar and direct restart launch push routes while preserving detail selection and month', () => {
  const ui = scenario();
  ui.render()
    .find((node) => node.type === 'SoberMonthCalendar')
    .props.onSelect('2026-10-04');
  assert.equal(ui.pushes[0].pathname, '/sober/[id]/day/[date]');
  assert.equal(ui.pushes[0].params.date, '2026-10-04');
  const calendar = ui.render().find((node) => node.type === 'SoberMonthCalendar');
  assert.equal(calendar.props.selected, '2026-10-04');
  assert.equal(calendar.props.month, '2026-10');
  assert(!ui.render().some((node) => ['BottomSheetModal', 'DateTimePicker'].includes(node.type)));
  ui.render()
    .find((node) => node.props.label === '다시 시작하기')
    .props.onPress();
  assert.equal(ui.pushes[1].pathname, '/sober/[id]/restart/new');
  assert.equal(ui.pushes[1].params.date, undefined);
});

test('day addition retains the day sheet and edit waits for the action sheet to close', () => {
  const ui = scenario('../app/sober/[id]/day/[date].tsx');
  const info = ui.render().find((node) => node.type === 'SoberDayInfo');
  assert.equal(info.props.records[0].id, ui.record.id);
  info.props.onAdd();
  assert.equal(ui.pushes[0].pathname, '/sober/[id]/restart/new');
  assert.equal(ui.pushes[0].params.date, '2026-10-04');
  info.props.onMenu(ui.record);
  const menu = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  let afterClose: (() => void) | undefined;
  menu.props
    .children((action: () => void) => {
      afterClose = action;
      return true;
    })
    .props.children[0].props.onPress();
  assert.equal(ui.pushes.length, 1);
  menu.props.onClose();
  afterClose!();
  assert.equal(ui.pushes[1].pathname, '/sober/[id]/restart/[restartId]/edit');
  assert.equal(ui.pushes[1].params.restartId, '2');
  assert(ui.render().some((node) => node.type === 'SoberDayInfo'));
});

function deleteConfirmation(ui: ReturnType<typeof scenario>) {
  ui.render()
    .find((node) => node.type === 'SoberDayInfo')
    .props.onMenu(ui.record);
  const menu = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  let next: (() => void) | undefined;
  menu.props
    .children((action: () => void) => {
      next = action;
      return true;
    })
    .props.children[1].props.onPress();
  menu.props.onClose();
  next!();
  return ui.render().find((node) => node.type === 'ConfirmModal');
}

test('restart deletion cancellation leaves the day route and its records intact', () => {
  const ui = scenario('../app/sober/[id]/day/[date].tsx');
  const confirm = deleteConfirmation(ui);
  assert.equal(confirm.props.visible, true);
  confirm.props.onCancel();
  assert.equal(ui.writes.length, 0);
  assert(ui.render().some((node) => node.type === 'SoberDayInfo'));
  assert(
    !ui
      .render()
      .some(
        (node) => ['BottomSheetModal', 'ConfirmModal'].includes(node.type) && node.props.visible,
      ),
  );
});

test('restart deletion blocks repeat requests and exits until completion, and failure keeps the day route', async () => {
  const ui = scenario('../app/sober/[id]/day/[date].tsx');
  const confirm = deleteConfirmation(ui);
  confirm.props.onConfirm();
  confirm.props.onConfirm();
  assert.deepEqual(ui.writes, [{ id: 2, owner: 1 }]);
  assert.equal(
    ui
      .render()
      .find((node) => node.type === 'BottomSheetPage')
      .props.onBeforeClose(),
    false,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  ui.completeWrite(true);
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert(ui.notices.some((notice) => notice.message === '삭제 실패'));
  assert.equal(
    ui
      .render()
      .find((node) => node.type === 'BottomSheetPage')
      .props.onBeforeClose(),
    true,
  );
  assert(ui.render().some((node) => node.type === 'SoberDayInfo'));
});

function memoCard(ui: ReturnType<typeof scenario>) {
  const flat = ui
    .render()
    .find((node) => node.type === 'BottomSheetPage')
    .props.renderScrollView({});
  return ui
    .nodes(flat.props.renderItem({ item: flat.props.data[0], index: 0 }))
    .find((node) => node.type === 'SoberRestartCard');
}

test('memo edit waits for the menu to close and retains the memo route underneath', () => {
  const ui = scenario('../app/sober/[id]/memos.tsx');
  memoCard(ui).props.onMenu(ui.record);
  const menu = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  let next!: () => void;
  menu.props
    .children((action: () => void) => {
      next = action;
      return true;
    })
    .props.children[0].props.onPress();
  assert.equal(ui.pushes.length, 0);
  menu.props.onClose();
  next();
  assert.equal(ui.pushes[0].pathname, '/sober/[id]/restart/[restartId]/edit');
  assert.equal(ui.pushes[0].params.restartId, '2');
  assert.equal(
    ui.render().find((node) => node.type === 'BottomSheetPage').props.title,
    '커피 메모',
  );
});

test('memo deletion explains recalculation, prevents repeats and unlocks after success', async () => {
  const ui = scenario('../app/sober/[id]/memos.tsx');
  memoCard(ui).props.onMenu(ui.record);
  const menu = ui.render().find((node) => node.type === 'BottomSheetModal' && node.props.visible);
  let next!: () => void;
  menu.props
    .children((action: () => void) => {
      next = action;
      return true;
    })
    .props.children[1].props.onPress();
  menu.props.onClose();
  next();
  const confirm = ui.render().find((node) => node.type === 'ConfirmModal');
  assert.equal(confirm.props.visible, true);
  assert.match(confirm.props.message, /경과 시간과 통계가 다시 계산/);
  confirm.props.onConfirm();
  confirm.props.onConfirm();
  assert.deepEqual(ui.writes, [{ id: 2, owner: 1 }]);
  assert.equal(memoCard(ui).props.pending, true);
  assert.equal(
    ui
      .render()
      .find((node) => node.type === 'BottomSheetPage')
      .props.onBeforeClose(),
    false,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
  ui.completeWrite();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(
    ui
      .render()
      .find((node) => node.type === 'BottomSheetPage')
      .props.onBeforeClose(),
    true,
  );
  assert.equal(memoCard(ui).props.pending, false);
  assert(ui.notices.some((notice) => notice.tone === 'success'));
});
