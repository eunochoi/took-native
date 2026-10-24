import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { sortSobers } from '../src/db/sober';
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
  scenario: {
    results?: Record<string, any>;
    routes?: unknown[];
    layoutWidth?: number;
    rem?: number;
    fontScale?: number;
  } = {},
  sourceName = name,
) {
  const exports: Record<string, Function> = {};
  let stateIndex = 0;
  const jsx = (type: unknown, props: any, key?: unknown) =>
    typeof type === 'function' ? type(props) : { type, props, key };
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/screens/home/${sourceName}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('/HomeCardCarousel'))
          return {
            HomeCardCarousel: (props: any) =>
              render('HomeCardCarousel', props, scenario.layoutWidth, scenario),
          };
        if (dependency.endsWith('/HomeSummaryCards'))
          return Object.fromEntries(
            [
              'DiarySummaryCard',
              'HabitSummaryCard',
              'DistanceSummaryCard',
              'ArchiveSummaryCard',
            ].map((name) => [
              name,
              (props: any) => render(name, props, undefined, scenario, 'HomeSummaryCards'),
            ]),
          );
        if (dependency === 'react-native-svg')
          return { __esModule: true, default: 'Svg', Circle: 'Circle' };
        if (dependency.endsWith('/DiaryStatisticsSummary'))
          return {
            DiaryStatisticsSummary: (summaryProps: any) =>
              render('DiaryStatisticsSummary', summaryProps),
          };
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            useState: (initial: unknown) => [
              stateIndex++ === 0 ? (selection ?? initial) : (scenario.layoutWidth ?? initial),
              () => {},
            ],
          };
        if (dependency === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            ScrollView: 'ScrollView',
            useWindowDimensions: () => ({ fontScale: scenario.fontScale ?? 1 }),
          };
        if (dependency.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => ({
              rem: scenario.rem ?? 15,
              iconSizes: {},
              colors: require('../src/theme/colors').themeColors('blue', 'light'),
            }),
          };
        if (dependency.endsWith('domain/calendar')) return require('../src/domain/calendar');
        if (dependency.endsWith('domain/habitStats')) return require('../src/domain/habitStats');
        if (dependency.endsWith('domain/constants')) return { EMOTIONS };
        if (dependency.endsWith('domain/diaryFilters'))
          return require('../src/domain/diaryFilters');
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
            useSettings: () => ({
              settings: { soberSort: 'DESC', soberRecordSort: 'DESC', soberPriorityFirst: false },
            }),
          };
        if (dependency.endsWith('useCurrentMinute'))
          return { useCurrentMinute: () => Date.parse('2026-10-05T12:00:00.000Z') };
        if (dependency.endsWith('domain/sober'))
          return { formatSoberDuration, getSoberStreaks, getSoberSummary, SOBER_DAY_MS };
        if (dependency === 'date-fns') return require('date-fns');
        if (dependency.endsWith('db/sober')) return { sortSobers };
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
  monthlyAverage: 0,
  current: 0,
  longest: 0,
  monthly: Array(12).fill(0),
  emotions: Array(EMOTIONS.length).fill(0),
  halves: [Array(EMOTIONS.length).fill(0), Array(EMOTIONS.length).fill(0)],
});

test('home summary cards retain separate navigation and loading states', () => {
  const routes: unknown[] = [];
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, { routes });
  assert.equal(tree.props.children.length, 2);
  const buttons = nodes(tree).filter((node) => node.type === 'Pressable');
  assert.equal(buttons.length, 4);
  assert(text(buttons[0]).includes('일기'));
  assert(text(buttons[0]).includes('기록 없음'));
  assert(text(buttons[1]).includes('0/0'));
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [
    { pathname: '/diary/new', params: { date: '2026-10-05' } },
    '/habit',
    '/sober',
    { pathname: '/home/[year]/stats', params: { year: '2026' } },
  ]);
  for (const result of [{ isPending: true }, { isError: true }]) {
    const pending = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
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
      assert(actions[1].props.accessibilityLabel.includes('불러오기 실패'));
      assert(text(actions[1]).includes('불러오기 실패'));
    }
  }
});

test('recorded diary shows its actual emotion artwork and opens the diary', () => {
  const routes: unknown[] = [];
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    routes,
    results: { diary: { data: { id: 42, emotion: 1 } } },
  });
  assert(text(tree).includes('기쁨'));
  const artwork = nodes(tree).find((node) => node.type === 'EmotionImage');
  assert.equal(artwork.props.emotion, 1);
  assert.equal(artwork.props.iconStyle, 'basic');
  assert(!text(tree).includes('확인하기'));
  const description = nodes(tree).find(
    (node) => node.type === 'Text' && text(node) === "'기쁨' 기록 남김",
  );
  assert.equal(description.props.numberOfLines, 1);
  assert.equal(description.props.adjustsFontSizeToFit, true);
  nodes(tree)
    .find((node) => node.props.accessibilityLabel?.startsWith('오늘의 감정 일기 이동'))
    .props.onPress();
  assert.deepEqual(routes, ['/diary/42']);
});

test('today habits show completed count before total count', () => {
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results: {
      habits: {
        data: Array.from({ length: 8 }, (_, id) => ({
          id,
          priority: 1,
          initial_started_at: '2026-10-01T00:00:00',
        })),
      },
      completions: {
        data: Array.from({ length: 3 }, (_, habit_id) => ({ habit_id, date: '2026-10-05' })),
      },
    },
  });
  const habitButton = nodes(tree).find((node) =>
    node.props.accessibilityLabel?.startsWith('오늘의 습관 이동'),
  );
  assert(nodes(habitButton).some((node) => node.type === 'Text' && text(node) === '3/8'));
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
    restarts: { data: [{ id: 1, sober_id: 7, restarted_at: '2026-10-04T00:00:00.000Z' }] },
  };
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results,
    routes,
  });
  const card = nodes(tree).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('거리두기 이동'),
  );
  const soberName = nodes(card).find((node) => text(node) === '카페인');
  assert(soberName);
  assert.equal(soberName.props.numberOfLines, 1);
  assert.equal(soberName.props.ellipsizeMode, 'tail');
  const dayLabel = nodes(card).find((node) => node.type === 'Text' && text(node) === '2일차');
  assert(dayLabel);
  assert.equal(dayLabel.props.numberOfLines, 1);
  assert.equal(dayLabel.props.adjustsFontSizeToFit, true);
  assert(dayLabel.props.className.includes('w-full'));
  assert(card.props.accessibilityLabel.includes('2일차'));
  card.props.onPress();
  assert.deepEqual(routes, ['/sober/7']);
  const reset = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results: {
      ...results,
      restarts: { data: [{ id: 2, sober_id: 7, restarted_at: '2026-10-05T11:00:00.000Z' }] },
    },
  });
  assert(text(reset).includes('1일'));
  const failed = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results: { ...results, restarts: { isError: true } },
  });
  assert(text(failed).includes('불러오기 실패'));
  assert(!text(failed).includes('일째'));
});

test('diary shows three summary columns with monthly average and retains monthly graph', () => {
  const stats = { ...emptyStats(), current: 3, longest: 7, total: 6, monthlyAverage: 0.5 };
  const tree = render('DiaryAnalysis', { stats, year: 2024 });
  assert(text(tree).includes('현재 연속 기록'));
  assert(text(tree).includes('역대 최고 기록'));
  const summary = tree.props.children[1];
  const columns = summary.props.children;
  assert.equal(columns.length, 3);
  assert(text(columns[0]).includes('3일'));
  assert(text(columns[1]).includes('7일'));
  assert(text(columns[2]).includes('월평균 일기0.5개'));
  assert(columns[1].props.className.includes('border-l'));
  assert(columns[2].props.className.includes('border-l'));
  assert(
    text(render('DiaryAnalysis', { stats: emptyStats(), year: 2024 })).includes('월평균 일기0개'),
  );
  assert.equal(tree.props.children[2].props.children.length, 12);
  assert(!text(tree).includes('돌아보기'));
  assert(!text(tree).includes('분기'));
});

test('diary monthly average rounds to one decimal and omits trailing zeroes', () => {
  for (const [monthlyAverage, expected] of [
    [1.26, '1.3'],
    [2, '2'],
    [0, '0'],
  ] as const) {
    const tree = render('DiaryAnalysis', {
      stats: { ...emptyStats(), monthlyAverage },
      year: 2024,
    });
    assert(text(tree.props.children[1].props.children[2]).includes(`월평균 일기${expected}개`));
  }
});

test('emotion counts follow period filtering without individual percentages or ranking', () => {
  const stats = emptyStats();
  stats.emotions[0] = 2;
  stats.emotions[1] = 2;
  stats.halves[0][0] = 1;
  const tree = render('EmotionStats', { stats, year: 2024 });
  const cells = nodes(tree).filter((node) => node.props?.children?.[0]?.type === 'EmotionImage');
  assert.equal(text(cells[0]), `${EMOTIONS[0].name}2회`);
  assert.equal(text(cells[1]), `${EMOTIONS[1].name}2회`);
  assert(cells.every((cell) => !text(cell).includes('%') && !text(cell).includes('1등')));
  const firstHalf = render('EmotionStats', { stats, year: 2024 }, 1);
  assert(text(firstHalf).includes('전반기 1개'));
  const firstHalfCells = nodes(firstHalf).filter(
    (node) => node.props?.children?.[0]?.type === 'EmotionImage',
  );
  assert.equal(text(firstHalfCells[0]), `${EMOTIONS[0].name}1회`);
  assert.equal(text(firstHalfCells[1]), `${EMOTIONS[1].name}0회`);
  assert(!text(tree).includes('돌아보기'));
  assert(!text(tree).includes('월별'));
  const emptyCells = nodes(render('EmotionStats', { stats: emptyStats(), year: 2024 })).filter(
    (node) => node.props?.children?.[0]?.type === 'EmotionImage',
  );
  assert.equal(emptyCells.length, EMOTIONS.length);
  assert(emptyCells.every((cell, index) => text(cell) === `${EMOTIONS[index].name}0회`));
});

test('emotion proportions group every emotion and follow all three periods', () => {
  const stats = emptyStats();
  stats.halves = [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 0],
    [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  ];
  stats.emotions = stats.halves[0].map((count, index) => count + stats.halves[1][index]);
  for (const [period, expected] of [
    [12, 16, 30],
    [10, 15, 30],
    [2, 1, 0],
  ].entries()) {
    const tree = render('EmotionStats', { stats, year: 2024 }, period);
    const bar = nodes(tree).find((node) => node.props.accessibilityLabel?.startsWith('감정 비율'))!;
    const total = expected.reduce((sum, count) => sum + count, 0);
    for (const [index, label] of ['긍정', '중립', '부정'].entries()) {
      assert(
        bar.props.accessibilityLabel.includes(
          `${label} ${expected[index]}회 ${Math.round((expected[index] / total) * 100)}%`,
        ),
      );
    }
    const segments = nodes(bar.props.children).filter((node) => node.type === 'View');
    assert.deepEqual(
      Array.from(segments, (node) => node.props.style.flexGrow),
      expected.filter((count) => count > 0),
    );
  }
});

test('emotion statistics retain all emotions and counts in one horizontal album strip', () => {
  const stats = emptyStats();
  stats.emotions[10] = 1;
  stats.emotions[11] = 1;
  const tree = render('EmotionStats', { stats, year: 2024 });
  const images = nodes(tree).filter((node) => node.type === 'EmotionImage');
  assert.deepEqual(
    Array.from(images, (node) => node.props.emotion),
    EMOTIONS.map((_, id) => id),
  );
  const cells = nodes(tree).filter((node) => node.props?.children?.[0]?.type === 'EmotionImage');
  assert.equal(text(cells[10]), '피곤함1회');
  assert.equal(text(cells[11]), '싱숭생숭1회');
  const bar = nodes(tree).find((node) => node.props.accessibilityLabel?.startsWith('감정 비율'))!;
  assert(bar.props.accessibilityLabel.includes('중립 2회 100%'));
  assert(text(tree).includes('중립: 놀람, 무덤덤, 피곤함, 싱숭생숭'));
  const strip = nodes(tree).find((node) => node.type === 'ScrollView');
  assert.equal(strip.props.horizontal, true);
  assert.equal(strip.props.children.length, EMOTIONS.length);
  for (const [index, card] of strip.props.children.entries()) {
    assert.equal(
      card.props.accessibilityLabel,
      `${EMOTIONS[index].name} ${stats.emotions[index]}회`,
    );
    assert(!card.props.className.includes('border'));
    assert(card.props.style.backgroundColor.startsWith(EMOTIONS[index].color));
  }
});

test('emotion strip always shows two whole cards and one fifth of the next at every supported text size', () => {
  for (const layoutWidth of [320, 360, 390, 430, 768, 1024]) {
    for (const rem of [14, 15, 16]) {
      const tree = render('EmotionStats', { stats: emptyStats(), year: 2024 }, 0, {
        layoutWidth,
        rem,
      });
      const strip = nodes(tree).find((node) => node.type === 'ScrollView');
      const card = strip.props.children[0];
      const width = card.props.style.width;
      const leadingInset = strip.props.contentContainerStyle.paddingHorizontal;
      const thirdCardStart = leadingInset + 2 * width + 2 * rem * 0.75;
      assert(width > 0);
      assert(thirdCardStart < layoutWidth);
      assert(Math.abs((layoutWidth - thirdCardStart) / width - 0.2) < 0.000001);
      const image = nodes(card).find((node) => node.type === 'EmotionImage');
      assert(image.props.size > 0);
      assert(image.props.size + rem * 5.25 <= width + 0.000001);
    }
  }
});

test('emotion proportions show an empty track or a single full segment without invalid ratios', () => {
  for (const count of [0, 3]) {
    const stats = emptyStats();
    stats.emotions[6] = count;
    const tree = render('EmotionStats', { stats, year: 2024 });
    const bar = nodes(tree).find((node) => node.props.accessibilityLabel?.startsWith('감정 비율'))!;
    assert(!bar.props.accessibilityLabel.includes('NaN'));
    assert(bar.props.accessibilityLabel.includes(`부정 ${count}회 ${count ? 100 : 0}%`));
    const segments = nodes(bar.props.children).filter((node) => node.type === 'View');
    assert.equal(segments.length, count ? 1 : 0);
    if (count) assert.equal(segments[0].props.className, 'bg-theme-emotion-negative');
    else assert(bar.props.className.includes('bg-theme-accent/30'));
  }
});

test('habit retains Top 3 selection without annual summaries or the full list', () => {
  const all = [
    { id: 1, name: '걷기', count: 3, priority: 1, icon_key: 'walking' },
    { id: 2, name: '독서', count: 0, priority: 1, icon_key: 'reading' },
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
  assert(text(tree).includes('전체 항목 5개'));
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

test('sober analysis separates status, days and remaining time for current and ended intervals', () => {
  const sober = {
    id: 1,
    name: '배달 음식',
    icon_key: 'delivery',
    initial_started_at: '2026-09-01T00:00:00.000Z',
  };
  const tree = render('SoberAnalysis', {
    sobers: [sober],
    restarts: [{ id: 1, sober_id: 1, restarted_at: '2026-10-04T10:00:00.000Z' }],
  });
  const rows = nodes(tree).filter((node) => node.type === 'Pressable');
  for (const [index, status, days, time, duration] of [
    [0, '종료', '33일', '10시간 0분', '33일 10시간 0분'],
    [1, '진행 중', '1일', '2시간 0분', '1일 2시간 0분'],
  ] as const) {
    const row = rows[index];
    for (const expected of [sober.name, status, days, time]) {
      assert(nodes(row).some((node) => text(node) === expected));
    }
    assert(row.props.accessibilityLabel.includes(status));
    assert(row.props.accessibilityLabel.includes(duration));
  }
  const zero = render('SoberAnalysis', {
    sobers: [{ ...sober, initial_started_at: '2026-10-05T12:00:00.000Z' }],
    restarts: [],
  });
  for (const expected of ['진행 중', '0일', '0시간 0분']) {
    assert(nodes(zero).some((node) => text(node) === expected));
  }
});

test('home sober card selects by current record using all restarts', () => {
  const routes: unknown[] = [];
  const items = [7, 8].map((id) => ({
    id,
    name: `항목 ${id}`,
    icon_key: 'coffee',
    icon_color: 'theme',
    initial_started_at: '2026-10-01T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    is_priority: 0,
    goal_mode: 'AUTO',
    goal_days: null,
  }));
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    routes,
    results: {
      sobers: { data: items },
      restarts: { data: [{ id: 1, sober_id: 7, restarted_at: '2026-10-05T00:00:00.000Z' }] },
    },
  });
  const card = nodes(tree).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('거리두기 이동'),
  );
  assert(text(card).includes('항목 8'));
  assert(text(card).includes('5일'));
  card.props.onPress();
  assert.deepEqual(routes, ['/sober/8']);
});

test('home carousel shows two whole squares and 20% of the next with bounded snap offsets', () => {
  for (const layoutWidth of [320, 360, 390, 430, 768, 1024]) {
    for (const rem of [14, 15, 16]) {
      const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
        layoutWidth,
        rem,
      });
      const strip = nodes(tree).find((node) => node.type === 'ScrollView');
      const cards = nodes(strip).filter((node) => node.type === 'Pressable');
      assert.equal(cards.length, 4);
      const width = cards[0].props.style.width;
      assert(
        cards.every(
          (card) =>
            card.props.style.width === width && card.props.className.includes('aspect-square'),
        ),
      );
      const inset = strip.props.contentContainerStyle.paddingHorizontal;
      const gap = rem * 0.75;
      assert.equal(inset, layoutWidth * 0.05);
      assert(Math.abs((layoutWidth - inset - 2 * width - 2 * gap) / width - 0.2) < 0.000001);
      const end = inset * 2 + 4 * width + 3 * gap - layoutWidth;
      assert.equal(strip.props.snapToOffsets[0], 0);
      assert.equal(strip.props.snapToOffsets.at(-1), end);
      assert(strip.props.snapToOffsets.every((offset: number) => offset >= 0 && offset <= end));
      assert.equal(strip.props.showsHorizontalScrollIndicator, false);
      assert.equal(strip.props.directionalLockEnabled, true);
      assert.equal(strip.props.className, '-mx-[5.555556%]');
      assert(Math.abs(layoutWidth * 0.9 * 0.05555556 - inset) < 0.00001);
      const artwork = nodes(
        render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
          layoutWidth,
          rem,
          results: { diary: { data: { id: 1, emotion: 2 } } },
        }),
      ).find((node) => node.type === 'EmotionImage');
      assert(artwork.props.size > 0 && artwork.props.size + rem * 4.5 <= width + 0.000001);
    }
  }
});

test('home cards expand for accessibility text and very narrow viewports', () => {
  for (const [layoutWidth, fontScale] of [
    [240, 1],
    [320, 2],
  ]) {
    const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
      layoutWidth,
      fontScale,
    });
    const strip = nodes(tree).find((node) => node.type === 'ScrollView');
    const cards = nodes(strip).filter((node) => node.type === 'Pressable');
    assert(cards.every((card) => card.props.style.width >= 15 * 7.5 * fontScale));
    assert(strip.props.snapToOffsets.at(-1) > 0);
  }
});

test('home card order uses stable IDs and preserves the destination of each card', () => {
  const routes: unknown[] = [];
  const tree = render(
    'HomeSummarySection',
    { today: '2026-10-05', cardOrder: ['distance', 'habit', 'diary', 'archive'] },
    undefined,
    { routes, layoutWidth: 390 },
  );
  const strip = nodes(tree).find((node) => node.type === 'ScrollView');
  assert.deepEqual(
    Array.from(strip.props.children, (node: any) => node.key),
    ['distance', 'habit', 'diary', 'archive'],
  );
  const buttons = nodes(strip).filter((node) => node.type === 'Pressable');
  assert.deepEqual(
    buttons.map((button) => text(button.props.children[0])),
    ['거리두기', '습관', '일기', '기록 분석'],
  );
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [
    '/sober',
    '/habit',
    { pathname: '/diary/new', params: { date: '2026-10-05' } },
    { pathname: '/home/[year]/stats', params: { year: '2026' } },
  ]);
});

test('home archive is the fourth square card with the existing year destination', () => {
  const routes: unknown[] = [];
  const tree = render('HomeSummarySection', { today: '2025-12-31' }, undefined, {
    routes,
    layoutWidth: 390,
  });
  const strip = nodes(tree).find((node) => node.type === 'ScrollView');
  const cards = nodes(strip).filter((node) => node.type === 'Pressable');
  const archive = cards[3];
  assert.equal(archive.props.accessibilityLabel, '기록 분석 보기, 쌓인 기록의 흐름 확인');
  assert(archive.props.className.includes('aspect-square'));
  assert.equal(archive.props.style.width, cards[0].props.style.width);
  assert.equal(text(archive), '기록 분석쌓인 기록의 흐름분석 보기 →');
  assert(archive.props.children[1].props.className.includes('items-center justify-center gap-1'));
  assert(archive.props.children[1].props.children[1].props.className.includes('text-center'));
  assert(nodes(archive).some((node) => node.props.name === 'description'));
  archive.props.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [
    { pathname: '/home/[year]/stats', params: { year: '2025' } },
  ]);
  assert.equal(nodes(tree).filter((node) => node.props.accessibilityRole === 'header').length, 1);
  assert.equal(
    nodes(tree).filter((node) => node.type === 'Text' && text(node) === '분석 보기 →').length,
    1,
  );
});

test('habit donut matches actual completion, including empty and full rings', () => {
  for (const [completed, total] of [
    [0, 0],
    [0, 6],
    [4, 6],
    [6, 6],
  ]) {
    const tree = render(
      'HabitSummaryCard',
      {
        size: 160,
        pending: false,
        error: false,
        completed,
        total,
        freeRecords: null,
        onPress() {},
      },
      undefined,
      {},
      'HomeSummaryCards',
    );
    const circles = nodes(tree).filter((node) => node.type === 'Circle');
    assert.equal(circles.length, completed ? 2 : 1);
    assert(text(tree).includes(`${completed}/${total}`));
    if (completed) {
      const ring = circles[1].props;
      assert.equal(ring.strokeLinecap, 'round');
      assert(
        Math.abs(ring.strokeDashoffset / ring.strokeDasharray[0] - (1 - completed / total)) <
          0.000001,
      );
    }
    assert(
      tree.props.accessibilityLabel.includes(
        total === 0
          ? '습관을 추가해 보세요'
          : completed === total
            ? '완료'
            : completed
              ? `${Math.round((completed / total) * 100)}%`
              : '오늘도 하나씩',
      ),
    );
    assert.equal(
      text(tree.props.children[1].props.children[1]),
      total === 0
        ? '습관을 추가해 보세요'
        : completed === total
          ? '완료'
          : completed > 0
            ? `${Math.round((completed / total) * 100)}%`
            : '오늘도 하나씩',
    );
    assert(!JSON.stringify(tree).includes('NaN'));
  }
});

test('home habit donut excludes free records while retaining their empty-state count', () => {
  const habits = [0, 1, 1].map((priority, id) => ({
    id,
    priority,
    initial_started_at: '2026-10-01T00:00:00',
  }));
  const results = {
    habits: { data: habits },
    completions: { data: [0, 1].map((habit_id) => ({ habit_id, date: '2026-10-05' })) },
  };
  const mixed = render('HomeSummarySection', { today: '2026-10-05' }, undefined, { results });
  const card = nodes(mixed).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('오늘의 습관 이동'),
  );
  assert(text(card).includes('1/2'));
  const free = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results: { ...results, habits: { data: [habits[0]] } },
  });
  const freeCard = nodes(free).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('오늘의 습관 이동'),
  );
  assert(text(freeCard).includes('0/0'));
  assert(freeCard.props.accessibilityLabel.includes('1건 자유 기록'));
  assert(text(freeCard).includes('1건 자유 기록'));
  assert.equal(nodes(freeCard).filter((node) => node.type === 'Circle').length, 1);
});

test('home cards center their titles and group emotion or distance captions directly below the visual', () => {
  const tree = render('HomeSummarySection', { today: '2026-10-05' }, undefined, {
    results: { diary: { data: { id: 1, emotion: 2 } } },
  });
  const strip = nodes(tree).find((node) => node.type === 'ScrollView');
  const [diary, habit, distance] = nodes(strip).filter((node) => node.type === 'Pressable');
  for (const card of [diary, habit, distance]) {
    assert(card.props.className.includes('items-center'));
    assert(card.props.children[0].props.className.includes('text-center'));
    assert.equal(card.props.children.length, 2);
  }
  const diaryGroup = diary.props.children[1];
  assert(diaryGroup.props.className.includes('justify-center gap-1'));
  assert.equal(diaryGroup.props.children[0].type, 'EmotionImage');
  assert.equal(text(diaryGroup.props.children[1]), `'${EMOTIONS[2].name}' 기록 남김`);
  const distanceGroup = distance.props.children[1];
  assert(distanceGroup.props.className.includes('justify-center gap-1'));
  assert.equal(text(distanceGroup.props.children[1]), '기록 없음');
  assert.equal(text(habit), '습관0/0습관을 추가해 보세요');
});

test('habit donut follows the calendar progress colors at the 25 and 75 percent boundaries', () => {
  const colors = require('../src/theme/colors').themeColors('blue', 'light');
  for (const [completed, color] of [
    [0, colors.border],
    [1, colors.progressLow],
    [24, colors.progressLow],
    [25, colors.progressMedium],
    [74, colors.progressMedium],
    [75, colors.progressHigh],
    [100, colors.progressHigh],
  ]) {
    const tree = render(
      'HabitSummaryCard',
      {
        size: 160,
        pending: false,
        error: false,
        completed,
        total: 100,
        freeRecords: null,
        onPress() {},
      },
      undefined,
      {},
      'HomeSummaryCards',
    );
    const circles = nodes(tree).filter((node) => node.type === 'Circle');
    assert(circles.every((circle) => circle.props.stroke === color));
    assert.equal(circles.length, completed === 0 ? 1 : 2);
  }
});
