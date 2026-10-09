import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import * as dates from '../src/domain/date';
import * as domain from '../src/domain/sober';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

function form(props: { soberId: number; restartId?: number; initialDate?: string | string[] }) {
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  let pending = false;
  let resolveWrite: (() => void) | undefined;
  let rejectWrite: ((error: Error) => void) | undefined;
  let preventRemove = false;
  const writes: any[] = [];
  const notices: any[] = [];
  const queries: any[] = [];
  const sober: any = {
    data: { id: 1, initial_started_at: '2024-01-01T00:00:00.000Z' },
    isPending: false,
    error: null,
  };
  const records: any = {
    data: [{ id: 2, sober_id: 1, restarted_at: '2024-02-03T10:20:00.000Z', memo: '기존 메모' }],
    isPending: false,
    error: null,
  };
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/screens/sober/SoberRestartForm.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      Error,
      Date,
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
                  dirty ||= slots[i] !== value;
                  slots[i] = value;
                },
              ];
            },
            useRef: (initial: unknown) => {
              const i = cursor++;
              return slots[i] ?? (slots[i] = { current: initial });
            },
            useEffect: (effect: () => void, deps: unknown[]) => {
              const i = cursor++;
              if (!slots[i] || deps.some((value, index) => !Object.is(value, slots[i][index])))
                effects.push(effect);
              slots[i] = deps;
            },
          };
        if (name === 'react-native') return { View: 'View', TextInput: 'TextInput' };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === 'expo-router/react-navigation')
          return {
            usePreventRemove: (value: boolean) => {
              preventRemove = value;
            },
          };
        if (name === '@tanstack/react-query')
          return {
            useQuery: (options: any) => {
              queries.push(options);
              return options.kind === 'sober' ? sober : records;
            },
          };
        if (name.endsWith('/domain/date')) return dates;
        if (name.endsWith('/domain/sober')) return domain;
        if (name.endsWith('/domain/limits')) return require('../src/domain/limits');
        if (name.endsWith('/db/sober'))
          return {
            saveSoberRestart: async (_db: unknown, input: unknown) => {
              writes.push(input);
              return new Promise<number>((resolve, reject) => {
                resolveWrite = () => resolve(3);
                rejectWrite = reject;
              });
            },
          };
        if (name.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: (value: unknown) => notices.push(value) }) };
        if (name.endsWith('/AppThemeProvider')) return { useAppTheme: () => ({ colors: {} }) };
        if (name.endsWith('/queries'))
          return {
            soberQueries: {
              byId: () => ({ kind: 'sober' }),
              restarts: () => ({ kind: 'records' }),
            },
            useRecordMutation: (
              fn: Function,
              _scope: string,
              success: Function,
              failure: Function,
            ) => ({
              isPending: pending,
              mutateAsync: async (input: unknown) => {
                pending = true;
                try {
                  const id = await fn(input);
                  success(id);
                } catch (error) {
                  failure(error);
                  throw error;
                } finally {
                  pending = false;
                }
              },
            }),
          };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  const render = () => {
    let sheet: any;
    do {
      dirty = false;
      cursor = 0;
      effects = [];
      sheet = exports.SoberRestartForm(props);
      effects.forEach((effect) => effect());
    } while (dirty);
    return sheet;
  };
  return {
    render,
    sober,
    records,
    writes,
    notices,
    queries,
    fields: () => nodes(render()).find((node) => node.type === 'DateTimeFields'),
    memo: () => nodes(render()).find((node) => node.type === 'TextInput'),
    preventRemove: () => preventRemove,
    succeed: () => resolveWrite!(),
    fail: () => rejectWrite!(new Error('저장 실패')),
  };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test('create uses the selected local date, a collapsed shared field and one submit button', () => {
  const ui = form({ soberId: 1, initialDate: '2024-02-03' });
  assert.equal(ui.fields().props.draft.date, '2024-02-03');
  const current = dates.dateTimeDraft(
    new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
  );
  assert.equal(ui.fields().props.draft.hour, current.hour);
  assert.equal(ui.fields().props.draft.minute, current.minute);
  assert.equal(ui.fields().props.collapsible, true);
  assert.equal(ui.render().props.backRoute, '/sober/1/day/2024-02-03');
  assert.equal(ui.render().props.footer.props.label, '다시 시작 기록하기');
  assert.equal(nodes(ui.render()).filter((node) => node.type === 'Button').length, 0);
  assert.equal(ui.writes.length, 0);
  assert.equal(form({ soberId: 1 }).render().props.backRoute, '/sober/1');
});

test('edit loads owned record once, and background refetch does not overwrite unsaved changes', () => {
  const ui = form({ soberId: 1, restartId: 2 });
  assert.deepEqual(
    { ...ui.fields().props.draft },
    dates.dateTimeDraft(ui.records.data[0].restarted_at),
  );
  assert.equal(ui.memo().props.value, '기존 메모');
  ui.memo().props.onChangeText('임시 입력');
  ui.fields().props.onChange({ date: '2024-03-04', hour: '11', minute: '22' });
  ui.records.data = [
    { ...ui.records.data[0], memo: '재조회', restarted_at: '2024-05-06T12:00:00.000Z' },
  ];
  assert.equal(ui.memo().props.value, '임시 입력');
  assert.equal(ui.fields().props.draft.date, '2024-03-04');
  assert.equal(ui.render().props.footer.props.label, '수정한 기록 저장하기');
  assert.equal(ui.writes.length, 0);
});

test('invalid params, missing resources and records owned by another item cannot submit', () => {
  for (const props of [
    { soberId: NaN },
    { soberId: 0 },
    { soberId: 1, restartId: NaN },
    { soberId: 1, initialDate: '2024-02-30' },
    { soberId: 1, initialDate: ['2024-02-03'] },
  ]) {
    const ui = form(props);
    assert.equal(ui.render().props.footer, undefined);
    assert(ui.queries.every((options) => !options.enabled));
    assert.equal(ui.writes.length, 0);
  }
  const missing = form({ soberId: 1, restartId: 2 });
  missing.sober.data = null;
  assert.equal(missing.render().props.footer, undefined);
  assert.equal(missing.render().props.backRoute, '/sober');
  const foreign = form({ soberId: 1, restartId: 2 });
  foreign.records.data[0].sober_id = 5;
  assert.equal(foreign.render().props.footer, undefined);
  const loading = form({ soberId: 1, restartId: 2 });
  loading.records.data = undefined;
  loading.records.isPending = true;
  assert.equal(loading.render().props.footer, undefined);
  loading.records.error = new Error('조회 실패');
  assert.equal(loading.render().props.footer, undefined);
});

test('validation rejects invalid clocks, future times, pre-start records and excessive memos without writing', () => {
  const ui = form({ soberId: 1, initialDate: '2024-02-03' });
  for (const draft of [
    { date: '2024-02-03', hour: '24', minute: '00' },
    { date: '2099-02-03', hour: '10', minute: '00' },
    { date: '2023-12-31', hour: '10', minute: '00' },
  ]) {
    ui.fields().props.onChange(draft);
    ui.render().props.footer.props.onPress();
    assert.equal(ui.writes.length, 0);
    assert(nodes(ui.render()).some((node) => node.props.accessibilityRole === 'alert'));
  }
  ui.fields().props.onChange({ date: '2024-02-03', hour: '10', minute: '00' });
  ui.memo().props.onChangeText('a'.repeat(ui.memo().props.maxLength + 1));
  ui.render().props.footer.props.onPress();
  assert.equal(ui.writes.length, 0);
});

for (const restartId of [undefined, 2]) {
  test(`save ${restartId === undefined ? 'create' : 'edit'} blocks duplicate taps and closing, then requests dismissal only after success`, async () => {
    const ui = form({ soberId: 1, restartId, initialDate: '2024-02-03' });
    ui.memo().props.onChangeText(' 새 메모 ');
    const button = ui.render().props.footer;
    button.props.onPress();
    button.props.onPress();
    assert.equal(ui.writes.length, 1);
    assert.equal(ui.writes[0].id, restartId);
    assert.equal(ui.writes[0].sober_id, 1);
    assert.equal(ui.writes[0].memo, '새 메모');
    const pending = ui.render();
    assert.equal(pending.props.closeRequested, false);
    assert.equal(pending.props.onBeforeClose(), false);
    assert.equal(ui.preventRemove(), true);
    assert.equal(ui.fields().props.disabled, true);
    assert.equal(ui.memo().props.editable, false);
    ui.memo().props.onChangeText('저장 중 변경');
    assert.equal(ui.memo().props.value, ' 새 메모 ');
    ui.succeed();
    await tick();
    const saved = ui.render();
    assert.equal(saved.props.closeRequested, true);
    assert.equal(saved.props.onBeforeClose(), true);
    assert.equal(saved.props.footer.props.disabled, true);
    assert.equal(ui.preventRemove(), false);
    assert(!ui.notices.some((notice) => notice.tone === 'success'));
    saved.props.onClosed();
    assert(ui.notices.some((notice) => notice.tone === 'success'));
  });
}

test('failed save retains inputs and route, permits retry, and cancel never writes', async () => {
  const ui = form({ soberId: 1, restartId: 2 });
  ui.memo().props.onChangeText('실패해도 유지');
  ui.fields().props.onChange({ date: '2024-03-04', hour: '11', minute: '22' });
  ui.render().props.footer.props.onPress();
  ui.fail();
  await tick();
  assert.equal(ui.memo().props.value, '실패해도 유지');
  assert.equal(ui.fields().props.draft.date, '2024-03-04');
  assert.equal(ui.render().props.closeRequested, false);
  assert.equal(ui.render().props.onBeforeClose(), true);
  assert(ui.notices.some((notice) => notice.message === '저장 실패'));
  ui.render().props.footer.props.onPress();
  assert.equal(ui.writes.length, 2);
  ui.succeed();
  await tick();
  const cancel = form({ soberId: 1, initialDate: '2024-02-03' });
  cancel.memo().props.onChangeText('저장 안 함');
  assert.equal(cancel.render().props.onBeforeClose(), true);
  assert.equal(cancel.writes.length, 0);
});

test('query errors during a save keep the dismissal guard and successful close request', async () => {
  const ui = form({ soberId: 1, restartId: 2 });
  ui.render().props.footer.props.onPress();
  ui.records.error = new Error('새로고침 실패');
  assert.equal(ui.render().props.onBeforeClose(), false);
  assert.equal(ui.render().props.closeRequested, false);
  ui.succeed();
  await tick();
  assert.equal(ui.render().props.closeRequested, true);
  assert.equal(ui.render().props.onBeforeClose(), true);
  assert.equal(typeof ui.render().props.onClosed, 'function');
});
