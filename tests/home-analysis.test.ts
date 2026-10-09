import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { EMOTIONS } from '../src/domain/constants';
import {
  formatSoberDuration,
  getSoberStreaks,
  getSoberSummary,
  SOBER_DAY_MS,
} from '../src/domain/sober';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function render(
  name: string,
  props: any,
  selection?: unknown,
  scenario: { results?: Record<string, any>; routes?: unknown[] } = {},
) {
  const exports: Record<string, Function> = {};
  const jsx = (type: unknown, props: any, key?: unknown) =>
    typeof type === 'function' ? type(props) : { type, props, key };
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/screens/home/${name}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('/DiaryStatisticsSummary'))
          return { DiaryStatisticsSummary: (summaryProps: any) => render('DiaryStatisticsSummary', summaryProps) };
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return { useState: (initial: unknown) => [selection ?? initial, () => {}] };
        if (dependency === 'react-native') return { View: 'View', Pressable: 'Pressable' };
        if (dependency.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ rem: 15, iconSizes: {}, colors: {} }) };
        if (dependency.endsWith('domain/constants')) return { EMOTIONS };
        if (dependency.endsWith('/ModalNavigationProvider'))
          return {
            useModalNavigation: () => ({
              openModal: (route: unknown) => scenario.routes?.push(route),
            }),
          };
        if (dependency === 'expo-router')
          return { useRouter: () => ({ push: (route: unknown) => scenario.routes?.push(route) }) };
        if (dependency.endsWith('SettingsProvider'))
          return {
            useSettings: () => ({ settings: { soberSort: 'DESC', soberPriorityFirst: false } }),
          };
        if (dependency.endsWith('useCurrentMinute'))
          return { useCurrentMinute: () => Date.parse('2026-10-05T12:00:00.000Z') };
        if (dependency.endsWith('domain/sober'))
          return { formatSoberDuration, getSoberStreaks, getSoberSummary, SOBER_DAY_MS };
        if (dependency === 'date-fns') return require('date-fns');
        if (dependency.endsWith('db/sober')) return { sortSobers: (items: unknown[]) => items };
        if (dependency === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (dependency === '@tanstack/react-query')
          return {
            useQuery: ({ kind }: { kind: string }) => ({
              data: kind === 'diary' ? null : [],
              isPending: false,
              isError: false,
              ...scenario.results?.[kind],
            }),
          };
        if (dependency.endsWith('/queries'))
          return {
            diaryQueries: { byDate: () => ({ kind: 'diary' }) },
            habitQueries: {
              list: () => ({ kind: 'habits' }),
              completions: () => ({ kind: 'completions' }),
            },
            soberQueries: {
              list: () => ({ kind: 'sobers' }),
              restarts: () => ({ kind: 'restarts' }),
            },
          };
        if (dependency.startsWith('@expo/vector-icons/'))
          return { __esModule: true, default: 'Icon' };
        const component = dependency.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return exports[name](props);
}
function nodes(node: any): any[] {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...[node.props?.children].flat().flatMap(nodes)];
}
function text(node: any): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return node?.props ? text(node.props.children) : '';
}
const emptyStats = () => ({
  total: 0,
  current: 0,
  longest: 0,
  monthly: Array(12).fill(0),
  emotions: Array(10).fill(0),
  halves: [Array(10).fill(0), Array(10).fill(0)],
});

test('today diary and habit share one card with separate navigation and loading states', () => {
  const routes: unknown[] = [];
  const tree = render('TodayRecordSection', { today: '2026-10-05' }, undefined, { routes });
  assert.equal(tree.props.children.length, 2);
  const buttons = nodes(tree).filter((node) => node.type === 'Pressable');
  assert.equal(buttons.length, 3);
  assert(text(buttons[0]).includes('아직 기록 없음'));
  assert(text(buttons[1]).includes('0개 중 0개 완료'));
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [
    { pathname: '/diary/new', params: { date: '2026-10-05' } },
    '/habit',
    '/sober',
  ]);
  for (const result of [{ isPending: true }, { isError: true }]) {
    const pending = render('TodayRecordSection', { today: '2026-10-05' }, undefined, {
      results: { diary: result, habits: result },
    });
    const actions = nodes(pending).filter((node) => node.type === 'Pressable');
    assert.equal(actions[0].props.disabled, true);
    assert.equal(actions[1].props.disabled, undefined);
    if (result.isPending) {
      assert(nodes(pending).some((node) => node.props.accessibilityLabel === '일기 확인 중'));
      assert(nodes(pending).some((node) => node.props.accessibilityLabel === '습관 확인 중'));
    } else {
      assert(text(actions[0]).includes('불러오기 실패'));
      assert(text(actions[1]).includes('불러오기 실패'));
    }
  }
});

test('recorded diary names its emotion in quotes and opens the diary', () => {
  const routes: unknown[] = [];
  const tree = render('TodayRecordSection', { today: '2026-10-05' }, undefined, {
    routes,
    results: { diary: { data: { id: 42, emotion: 1 } } },
  });
  assert(text(tree.props.children[0]).includes("'기쁨' 기록"));
  assert(!text(tree.props.children[0]).includes('확인하기'));
  const description = nodes(tree.props.children[0]).find((node) => text(node) === "'기쁨' 기록");
  assert.equal(description.props.numberOfLines, 1);
  assert.equal(description.props.adjustsFontSizeToFit, true);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel === '오늘의 감정 일기 이동')
    .props.onPress();
  assert.deepEqual(routes, ['/diary/42']);
});

test('today sober card uses the latest restart and opens the selected record', () => {
  const sober = {
    id: 7,
    name: '카페인',
    icon_key: 'coffee',
    icon_color: 'purple',
    initial_started_at: '2026-10-01T00:00:00.000Z',
    goal_mode: 'AUTO',
    goal_days: null,
  };
  const routes: unknown[] = [];
  const results = {
    sobers: { data: [sober] },
    restarts: { data: [{ id: 1, restarted_at: '2026-10-04T00:00:00.000Z' }] },
  };
  const tree = render('TodayRecordSection', { today: '2026-10-05' }, undefined, {
    results,
    routes,
  });
  const card = tree.props.children[1];
  const soberName = nodes(card).find((node) => text(node) === '카페인');
  assert(soberName);
  assert.equal(soberName.props.numberOfLines, 1);
  assert.equal(soberName.props.ellipsizeMode, 'tail');
  assert(text(card).includes('거리를 두고 지낸 지 2일째예요.'));
  card.props.onPress();
  assert.deepEqual(routes, ['/sober/7']);
  const reset = render('TodayRecordSection', { today: '2026-10-05' }, undefined, {
    results: {
      ...results,
      restarts: { data: [{ id: 2, restarted_at: '2026-10-05T11:00:00.000Z' }] },
    },
  });
  assert(text(reset).includes('거리를 두고 지낸 지 1일째예요.'));
  const failed = render('TodayRecordSection', { today: '2026-10-05' }, undefined, {
    results: { ...results, restarts: { isError: true } },
  });
  assert(text(failed.props.children[1]).includes('기록을 불러오지 못했어요.'));
  assert(!text(failed).includes('일째'));
});

test('diary retains the monthly graph and streaks without extra summaries', () => {
  const stats = { ...emptyStats(), current: 3, longest: 7, total: 6 };
  const tree = render('DiaryAnalysis', { stats, year: 2024 });
  assert(text(tree).includes('현재 연속 기록'));
  assert(text(tree).includes('역대 최고 기록'));
  assert.equal(tree.props.children.at(-1).props.children.length, 12);
  assert(!text(tree).includes('돌아보기'));
  assert(!text(tree).includes('분기'));
});

test('emotion counts keep period filtering and tied badges without added summaries', () => {
  const stats = emptyStats();
  stats.emotions[0] = 2;
  stats.emotions[1] = 2;
  stats.halves[0][0] = 1;
  const tree = render('EmotionStats', { stats, year: 2024 });
  assert.equal(nodes(tree).filter((node) => node.type === 'Badge').length, 2);
  const firstHalf = render('EmotionStats', { stats, year: 2024 }, 1);
  assert(text(firstHalf).includes('전반기 1개'));
  assert.equal(nodes(firstHalf).filter((node) => node.type === 'Badge').length, 1);
  assert(!text(tree).includes('돌아보기'));
  assert(!text(tree).includes('월별'));
  assert.equal(
    nodes(render('EmotionStats', { stats: emptyStats(), year: 2024 })).filter(
      (node) => node.type === 'Badge',
    ).length,
    0,
  );
});

test('habit retains Top 3 selection without annual summaries or the full list', () => {
  const all = [
    { id: 1, name: '걷기', count: 3, priority: 0, icon_key: 'walking' },
    { id: 2, name: '독서', count: 0, priority: 0, icon_key: 'reading' },
  ];
  const tree = render('HabitAnalysis', {
    stats: { all, top: [all[0]], bottom: [all[0]] },
    year: 2024,
  });
  assert(text(tree).includes('상위 Top 3'));
  assert(text(tree).includes('걷기'));
  assert(!text(tree).includes('독서'));
  assert(!text(tree).includes('돌아보기'));
  assert(!text(tree).includes('습관별 완료 기록'));
});

test('sober rankings compare past and current streaks in both directions across all years', () => {
  const sobers = Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    name: `절제 ${index + 1}`,
    icon_key: 'coffee',
    icon_color: 'theme',
    initial_started_at: `2025-01-0${index + 1}T00:00:00.000Z`,
    goal_mode: 'AUTO',
    goal_days: null,
  }));
  const restarts = [
    { id: 1, sober_id: 1, restarted_at: '2026-10-04T00:00:00.000Z' },
    { id: 2, sober_id: 2, restarted_at: '2025-12-01T00:00:00.000Z' },
  ];
  const routes: unknown[] = [];
  const tree = render(
    'SoberAnalysis',
    {
      sobers,
      restarts,
    },
    undefined,
    { routes },
  );
  const rows = tree.props.children[2].props.children;
  assert.equal(rows.length, 3);
  rows[0].props.onPress();
  rows[2].props.onPress();
  assert.deepEqual(routes, ['/sober/1', '/sober/4']);
  assert(text(tree).includes('전체 거리두기 항목 5개'));
  assert.deepEqual(
    Array.from(rows, (row: any) => Number(row.key.split(':')[0])),
    [1, 3, 4],
  );
  assert(rows[0].props.className.includes('border-b'));
  assert(!rows[2].props.className.includes('border-b'));
  const bottom = render('SoberAnalysis', { sobers, restarts }, 'bottom');
  assert.deepEqual(
    Array.from(bottom.props.children[2].props.children, (row: any) =>
      Number(row.key.split(':')[0]),
    ),
    [1, 2, 2],
  );
  const originalOrder = sobers.map((item) => item.id);
  const tied = sobers.map((item) => ({
    ...item,
    initial_started_at: sobers[0].initial_started_at,
  }));
  for (const selection of ['top', 'bottom']) {
    const tieRows = render('SoberAnalysis', { sobers: tied, restarts: [] }, selection).props
      .children[2].props.children;
    assert.deepEqual(
      Array.from(tieRows, (row: any) => Number(row.key.split(':')[0])),
      [1, 2, 3],
    );
  }
  assert.deepEqual(
    sobers.map((item) => item.id),
    originalOrder,
  );
  const short = render('SoberAnalysis', { sobers: sobers.slice(0, 2), restarts: [] });
  const shortRows = short.props.children[2].props.children;
  assert.equal(shortRows.length, 2);
  assert(!shortRows[1].props.className.includes('border-b'));
  assert(
    text(render('SoberAnalysis', { sobers: [], restarts: [] })).includes(
      '아직 거리두기 기록이 없어요.',
    ),
  );
});
