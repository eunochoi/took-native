import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
// Exercise the actual Confirm handlers without starting a native animation or deleting records.
function renderConfirm(onConfirm: () => void, onCancel: () => void) {
  const exports: Record<string, Function> = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/ConfirmModal.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react') return { useRef: (current: unknown) => ({ current }) };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        return {
          Pressable: 'Pressable',
          View: 'View',
          Text: 'Text',
          BottomSheetModal: 'BottomSheetModal',
        };
      },
    },
  );
  const shell = exports.ConfirmModal({
    visible: true,
    title: '삭제할까요?',
    message: '검증용',
    confirmLabel: '삭제',
    danger: true,
    onConfirm,
    onCancel,
  });
  let closing = false;
  let accepted = 0;
  const body = shell.props.footer(() => {
    if (closing) return false;
    closing = true;
    accepted += 1;
    return true;
  });
  const [cancel, confirm] = body.props.children;
  return {
    shell,
    cancel,
    confirm,
    closeCount: () => accepted,
    dismiss: () => {
      closing = true;
    },
  };
}

test('rapid confirm taps dispatch one action only after the close completes', () => {
  let confirmed = 0;
  let cancelled = 0;
  const ui = renderConfirm(
    () => confirmed++,
    () => cancelled++,
  );
  ui.confirm.props.onPress();
  ui.confirm.props.onPress();
  ui.cancel.props.onPress();
  assert.equal(ui.closeCount(), 1);
  assert.equal(confirmed, 0);
  ui.shell.props.onClose();
  assert.equal(confirmed, 1);
  assert.equal(cancelled, 0);
});

test('a cancel followed by a late confirm cannot become a destructive action', () => {
  let confirmed = 0;
  let cancelled = 0;
  const ui = renderConfirm(
    () => confirmed++,
    () => cancelled++,
  );
  ui.cancel.props.onPress();
  ui.confirm.props.onPress();
  ui.shell.props.onClose();
  assert.equal(confirmed, 0);
  assert.equal(cancelled, 1);
});

test('backdrop or Android back dismissal wins over a late confirm tap', () => {
  let confirmed = 0;
  let cancelled = 0;
  const ui = renderConfirm(
    () => confirmed++,
    () => cancelled++,
  );
  ui.dismiss();
  ui.confirm.props.onPress();
  ui.shell.props.onClose();
  assert.equal(confirmed, 0);
  assert.equal(cancelled, 1);
});

function renderRecordMenu(kind: 'diary' | 'habit' | 'sober') {
  const component = `${kind[0].toUpperCase()}${kind.slice(1)}Menu`;
  const exports: Record<string, Function> = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  const states: unknown[] = [];
  const routes: string[] = [];
  let deletions = 0;
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/screens/${kind}/${component}.tsx`, import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react')
          return {
            useState: (initial: unknown) => {
              const index = states.push(initial) - 1;
              return [
                initial,
                (value: unknown) => {
                  states[index] = value;
                },
              ];
            },
          };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === 'date-fns') return require(name);
        if (name.endsWith('/ModalNavigationProvider'))
          return {
            useModalNavigation: () => ({ openModal: (route: string) => routes.push(route) }),
          };
        if (name === 'expo-router')
          return { useRouter: () => ({ push: (route: string) => routes.push(route) }) };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: {} }) };
        if (name.endsWith('queries'))
          return {
            useRecordMutation: () => ({
              isPending: false,
              mutate: () => {
                deletions++;
              },
            }),
          };
        return {
          Pressable: 'Pressable',
          View: 'View',
          BottomSheetModal: 'BottomSheetModal',
          PickerAction: 'PickerAction',
          ConfirmModal: 'ConfirmModal',
          AlertModal: 'AlertModal',
        };
      },
    },
  );
  const ui = exports[component]({
    [kind]: { id: 7, name: '검증용', date: '2026-10-05' },
    today: '2026-10-05',
  });
  const shell = ui.props.children.find((child: any) => child.type === 'BottomSheetModal');
  let closing = false;
  let afterClose: (() => void) | undefined;
  const close = (action: () => void) => {
    if (closing) return false;
    closing = true;
    afterClose = action;
    return true;
  };
  const [edit, remove] = shell.props.children(close).props.children;
  return {
    edit,
    remove,
    routes,
    states,
    deletions: () => deletions,
    completeClose: () => {
      shell.props.onClose();
      afterClose?.();
    },
  };
}

for (const kind of ['diary', 'habit', 'sober'] as const) {
  test(`${kind} edit navigates once after the menu closes`, () => {
    const menu = renderRecordMenu(kind);
    menu.edit.props.onPress();
    menu.edit.props.onPress();
    menu.remove.props.onPress();
    assert.deepEqual(menu.routes, []);
    assert(!menu.states.includes(true));
    menu.completeClose();
    assert.deepEqual(menu.routes, [`/${kind}/7/edit`]);
    assert(!menu.states.includes(true));
    assert.equal(menu.deletions(), 0);
  });
  test(`${kind} delete opens confirmation only after the menu closes`, () => {
    const menu = renderRecordMenu(kind);
    menu.remove.props.onPress();
    menu.edit.props.onPress();
    assert(!menu.states.includes(true));
    menu.completeClose();
    assert.equal(menu.states.filter((value) => value === true).length, 1);
    assert.deepEqual(menu.routes, []);
    assert.equal(menu.deletions(), 0);
  });
}
