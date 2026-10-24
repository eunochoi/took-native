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
        const componentName = dependency.split('/').at(-1)!;
        if (
          ['HomeTodayItem', 'HomeTodayDiary', 'HomeTodayHabit', 'HomeTodaySober'].includes(
            componentName,
          )
        )
          return {
            [componentName]: (props: any) => render(componentName, props, undefined, scenario),
          };
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
            useWindowDimensions: () => ({
              width: scenario.layoutWidth ?? 390,
              fontScale: scenario.fontScale ?? 1,
            }),
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
        if (dependency.endsWith('domain/constants')) return require('../src/domain/constants');
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
        if (dependency === 'date-fns/locale') return require('date-fns/locale');
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

test('home today items retain separate navigation and loading states', () => {
  const routes: unknown[] = [];
  const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, { routes });
  const buttons = nodes(tree).filter((node) => node.type === 'Pressable');
  assert.equal(buttons.length, 3);
  assert(text(buttons[0]).includes('일기'));
  assert(text(buttons[0]).includes('기록 없음'));
  assert(text(buttons[1]).includes('0/0'));
  buttons.forEach((button) => button.props.onPress());
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), [
    { pathname: '/diary/new', params: { date: '2026-10-05' } },
    '/habit',
    '/sober',
  ]);
  for (const result of [{ isPending: true }, { isError: true }]) {
    const pending = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
      results: { diary: result, habits: result },
    });
    const actions = nodes(pending).filter((node) => node.type === 'Pressable');
    assert.equal(actions[0].props.disabled, true);
    assert.equal(actions[1].props.disabled, undefined);
    if (result.isPending) {
      assert(
        nodes(pending).some((node) => node.props.accessibilityLabel === '오늘의 일기 확인 중'),
      );
      assert(
        nodes(pending).some((node) => node.props.accessibilityLabel === '오늘의 습관 확인 중'),
      );
    } else {
      assert(text(actions[0]).includes('불러오기 실패'));
      assert(actions[1].props.accessibilityLabel.includes('불러오기 실패'));
      assert(text(actions[1]).includes('불러오기 실패'));
    }
  }
});

test('recorded diary shows its actual emotion artwork and opens the diary', () => {
  const routes: unknown[] = [];
  const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
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
  assert.equal(description.props.ellipsizeMode, 'tail');
  nodes(tree)
    .find((node) => node.props.accessibilityLabel?.startsWith('오늘의 일기 이동'))
    .props.onPress();
  assert.deepEqual(routes, ['/diary/42']);
});

test('today habits show completed count before total count', () => {
  const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
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

test('today sober item shows its day count and name, opens details and handles loading or failure', () => {
  const sober = {
    id: 7,
    name: '금연',
    icon_key: 'smoking',
    icon_color: 'theme',
    initial_started_at: '2026-10-01T00:00:00.000Z',
    goal_mode: 'AUTO',
    goal_days: null,
  };
  const routes: unknown[] = [];
  const results = { sobers: { data: [sober] }, restarts: { data: [] } };
  const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
    results,
    routes,
  });
  const card = nodes(tree).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('거리두기 이동'),
  );
  assert(text(card).includes('5일차'));
  assert(!text(card).includes('진행 중'));
  const name = nodes(card).find((node) => node.type === 'Text' && text(node) === '금연');
  assert.equal(name.props.numberOfLines, 1);
  assert.equal(name.props.adjustsFontSizeToFit, true);
  const dayCount = nodes(card).find((node) => node.type === 'Text' && text(node) === '5일차');
  assert(dayCount.props.className.includes('text-2xl'));
  assert.equal(dayCount.props.numberOfLines, 1);
  assert.equal(dayCount.props.adjustsFontSizeToFit, true);
  const colors = require('../src/theme/colors').themeColors('blue', 'light');
  assert.equal(dayCount.props.style.color, colors.accent);
  const mint = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
    results: { ...results, sobers: { data: [{ ...sober, icon_color: 'mint' }] } },
  });
  const mintDayCount = nodes(mint).find((node) => node.type === 'Text' && text(node) === '5일차');
  assert.equal(
    mintDayCount.props.style.color,
    require('../src/domain/constants').HABIT_ICON_COLORS.mint.value,
  );
  for (const [restarted_at, days] of [
    ['2026-10-04T00:00:00.000Z', 2],
    ['2026-10-05T11:00:00.000Z', 1],
  ] as const) {
    const reset = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
      results: { ...results, restarts: { data: [{ id: 1, sober_id: 7, restarted_at }] } },
    });
    assert(text(reset).includes(`${days}일차`));
  }
  card.props.onPress();
  assert.deepEqual(routes, ['/sober/7']);
  for (const state of [{ isPending: true }, { isError: true }]) {
    const next = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
      results: { ...results, restarts: state },
    });
    assert(!text(next).includes('일차'));
    assert(!nodes(next).some((node) => node.type === 'SoberIcon'));
    if (state.isPending) {
      assert(nodes(next).some((node) => node.props.accessibilityLabel === '거리두기 확인 중'));
    } else {
      assert(text(next).includes('불러오기 실패'));
    }
  }
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

test('emotion cards use 35 percent of window width at every supported app text size', () => {
  for (const layoutWidth of [320, 360, 390, 430, 768, 1024]) {
    for (const rem of [14, 15, 16]) {
      const tree = render('EmotionStats', { stats: emptyStats(), year: 2024 }, 0, {
        layoutWidth,
        rem,
      });
      const strip = nodes(tree).find((node) => node.type === 'ScrollView');
      const card = strip.props.children[0];
      assert(
        strip.props.children.every((item: any) => item.props.style.width === layoutWidth * 0.35),
      );
      assert.equal(strip.props.contentContainerStyle.paddingHorizontal, layoutWidth * 0.05);
      assert.equal(strip.props.onLayout, undefined);
      const image = nodes(card).find((node) => node.type === 'EmotionImage');
      assert.equal(image.props.size, rem * 4);
      assert(image.props.size + rem * 1.5 <= card.props.style.width);
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
  const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
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
  assert(text(card).includes('5일차'));
  card.props.onPress();
  assert.deepEqual(routes, ['/sober/8']);
});

test('home shows three fixed items without a card heading, date or horizontal scrolling', () => {
  const tree = render('HomeTodaySection', { today: '2026-10-05' });
  assert(!nodes(tree).some((node) => node.type === 'ScrollView'));
  assert(!text(tree).includes('오늘의 조각'));
  assert(!text(tree).includes('10월 5일'));
  const buttons = nodes(tree).filter((node) => node.type === 'Pressable');
  assert.deepEqual(
    buttons.map((node) => text(node.props.children[0])),
    ['오늘의 일기', '오늘의 습관', '거리두기'],
  );
});

function habitScenario(completed: number, total: number) {
  return {
    habits: {
      data: Array.from({ length: total }, (_, id) => ({
        id,
        priority: 1,
        initial_started_at: '2026-10-01T00:00:00',
      })),
    },
    completions: {
      data: Array.from({ length: completed }, (_, habit_id) => ({ habit_id, date: '2026-10-05' })),
    },
  };
}

test('habit donut shows actual completion, including empty and full rings', () => {
  for (const [completed, total, status] of [
    [0, 0, '습관을 추가해 보세요'],
    [0, 6, '0%'],
    [4, 6, '67%'],
    [6, 6, '완료'],
    [10, 15, '67%'],
    [15, 15, '완료'],
  ] as const) {
    const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
      results: habitScenario(completed, total),
    });
    const card = nodes(tree).find(
      (node) =>
        node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('오늘의 습관 이동'),
    );
    assert(text(card).includes(`${completed}/${total}`));
    const count = nodes(card).find(
      (node) => node.type === 'Text' && text(node) === `${completed}/${total}`,
    );
    assert.equal(count.props.numberOfLines, 1);
    assert.equal(count.props.adjustsFontSizeToFit, true);
    assert(count.props.className.includes('w-10'));
    assert(text(card).includes(status));
    const circles = nodes(card).filter((node) => node.type === 'Circle');
    assert.equal(circles.length, completed ? 2 : 1);
    if (completed) {
      const ring = circles[1].props;
      assert.equal(ring.strokeLinecap, 'round');
      assert(
        Math.abs(ring.strokeDashoffset / ring.strokeDasharray[0] - (1 - completed / total)) <
          0.000001,
      );
    }
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
  const mixed = render('HomeTodaySection', { today: '2026-10-05' }, undefined, { results });
  const card = nodes(mixed).find(
    (node) =>
      node.type === 'Pressable' && node.props.accessibilityLabel?.startsWith('오늘의 습관 이동'),
  );
  assert(text(card).includes('1/2'));
  const free = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
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
  ] as const) {
    const tree = render('HomeTodaySection', { today: '2026-10-05' }, undefined, {
      results: habitScenario(completed, 100),
    });
    const circles = nodes(tree).filter((node) => node.type === 'Circle');
    assert.equal(circles[0].props.stroke, colors.border);
    assert.equal(circles[0].props.strokeOpacity ?? 1, 1);
    if (completed) assert.equal(circles[1].props.stroke, color);
    assert.equal(circles.length, completed === 0 ? 1 : 2);
  }
});
