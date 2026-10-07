import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { DEFAULT_SETTINGS } from '../src/settings/model';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(file: string, results: Record<string, any> = {}) {
  const exports: any = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  const query = (kind: string) => ({ kind });
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (name === 'react')
          return {
            useState: (value: unknown) => [value, () => {}],
            useRef: (value: unknown) => ({ current: value }),
          };
        if (name === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            FlatList: 'FlatList',
            ActivityIndicator: 'ActivityIndicator',
          };
        if (name === 'expo-router') return { useScrollToTop: () => {} };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query')
          return {
            useInfiniteQuery: () => results.list,
            useQuery: ({ kind }: any) => results[kind],
          };
        if (name.endsWith('/queries'))
          return {
            diaryQueries: { list: () => query('list') },
            statsQueries: {
              years: () => query('years'),
              diary: () => query('diary'),
              habit: () => query('habit'),
            },
            soberQueries: { list: () => query('sobers'), restarts: () => query('restarts') },
            useToday: () => '2026-10-07',
          };
        if (name.endsWith('SettingsProvider'))
          return { useSettings: () => ({ settings: DEFAULT_SETTINGS }) };
        if (name.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: {}, rem: 15 }) };
        if (name.endsWith('useScrollFade')) return { useScrollFade: () => ({}) };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return exports;
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

test('diary retry preserves initial, next-page and cached refresh failure behavior', () => {
  const retried: string[] = [];
  const list: any = {
    isError: true,
    refetch: () => retried.push('refetch'),
    fetchNextPage: () => retried.push('next'),
  };
  const { default: DiaryList } = load('app/(tabs)/diary.tsx', { list });
  const flatList = () => nodes(DiaryList()).find((node) => node.type === 'FlatList');
  const initial = nodes(flatList().props.renderItem({ item: { kind: 'state' } })).find(
    (node) => node.type === 'QueryError',
  );
  initial.props.onRetry();
  assert.deepEqual(retried, ['refetch']);
  list.data = { pages: [[{ id: 1 }]] };
  list.isFetchNextPageError = true;
  const footer = () => nodes(flatList().props.ListFooterComponent);
  assert(
    !nodes(flatList().props.renderItem({ item: { kind: 'state' } })).some(
      (node) => node.type === 'QueryError',
    ),
  );
  footer()
    .find((node) => node.type === 'QueryError')
    .props.onRetry();
  assert.deepEqual(retried, ['refetch', 'next']);
  list.isFetchNextPageError = false;
  footer()
    .find((node) => node.type === 'QueryError')
    .props.onRetry();
  assert.deepEqual(retried, ['refetch', 'next', 'refetch']);
  list.isError = false;
  assert(!footer().some((node) => node.type === 'QueryError'));
});

test('analysis retries only failed queries and retains sections with cached data', () => {
  const retried: string[] = [];
  const results = Object.fromEntries(
    ['years', 'diary', 'habit', 'sobers', 'restarts'].map((kind) => [
      kind,
      {
        data: [],
        isError: false,
        refetch: () => retried.push(kind),
      },
    ]),
  );
  results.restarts = { ...results.restarts, data: undefined, isError: true } as any;
  const { HomeStatsScreen } = load('src/screens/home/HomeStatsScreen.tsx', results);
  const render = () =>
    nodes(HomeStatsScreen({ year: 2026, currentYear: 2026, onYearChange: () => {} }));
  const error = render().find((node) => node.type === 'QueryError');
  assert.equal(error.props.retryAccessibilityLabel, '거리두기 기록 다시 시도');
  error.props.onRetry();
  assert.deepEqual(retried, ['restarts']);
  results.restarts.data = [];
  assert(!render().some((node) => node.type === 'QueryError'));
  assert(render().some((node) => node.type === 'SoberAnalysis'));
});

test('QueryState keeps loading, failure retry and ready states separate', () => {
  const { QueryState } = load('src/components/QueryState.tsx');
  let retries = 0;
  const query = { isPending: true, error: null as Error | null, refetch: () => retries++ };
  assert(nodes(QueryState({ query })).some((node) => node.type === 'ActivityIndicator'));
  query.error = new Error('불러오기 실패');
  const error = QueryState({ query });
  assert.equal(error.type, 'QueryError');
  assert.equal(error.props.message, '불러오기 실패');
  error.props.onRetry();
  assert.equal(retries, 1);
  query.error = null;
  query.isPending = false;
  assert.equal(QueryState({ query }), null);
});
