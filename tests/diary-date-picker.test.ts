import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { isDate } from '../src/domain/date';
import { EMOTIONS } from '../src/domain/constants';
import { DIARY_IMAGE_MAX_COUNT, DIARY_TEXT_MAX_LENGTH } from '../src/domain/limits';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const today = '2026-10-14';
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.overlays)];
}
function harness(path: string, status: { dates?: Record<string, any>; busy?: boolean } = {}) {
  const state: any[] = [];
  const refs: any[] = [];
  let cursor = 0;
  let refCursor = 0;
  let closed = 0;
  let deferred: (() => void) | undefined;
  const applied: string[] = [];
  const saved: any[] = [];
  const exports: any = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === 'react')
          return {
            useState: (initial: any) => {
              const index = cursor++;
              if (!(index in state))
                state[index] = typeof initial === 'function' ? initial() : initial;
              return [
                state[index],
                (next: any) => {
                  state[index] = typeof next === 'function' ? next(state[index]) : next;
                },
              ];
            },
            useEffect: () => {},
            useCallback: (fn: any) => fn,
            useRef: (initial: any) => {
              const index = refCursor++;
              return (refs[index] ??= { current: initial });
            },
          };
        if (name === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            TextInput: 'TextInput',
            Keyboard: {
              isVisible: () => false,
              dismiss: () => {},
              addListener: () => ({ remove: () => {} }),
            },
          };
        if (name === 'expo-router/react-navigation') return { usePreventRemove: () => {} };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === 'date-fns') return require(name);
        if (name === 'date-fns/locale') return require(name);
        if (name === '@tanstack/react-query')
          return {
            useQuery: ({ date, id }: any) =>
              id !== undefined
                ? { data: { id, date: today, text: '', emotion: 0, images: [] }, isPending: false }
                : { data: null, isPending: false, isError: false, ...status.dates?.[date] },
          };
        if (name.endsWith('/queries'))
          return {
            diaryQueries: {
              byDate: (_db: any, date: string) => ({ date }),
              byId: (_db: any, id: number) => ({ id }),
            },
            useToday: () => today,
            useRecordMutation: (fn: any) => ({ isPending: !!status.busy, mutate: () => fn() }),
          };
        if (name.endsWith('/media'))
          return {
            pickImages: async () => [{ file: 'draft.jpg', uri: 'draft-uri' }],
            saveDiaryImages: async (_db: any, input: any, images: any) => {
              saved.push({ input, images });
            },
            discardDraftImages: () => {},
            mediaUri: (name: string) => name,
          };
        if (name.endsWith('/domain/date')) return { isDate };
        if (name.endsWith('/domain/constants')) return { EMOTIONS };
        if (name.endsWith('/domain/limits'))
          return { DIARY_IMAGE_MAX_COUNT, DIARY_TEXT_MAX_LENGTH };
        if (name.endsWith('/AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, rem: 15, iconSizes: { md: 18 } }) };
        if (name.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: () => {} }) };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return {
    render(props: any = {}) {
      cursor = 0;
      refCursor = 0;
      const tree = exports[path.includes('DiaryDatePicker') ? 'DiaryDatePicker' : 'DiaryForm']({
        value: today,
        onClose: () => {
          closed++;
        },
        onApply: (date: string) => applied.push(date),
        ...props,
      });
      if (typeof tree.props.footer === 'function')
        tree.props.footer = tree.props.footer((after?: () => void) => {
          closed++;
          deferred = after;
        });
      return tree;
    },
    applied,
    saved,
    finish: () => {
      deferred?.();
      deferred = undefined;
    },
    get closed() {
      return closed;
    },
  };
}

test('diary date applies only after closing; future dates and cancellation preserve the draft', () => {
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx');
  const calendar = () => nodes(ui.render()).find((node) => node.type === 'DatePickerCalendar');
  assert.equal(calendar().props.today, today);
  calendar().props.onSelect('2026-10-15');
  assert.equal(calendar().props.selected, today);
  calendar().props.onSelect('2026-10-10');
  assert.equal(calendar().props.selected, '2026-10-10');
  ui.render().props.footer.props.onPress();
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, ['2026-10-10']);
  const cancel = harness('src/screens/diary/DiaryDatePicker.tsx');
  nodes(cancel.render())
    .find((node) => node.type === 'DatePickerCalendar')
    .props.onSelect('2026-10-10');
  cancel.render().props.onClose();
  cancel.finish();
  assert.equal(cancel.applied.length, 0);
});

test('date confirmation waits for lookup and blocks duplicates and errors', () => {
  for (const result of [
    { isPending: true },
    { data: { id: 42 } },
    { isError: true, refetch: () => {} },
  ]) {
    const ui = harness('src/screens/diary/DiaryDatePicker.tsx', { dates: { [today]: result } });
    assert.equal(ui.render().props.footer.props.disabled, true);
    ui.render().props.footer.props.onPress();
    ui.finish();
    assert.equal(ui.applied.length, 0);
    assert.equal(ui.closed, 0);
  }
  let retried = false;
  const status = {
    dates: {
      [today]: {
        isError: true,
        refetch: () => {
          retried = true;
        },
      },
    },
  };
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx', status);
  nodes(ui.render())
    .find((node) => node.type === 'QueryError')
    .props.onRetry();
  assert.equal(retried, true);
});

test('changing new diary date preserves text, emotion and photos in the same form', async () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  nodes(ui.render())
    .find((node) => node.type === 'TextInput')
    .props.onChangeText('작성 중인 일기');
  nodes(ui.render())
    .find((node) => node.props.accessibilityLabel === '오늘의 감정 선택')
    .props.onPress();
  nodes(ui.render())
    .find((node) => node.type === 'DiaryEmotionPicker')
    .props.onApply(2);
  nodes(ui.render())
    .find((node) => node.props.accessibilityLabel === '사진 관리, 0장')
    .props.onPress();
  nodes(ui.render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onPick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  nodes(ui.render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onClose();
  ui.render().props.titleAction.onPress();
  const picker = nodes(ui.render()).find((node) => node.type === 'DiaryDatePicker');
  assert.equal(picker.props.value, today);
  picker.props.onApply('2026-10-10');
  const form = ui.render();
  assert(form.props.title.includes('2026. 10. 10.'));
  assert.equal(nodes(form).find((node) => node.type === 'TextInput').props.value, '작성 중인 일기');
  assert.equal(nodes(form).find((node) => node.type === 'EmotionImage').props.emotion, 2);
  assert(nodes(form).some((node) => node.props.accessibilityLabel === '사진 관리, 1장'));
  await form.props.footer.props.onPress();
  assert.equal(ui.saved[0].input.date, '2026-10-10');
  assert.equal(ui.saved[0].input.emotion, 2);
  assert.equal(ui.saved[0].images[0].file, 'draft.jpg');
  assert.equal(
    harness('src/screens/DiaryForm.tsx').render({ id: 42 }).props.titleAction,
    undefined,
  );
  assert.equal(
    harness('src/screens/DiaryForm.tsx', { busy: true }).render().props.titleAction.disabled,
    true,
  );
});
