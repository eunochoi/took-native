import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { database } from './database';
import { getSoberMemoPage, saveSober, saveSoberRestart } from '../src/db/sober';
import { format, parseISO } from 'date-fns';
import { localDate } from '../src/domain/date';

const require = createRequire(import.meta.url);
const ts = require('typescript');

test('memo cursor pages keep timestamp ties, exclude empty memos and isolate each sober', async () => {
  const { db, raw } = await database();
  const now = Date.parse('2026-10-09T12:00:00.000Z');
  const input = {
    description: null,
    icon_key: 'coffee' as const,
    icon_color: 'theme' as const,
    is_priority: 0 as const,
    initial_started_at: '2026-10-01T00:00:00.000Z',
    goal_mode: 'AUTO' as const,
    goal_days: null,
  };
  try {
    const id = await saveSober(db, { ...input, name: '커피' }, now);
    const other = await saveSober(db, { ...input, name: '야식' }, now);
    const ids: number[] = [];
    for (let index = 0; index < 38; index++)
      ids.push(
        await saveSoberRestart(
          db,
          {
            sober_id: id,
            restarted_at: index < 5 ? '2026-10-07T12:00:00.000Z' : '2026-10-08T12:00:00.000Z',
            memo: `메모 ${index}`,
          },
          now,
        ),
      );
    for (const memo of [null, '', '   '])
      await saveSoberRestart(
        db,
        { sober_id: id, restarted_at: '2026-10-09T10:00:00.000Z', memo },
        now,
      );
    await saveSoberRestart(
      db,
      { sober_id: other, restarted_at: '2026-10-09T10:00:00.000Z', memo: '다른 항목' },
      now,
    );
    for (const sort of ['ASC', 'DESC'] as const) {
      const first = await getSoberMemoPage(db, id, sort);
      assert.equal(first.records.length, 20);
      assert(first.nextCursor);
      const second = await getSoberMemoPage(db, id, sort, first.nextCursor);
      assert.equal(second.records.length, 18);
      assert.equal(second.nextCursor, undefined);
      assert.deepEqual(
        [...first.records, ...second.records].map((row) => row.id),
        sort === 'ASC' ? ids : [...ids].reverse(),
      );
    }
    const first = await getSoberMemoPage(db, id, 'DESC');
    // Removing an already loaded row must not shift the next page and skip a memo.
    await db.runAsync('DELETE FROM sober_restarts WHERE id = ?', first.records[0].id);
    const second = await getSoberMemoPage(db, id, 'DESC', first.nextCursor);
    assert.deepEqual(
      second.records.map((row) => row.id),
      [...ids].reverse().slice(20),
    );
    await assert.rejects(getSoberMemoPage(db, 0, 'DESC'));
    assert.equal((await getSoberMemoPage(db, 9999, 'ASC')).records.length, 0);
  } finally {
    raw.close();
  }
});

const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
function nodes(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (typeof node.type === 'function') return nodes(node.type(node.props));
  return [node, ...nodes(node.props?.children)];
}
function screen() {
  const slots: any[] = [];
  let cursor = 0;
  let id = '1';
  const queries: any[] = [];
  const calls: string[] = [];
  const sober: any = {
    data: { name: '커피' },
    isPending: false,
    error: null,
    refetch: () => calls.push('sober'),
  };
  const list: any = {
    data: { pages: [{ records: [] }] },
    isPending: false,
    isError: false,
    hasNextPage: true,
    isFetching: false,
    isFetchingNextPage: false,
    fetchNextPage: async () => calls.push('next'),
    refetch: () => calls.push('refetch'),
  };
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../app/sober/[id]/memos.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/SoberRestartActions'))
          return {
            SoberRestartActions: ({ children }: any) =>
              children({
                pending: false,
                onMenu: () => {},
                onBeforeClose: () => true,
              }),
          };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === 'react')
          return {
            createElement: (type: unknown, props: any) => jsx(type, props, props.key),
            useState: (initial: unknown) => {
              const index = cursor++;
              if (!(index in slots)) slots[index] = initial;
              return [
                slots[index],
                (value: unknown) => {
                  slots[index] = value;
                },
              ];
            },
            useRef: (initial: unknown) => {
              const index = cursor++;
              return slots[index] ?? (slots[index] = { current: initial });
            },
            useMemo: (fn: Function) => fn(),
          };
        if (name === 'expo-router') return { useLocalSearchParams: () => ({ id }) };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query')
          return {
            useQuery: () => sober,
            useInfiniteQuery: (options: unknown) => {
              queries.push(options);
              return list;
            },
          };
        if (name.endsWith('/queries'))
          return {
            soberQueries: {
              byId: () => ({}),
              memos: (_db: unknown, value: number, sort: string) => ({ id: value, sort }),
            },
          };
        if (name.endsWith('/domain/date')) return { localDate };
        if (name.endsWith('/AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: { sm: 18 } }) };
        if (name === 'date-fns' || name === 'date-fns/locale') return require(name);
        if (name === 'react-native')
          return { View: 'View', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator' };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  const render = () => {
    cursor = 0;
    return exports.default();
  };
  const viewport: any = {
    ref: {},
    onScroll: () => {},
    onLayout: () => {},
    contentContainerStyle: { paddingBottom: 60 },
  };
  const flat = () =>
    nodes(render())
      .find((node) => node.type === 'BottomSheetPage')
      .props.renderScrollView(viewport);
  return {
    list,
    sober,
    calls,
    queries,
    render,
    flat,
    viewport,
    setId: (value: string) => {
      id = value;
    },
  };
}

test('memo route merges dates across pages and sorts without replacing its parent route', () => {
  const ui = screen();
  ui.list.data.pages = [
    { records: [{ id: 3, restarted_at: '2026-10-08T10:00:00.000Z', memo: '셋' }] },
    {
      records: [
        { id: 2, restarted_at: '2026-10-08T09:00:00.000Z', memo: '둘' },
        { id: 1, restarted_at: '2026-10-07T09:00:00.000Z', memo: '하나' },
      ],
    },
  ];
  const flat = ui.flat();
  assert.equal(flat.type, 'AnimatedFlatList');
  assert.equal(flat.props.onScroll, ui.viewport.onScroll);
  assert.equal(flat.props.ref, ui.viewport.ref);
  assert.equal(flat.props.contentContainerStyle, ui.viewport.contentContainerStyle);
  assert.deepEqual(
    Array.from(flat.props.data, (row: any) => row.firstOfDate),
    [true, false, true],
  );
  const second = flat.props.renderItem({ item: flat.props.data[1], index: 1 });
  assert.equal(nodes(second).filter((node) => node.props.accessibilityRole === 'header').length, 0);
  const card = nodes(second).find((node) => node.type === 'SoberRestartCard');
  assert.equal(card.props.record.memo, '둘');
  assert.equal(typeof card.props.onMenu, 'function');
  assert.equal(card.props.pending, false);
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'BottomSheetPage').props.title,
    '커피 메모',
  );
  assert(!nodes(flat.props.ListHeaderComponent).some((node) => node.props.children === '커피'));

  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'BottomSheetPage').props.backRoute,
    '/sober/1',
  );
  const sorting = nodes(flat.props.ListHeaderComponent).find((node) => node.type === 'Pressable');
  assert.equal(sorting.props.accessibilityLabel, '메모 기록 정렬, 최신순');
  sorting.props.onPress();
  const picker = nodes(ui.render()).find((node) => node.type === 'RecordSortPicker');
  assert.equal(picker.props.sort, 'DESC');
  assert.equal(picker.props.sortLabel, '다시 시작 일시 정렬');
  picker.props.onApply('ASC');
  const ascending = ui.flat();
  assert.equal(ascending.key, '1:ASC');
  assert.equal(ui.queries.at(-1).sort, 'ASC');
  assert.equal(
    nodes(ascending.props.ListHeaderComponent).find((node) => node.type === 'Pressable').props
      .accessibilityLabel,
    '메모 기록 정렬, 과거순',
  );
  assert.equal(
    nodes(ui.render()).find((node) => node.type === 'RecordSortPicker'),
    undefined,
  );
});

test('memo route handles empty, loading, failed and missing-item states', () => {
  const ui = screen();
  assert(
    nodes(ui.flat().props.ListEmptyComponent).some(
      (node) => node.props.children === '아직 남긴 메모가 없어요.',
    ),
  );
  ui.list.isPending = true;
  assert(
    nodes(ui.flat().props.ListEmptyComponent).some((node) => node.type === 'ActivityIndicator'),
  );
  ui.list.isPending = false;
  ui.list.isError = true;
  ui.list.data = undefined;
  ui.flat().props.ListEmptyComponent.props.onRetry();
  assert.deepEqual(ui.calls, ['refetch']);
  ui.sober.data = null;
  assert(
    nodes(ui.render()).some((node) => node.props.children === '거리두기 항목을 찾을 수 없어요.'),
  );
  ui.setId('invalid');
  assert(!nodes(ui.render()).some((node) => node.type === 'QueryState'));
  assert.equal(ui.queries.at(-1).enabled, false);
});

test('memo pagination rejects duplicate loads and retries failures only on request', async () => {
  const ui = screen();
  let finish!: () => void;
  ui.list.fetchNextPage = () => {
    ui.calls.push('next');
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  };
  ui.flat().props.onEndReached();
  ui.flat().props.onEndReached();
  assert.deepEqual(ui.calls, ['next']);
  finish();
  await new Promise<void>((resolve) => setImmediate(resolve));
  ui.list.isError = true;
  ui.list.isFetchNextPageError = true;
  ui.flat().props.onEndReached();
  assert.deepEqual(ui.calls, ['next']);
  const footer = () =>
    nodes(ui.flat().props.ListFooterComponent).find((node) => node.type === 'QueryError');
  footer().props.onRetry();
  assert.deepEqual(ui.calls, ['next', 'next']);
  finish();
  await new Promise<void>((resolve) => setImmediate(resolve));
  ui.list.isFetchNextPageError = false;
  footer().props.onRetry();
  assert.deepEqual(ui.calls, ['next', 'next', 'refetch']);
  ui.list.isError = false;
  ui.list.hasNextPage = false;
  ui.flat().props.onEndReached();
  assert.equal(ui.calls.length, 3);
});

test('shared restart card retains memo text and menu behavior while supporting read-only rows', () => {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/screens/sober/SoberRestartCard.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'date-fns') return require(name);
        if (name === 'react-native') return { View: 'View' };
        if (name.endsWith('/theme/classes')) return require('../src/theme/classes');
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  const record = {
    id: 1,
    restarted_at: '2026-10-08T09:30:00.000Z',
    memo: '긴 메모\n줄바꿈도 유지해요.',
  };
  let selected: any;
  const editable = nodes(
    exports.SoberRestartCard({
      record,
      pending: true,
      onMenu: (value: any) => {
        selected = value;
      },
    }),
  );
  const menu = editable.find((node) => node.type === 'RecordMenuButton');
  assert.equal(menu.props.disabled, true);
  menu.props.onPress();
  assert.equal(selected, record);
  assert(editable.some((node) => node.props.children === record.memo));
  const readOnly = nodes(exports.SoberRestartCard({ record }));
  assert(!readOnly.some((node) => node.type === 'RecordMenuButton'));
  assert(readOnly.some((node) => node.props.children === record.memo));
  const time = format(parseISO(record.restarted_at), 'HH:mm');
  assert(editable.some((node) => node.type === 'Text' && node.props.children === time));
  assert(
    !editable.some(
      (node) => node.type === 'Text' && String(node.props.children).includes('다시 시작'),
    ),
  );
  const withoutMemo = nodes(exports.SoberRestartCard({ record: { ...record, memo: null } }));
  assert.equal(withoutMemo.filter((node) => node.type === 'Text').length, 1);
  assert.equal(withoutMemo.find((node) => node.type === 'Text').props.children, time);
});
