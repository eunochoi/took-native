import { mockI18n, formatDisplayDate } from './helpers/i18n';
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
function harness(
  path: string,
  status: { dates?: Record<string, any>; months?: Record<string, any>; busy?: boolean } = {},
) {
  let language: 'ko' | 'en' = 'ko';
  const state: any[] = [];
  const refs: any[] = [];
  let cursor = 0;
  let refCursor = 0;
  let closed = 0;
  let deferred: (() => void) | undefined;
  const applied: string[] = [];
  const saved: any[] = [];
  const queries: any[] = [];
  const exports: any = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/i18n/react')) return mockI18n(() => language);
        if (name.endsWith('/i18n/format')) return { formatDisplayDate };
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
            useQuery: (options: any) => {
              queries.push(options);
              const { date, id, month } = options;
              if (month !== undefined)
                return { data: [], isError: false, ...status.months?.[month] };
              return id !== undefined
                ? { data: { id, date: today, text: '', emotion: 0, images: [] }, isPending: false }
                : { data: null, isPending: false, isError: false, ...status.dates?.[date] };
            },
          };
        if (name.endsWith('/queries'))
          return {
            diaryQueries: {
              byDate: (_db: any, date: string) => ({ date }),
              month: (_db: any, month: string) => ({ month }),
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
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
    applied,
    saved,
    queries,
    finish: () => {
      deferred?.();
      deferred = undefined;
    },
    get closed() {
      return closed;
    },
  };
}

test('diary editor grows with content and returns to its writing area minimum without losing the draft', () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  const input = () =>
    nodes(ui.render()).find((node) => node.props.accessibilityLabel === '일기 내용');
  assert.equal(input().props.style.height, 180);
  input().props.onChangeText('오래 기억하고 싶은 하루\n'.repeat(40));
  input().props.onContentSizeChange({ nativeEvent: { contentSize: { height: 640.2 } } });
  assert.equal(input().props.style.height, 641);
  assert.equal(input().props.value, '오래 기억하고 싶은 하루\n'.repeat(40));
  assert.equal(input().props.scrollEnabled, true);
  input().props.onChangeText('짧은 하루');
  input().props.onContentSizeChange({ nativeEvent: { contentSize: { height: 48 } } });
  assert.equal(input().props.style.height, 180);
  assert.equal(input().props.value, '짧은 하루');
});

test('diary date applies only after closing; future dates and cancellation preserve the draft', () => {
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx');
  const calendar = () => nodes(ui.render()).find((node) => node.type === 'DatePickerCalendar');
  assert.equal(calendar().props.today, today);
  assert.equal(ui.render().props.fixedHeight, true);
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

test('today header selects today and returns to its month without applying until confirmation', () => {
  for (const value of ['2025-07-03', null]) {
    const ui = harness('src/screens/diary/DiaryDatePicker.tsx');
    const render = () => ui.render({ value });
    const calendar = () => nodes(render()).find((node) => node.type === 'DatePickerCalendar');
    calendar().props.onMonthChange('2026-09');
    const header = render().props.headerAction;
    assert.equal(header.props.accessibilityLabel, '오늘 날짜 선택');
    assert(nodes(header).some((node) => node.type === 'AppIcon' && node.props.name === 'today'));
    assert(nodes(header).some((node) => node.type === 'Text' && node.props.children === '오늘'));
    header.props.onPress();
    assert.equal(calendar().props.selected, today);
    assert.equal(calendar().props.month, today.slice(0, 7));
    assert.equal(ui.queries.at(-1).date, today);
    assert.equal(ui.applied.length, 0);
    assert.equal(ui.closed, 0);
    const selected = render();
    assert.equal(selected.props.footer.props.disabled, false);
    selected.props.footer.props.onPress();
    assert.equal(ui.applied.length, 0);
    ui.finish();
    assert.deepEqual(ui.applied, [today]);
  }
});

test('today shortcut keeps the existing lookup, duplicate and editing rules', () => {
  for (const result of [
    { isPending: true },
    { data: { id: 43 } },
    { isError: true, refetch: () => {} },
    { data: { id: 42 } },
  ]) {
    const ui = harness('src/screens/diary/DiaryDatePicker.tsx', { dates: { [today]: result } });
    const render = () => ui.render({ value: '2026-09-10', diaryId: 42 });
    render().props.headerAction.props.onPress();
    const selected = render();
    const blocked = result.data?.id !== 42;
    assert.equal(selected.props.footer.props.disabled, blocked);
    selected.props.footer.props.onPress();
    ui.finish();
    assert.deepEqual(ui.applied, blocked ? [] : [today]);
    assert.equal(ui.closed, blocked ? 0 : 1);
  }
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

test('an undated picker opens this month without selecting today or querying a date', () => {
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx');
  const render = () => ui.render({ value: null });
  const tree = render();
  const calendar = nodes(tree).find((node) => node.type === 'DatePickerCalendar');
  assert.equal(calendar.props.month, '2026-10');
  assert.equal(calendar.props.selected, '');
  assert.equal(ui.queries.at(-1).enabled, false);
  assert.equal(tree.props.footer.props.disabled, true);
  tree.props.footer.props.onPress();
  ui.finish();
  assert.equal(ui.applied.length, 0);
  calendar.props.onSelect('2026-10-08');
  const selected = render();
  assert.equal(ui.queries.at(-1).enabled, true);
  assert.equal(selected.props.footer.props.disabled, false);
  selected.props.footer.props.onPress();
  ui.finish();
  assert.deepEqual(ui.applied, ['2026-10-08']);
});

test('an undated form requires a date even when its emotion and text are ready', async () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  const render = () => ui.render({ allowDateChange: true });
  assert.equal(render().props.title, '날짜를 선택해주세요');
  nodes(render())
    .find((node) => node.type === 'TextInput')
    .props.onChangeText('작성 중');
  nodes(render())
    .find((node) => node.props.accessibilityLabel === '오늘의 감정 선택')
    .props.onPress();
  nodes(render())
    .find((node) => node.type === 'DiaryEmotionPicker')
    .props.onApply(2);
  assert.equal(render().props.footer.props.disabled, true);
  await assert.rejects(render().props.footer.props.onPress(), /일기 날짜를 선택해주세요/);
  assert.equal(ui.saved.length, 0);
  render().props.titleAction.onPress();
  const picker = nodes(render()).find((node) => node.type === 'DiaryDatePicker');
  assert.equal(picker.props.value, null);
  picker.props.onApply('2026-10-08');
  assert.equal(render().props.footer.props.disabled, false);
  await render().props.footer.props.onPress();
  assert.equal(ui.saved[0].input.date, '2026-10-08');
});

test('date-specific creation keeps a fixed title while edit forms allow date changes', () => {
  const fixed = harness('src/screens/DiaryForm.tsx').render({ initialDate: '2026-10-08' });
  assert(fixed.props.title.includes('2026. 10. 8.'));
  assert.equal(fixed.props.titleAction, undefined);
  const edit = harness('src/screens/DiaryForm.tsx');
  edit.render({ id: 42 }).props.titleAction.onPress();
  const picker = nodes(edit.render({ id: 42 })).find((node) => node.type === 'DiaryDatePicker');
  assert.equal(picker.props.diaryId, 42);
});

test('changing new diary date preserves text, emotion and photos in the same form', async () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  const render = () => ui.render({ allowDateChange: true, initialDate: today });
  nodes(render())
    .find((node) => node.type === 'TextInput')
    .props.onChangeText('작성 중인 일기');
  nodes(render())
    .find((node) => node.props.accessibilityLabel === '오늘의 감정 선택')
    .props.onPress();
  nodes(render())
    .find((node) => node.type === 'DiaryEmotionPicker')
    .props.onApply(2);
  nodes(render())
    .find((node) => node.props.accessibilityLabel === '사진 관리, 0장')
    .props.onPress();
  nodes(render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onPick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  nodes(render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onClose();
  render().props.titleAction.onPress();
  const picker = nodes(render()).find((node) => node.type === 'DiaryDatePicker');
  assert.equal(picker.props.value, today);
  picker.props.onApply('2026-10-10');
  const form = render();
  assert(form.props.title.includes('2026. 10. 10.'));
  assert.equal(nodes(form).find((node) => node.type === 'TextInput').props.value, '작성 중인 일기');
  assert.equal(nodes(form).find((node) => node.type === 'EmotionImage').props.emotion, 2);
  assert(nodes(form).some((node) => node.props.accessibilityLabel === '사진 관리, 1장'));
  await form.props.footer.props.onPress();
  assert.equal(ui.saved[0].input.date, '2026-10-10');
  assert.equal(ui.saved[0].input.emotion, 2);
  assert.equal(ui.saved[0].images[0].file, 'draft.jpg');
  assert(harness('src/screens/DiaryForm.tsx').render({ id: 42 }).props.titleAction);
  assert.equal(
    harness('src/screens/DiaryForm.tsx', { busy: true }).render({ allowDateChange: true }).props
      .titleAction.disabled,
    true,
  );
});

test('editing permits the current diary date but blocks a different diary', () => {
  for (const [existingId, blocked] of [
    [42, false],
    [43, true],
  ] as const) {
    const ui = harness('src/screens/diary/DiaryDatePicker.tsx', {
      dates: { [today]: { data: { id: existingId } } },
    });
    const tree = ui.render({ diaryId: 42 });
    assert.equal(tree.props.footer.props.disabled, blocked);
    assert.equal(JSON.stringify(tree).includes('이미 일기가 있는 날짜'), blocked);
    tree.props.footer.props.onPress();
    ui.finish();
    assert.deepEqual(ui.applied, blocked ? [] : [today]);
  }
});

test('editing changes the date without resetting unsaved text, emotion or photos', async () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  const render = () => ui.render({ id: 42, initialDate: today });
  nodes(render())
    .find((node) => node.type === 'TextInput')
    .props.onChangeText('수정 중인 내용');
  nodes(render())
    .find((node) => node.props.accessibilityLabel === '오늘의 감정 선택')
    .props.onPress();
  nodes(render())
    .find((node) => node.type === 'DiaryEmotionPicker')
    .props.onApply(3);
  nodes(render())
    .find((node) => node.props.accessibilityLabel === '사진 관리, 0장')
    .props.onPress();
  nodes(render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onPick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  nodes(render())
    .find((node) => node.type === 'DiaryImagesPicker')
    .props.onClose();
  render().props.titleAction.onPress();
  const datePicker = nodes(render()).find((node) => node.type === 'DiaryDatePicker');
  assert.equal(datePicker.props.diaryId, 42);
  datePicker.props.onApply('2026-10-10');
  const form = render();
  assert(form.props.title.includes('2026. 10. 10.'));
  assert.equal(nodes(form).find((node) => node.type === 'TextInput').props.value, '수정 중인 내용');
  assert.equal(nodes(form).find((node) => node.type === 'EmotionImage').props.emotion, 3);
  await form.props.footer.props.onPress();
  assert.equal(ui.saved[0].input.id, 42);
  assert.equal(ui.saved[0].input.date, '2026-10-10');
  assert.equal(ui.saved[0].images[0].file, 'draft.jpg');
});

test('diary picker loads recorded dates for the visible month and updates markers on month change', () => {
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx', {
    months: {
      '2026-10': { data: [{ id: 42, date: '2026-10-08' }] },
      '2026-09': { data: [{ id: 43, date: '2026-09-15' }] },
    },
  });
  const calendar = () => nodes(ui.render()).find((node) => node.type === 'DatePickerCalendar');
  assert.deepEqual(calendar().props.diaryDates, ['2026-10-08']);
  calendar().props.onMonthChange('2026-09');
  assert.deepEqual(calendar().props.diaryDates, ['2026-09-15']);
});

test('English date picker keeps duplicate and future-date guards and applies the ISO date after close', () => {
  const ui = harness('src/screens/diary/DiaryDatePicker.tsx', {
    dates: { '2026-10-14': { data: { id: 2 } } },
  });
  ui.setLanguage('en');
  assert.equal(ui.render().props.title, 'Choose a diary date');
  assert.equal(ui.render().props.footer.props.disabled, true);
  assert(
    nodes(ui.render()).some(
      (node) => node.props.children === 'This date already has an entry. Choose another date.',
    ),
  );
  nodes(ui.render())
    .find((node) => node.type === 'DatePickerCalendar')
    .props.onSelect('2026-10-15');
  assert.equal(ui.render().props.footer.props.disabled, true);
  nodes(ui.render())
    .find((node) => node.type === 'DatePickerCalendar')
    .props.onSelect('2026-10-10');
  ui.render().props.footer.props.onPress();
  assert.deepEqual(ui.applied, []);
  ui.finish();
  assert.deepEqual(ui.applied, ['2026-10-10']);
});

test('diary editor changes its labels without clearing text or date draft', () => {
  const ui = harness('src/screens/DiaryForm.tsx');
  nodes(ui.render())
    .find((node) => node.type === 'TextInput')
    .props.onChangeText('내 하루');
  ui.setLanguage('en');
  const tree = ui.render();
  const input = nodes(tree).find((node) => node.type === 'TextInput');
  assert.equal(input.props.value, '내 하루');
  assert.equal(input.props.accessibilityLabel, 'Diary text');
  assert.equal(input.props.placeholder, 'Write about a moment you want to remember.');
  assert.equal(tree.props.title, 'Wednesday, Oct 14, 2026');
  assert.equal(tree.props.footer.props.label, 'Save entry');
});
