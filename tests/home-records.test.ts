import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
function harness(path: string, name: string) {
  const exports: Record<string, Function> = {};
  const slots: any[] = [];
  let cursor = 0;
  let queries: any[] = [];
  let parameter = '2026';
  const pushes: unknown[] = [];
  const changes: unknown[] = [];
  const results: Record<string, any> = {};
  const effects: (() => void)[] = [];
  const theme = {
    colors: {},
    iconSizes: {},
    rem: 15,
    navigationBottom: 35,
    navigationHeight: 54.5,
  };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency.endsWith('domain/calendar')) return require('../src/domain/calendar');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            useCallback: (fn: Function) => fn,
            useMemo: (fn: Function) => fn(),
            useRef: (current: unknown) => {
              const index = cursor++;
              return (slots[index] ??= { current });
            },
            useEffect: (fn: () => void, deps: unknown[]) => {
              const index = cursor++;
              if (!slots[index] || deps.some((value, i) => !Object.is(slots[index][i], value))) {
                slots[index] = deps;
                effects.push(fn);
              }
            },
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
          };
        if (dependency.endsWith('/ModalNavigationProvider'))
          return {
            useModalNavigation: () => ({ openModal: (href: unknown) => pushes.push(href) }),
          };
        if (dependency === 'expo-router')
          return {
            useLocalSearchParams: () => ({ year: parameter }),
            useRouter: () => ({
              push: (href: unknown) => pushes.push(href),
              setParams: (params: { year: string }) => {
                changes.push(params);
                parameter = params.year;
              },
            }),
          };
        if (dependency === 'date-fns') return require('date-fns');
        if (dependency === 'date-fns/locale') return require('date-fns/locale');
        if (dependency === 'expo-router/react-navigation') return { useIsFocused: () => true };
        if (dependency === 'react-native-reanimated')
          return { __esModule: true, default: { View: 'AnimatedView' } };
        if (dependency === 'react-native')
          return {
            View: 'View',
            ScrollView: 'ScrollView',
            Image: { resolveAssetSource: () => ({ width: 100, height: 100 }) },
            Pressable: 'Pressable',
            useWindowDimensions: () => ({ height: 900 }),
          };
        if (dependency === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ bottom: 20 }) };
        if (dependency.endsWith('tokens.json')) return require('../src/theme/tokens.json');
        if (dependency === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (dependency.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => theme,
          };
        if (dependency === '@tanstack/react-query')
          return {
            useQuery: (options: any) => {
              queries.push(options);
              return results[options.kind] ?? { data: [], isError: false };
            },
          };
        if (dependency.endsWith('/queries')) {
          const query = (kind: string) => (_db: unknown, year?: number) => ({ kind, year });
          return {
            useToday: () => '2026-10-05',
            statsQueries: { years: query('years'), diary: query('diary'), habit: query('habit') },
            diaryQueries: { month: query('diary') },
            habitQueries: { list: query('habits'), completions: query('completions') },
            soberQueries: { list: query('sobers'), restarts: query('restarts') },
          };
        }
        if (dependency.endsWith('ColorTransition')) return { ColorView: 'ColorView' };
        const component = dependency.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return {
    results,
    pushes,
    changes,
    theme,
    render: (next?: number | string) => {
      cursor = 0;
      queries = [];
      if (next !== undefined) parameter = String(next);
      const tree = exports[name]({
        year: Number(parameter),
        currentYear: 2026,
        onYearChange: (year: number) => {
          parameter = String(year);
          changes.push(year);
        },
      });
      effects.splice(0).forEach((fn) => fn());
      return { tree, nodes: nodes(tree), queries };
    },
  };
}

const records = () => harness('src/screens/home/HomeStatsScreen.tsx', 'HomeStatsScreen');
const sheet = (view: ReturnType<ReturnType<typeof records>['render']>) =>
  view.nodes.find((node) => node.type === 'BottomSheetPage');

test('home retains its greeting and records in one scroll viewport without a local stats modal', () => {
  const view = harness('app/(tabs)/index.tsx', 'default').render();
  assert.equal(view.tree.type, 'ColorView');
  assert(view.tree.props.className.includes('bg-theme-accent-light'));
  assert.equal(view.nodes.filter((node) => node.type === 'TodayRecordSection').length, 1);
  assert.equal(
    view.nodes.find((node) => node.type === 'TodayRecordSection').props.today,
    '2026-10-05',
  );
  assert.equal(view.nodes.filter((node) => node.type === 'ScrollView').length, 1);
  assert(!view.nodes.some((node) => ['HomeStatsScreen', 'HomeRecordsModal'].includes(node.type)));
});

test('home fills a normal window, scrolls short windows and resets when all records fit again', () => {
  const ui = harness('app/(tabs)/index.tsx', 'default');
  const viewport = () => ui.render().nodes.find((node) => node.type === 'ScrollView');
  const scroll = viewport();
  const resets: unknown[] = [];
  scroll.props.ref.current = { scrollTo: (value: unknown) => resets.push(value) };
  scroll.props.onLayout({ nativeEvent: { layout: { height: 800 } } });
  const content = ui.render().nodes.find((node) => node.type === 'View' && node.props.onLayout);
  content.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
  assert.equal(viewport().props.children.props.style.height, 800);
  assert.equal(viewport().props.scrollEnabled, false);
  assert.equal(viewport().props.bounces, false);
  assert.equal(viewport().props.overScrollMode, 'never');
  assert.equal(
    ui.render().nodes.find((node) => node.props.accessibilityLabel === 'hiding-cat').props.style
      .height,
    'auto',
  );
  const beforeShrink = resets.length;
  scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
  assert.equal(viewport().props.scrollEnabled, true);
  assert.equal(viewport().props.children.props.style.height, 604.5);
  assert.equal(resets.length, beforeShrink);
  // A wrapped loading/error message can make the required content taller without resizing the window.
  content.props.onLayout({ nativeEvent: { layout: { height: 560 } } });
  assert.equal(viewport().props.children.props.style.height, 664.5);
  scroll.props.onLayout({ nativeEvent: { layout: { height: 900 } } });
  assert.equal(viewport().props.children.props.style.height, 900);
  assert.equal(viewport().props.scrollEnabled, false);
  assert.equal(viewport().props.ref, scroll.props.ref);
  assert.equal(JSON.stringify(resets.at(-1)), JSON.stringify({ y: 0, animated: false }));
  assert(resets.length > beforeShrink);
});

test('calendar resizing preserves the selected month and uses the current font size for week minimums', () => {
  const ui = harness('app/(tabs)/calendar.tsx', 'default');
  const viewport = () => ui.render().nodes.find((node) => node.type === 'ScrollView');
  const calendar = () => ui.render().nodes.find((node) => node.type === 'DiaryHabitMonthCalendar');
  const scroll = viewport();
  const resets: unknown[] = [];
  scroll.props.ref.current = { scrollTo: (value: unknown) => resets.push(value) };
  scroll.props.onLayout({ nativeEvent: { layout: { height: 800 } } });
  scroll.props.onContentSizeChange(400, 800);
  assert.equal(viewport().props.scrollEnabled, false);
  calendar().props.onMonthChange('2026-09');
  const originalSelected = calendar().props.selected;
  for (const size of [14, 15, 16]) {
    ui.theme.rem = size;
    assert.equal(calendar().props.minimumRowHeight, size * 3.5);
  }
  scroll.props.onLayout({ nativeEvent: { layout: { height: 360 } } });
  scroll.props.onContentSizeChange(600, 680);
  assert.equal(viewport().props.scrollEnabled, true);
  assert.equal(viewport().props.contentContainerStyle.minHeight, 360);
  assert.equal(calendar().props.month, '2026-09');
  assert.equal(calendar().props.selected, originalSelected);
  scroll.props.onLayout({ nativeEvent: { layout: { height: 900 } } });
  scroll.props.onContentSizeChange(400, 900);
  assert.equal(viewport().props.scrollEnabled, false);
  assert.equal(calendar().props.month, '2026-09');
  assert.equal(JSON.stringify(resets.at(-1)), JSON.stringify({ y: 0, animated: false }));
  assert.equal(viewport().props.ref, scroll.props.ref);
});

test('stats use the common route sheet and keep all four analysis sections', () => {
  const view = records().render();
  assert.equal(sheet(view).props.title, '모아보기');
  assert.equal(sheet(view).props.backRoute, '/');
  assert.equal(sheet(view).props.scrollFade, true);
  assert.equal(sheet(view).props.contentKey, 2026);
  assert(view.queries.every((query) => query.enabled !== false));
  for (const component of ['DiaryAnalysis', 'EmotionStats', 'HabitAnalysis', 'SoberAnalysis'])
    assert.equal(view.nodes.filter((node) => node.type === component).length, 1);
  assert(
    !view.nodes.some((node) =>
      ['AnimatedView', 'ScrollView', 'ScrollEdgeFade'].includes(node.type),
    ),
  );
});

test('year route follows URL params and updates the same route instead of pushing another', () => {
  const route = harness('app/home/[year]/stats.tsx', 'default');
  const view = route.render(2024);
  assert.equal(view.tree.type, 'HomeStatsScreen');
  assert.equal(view.tree.props.year, 2024);
  assert.equal(view.tree.props.currentYear, 2026);
  view.tree.props.onYearChange(2023);
  assert.equal((route.changes[0] as any).year, '2023');
  assert.equal(route.render().tree.props.year, 2023);
  assert.equal(route.pushes.length, 0);
  for (const invalid of ['abc', '0', '2101', '2026.5'])
    assert.equal(route.render(invalid).tree.props.year, 2026);
});

test('section failures retry independently and cached records remain visible', () => {
  const ui = records();
  let retries = 0;
  ui.results.habit = { isError: true, refetch: () => retries++ };
  let view = ui.render();
  for (const component of ['DiaryAnalysis', 'EmotionStats', 'SoberAnalysis'])
    assert(view.nodes.some((node) => node.type === component));
  assert(!view.nodes.some((node) => node.type === 'HabitAnalysis'));
  view.nodes
    .find(
      (node) =>
        node.type === 'QueryError' && node.props.retryAccessibilityLabel === '습관 기록 다시 시도',
    )
    .props.onRetry();
  assert.equal(retries, 1);
  ui.results.habit.data = { all: [], top: [], bottom: [] };
  assert(ui.render().nodes.some((node) => node.type === 'HabitAnalysis'));
  ui.results.habit = { isError: false };
  assert(ui.render().nodes.some((node) => node.type === 'HomeStatsSkeleton'));
});

test('year picker closes independently and analysis queries follow the selected URL year', () => {
  const ui = records();
  let view = ui.render();
  const content = sheet(view).props.children;
  assert.equal(content.props.className, 'gap-6');
  assert(nodes(content).some((node) => node.type === 'DiaryAnalysis'));
  const footer = nodes(content).find(
    (node: any) => node.props?.children?.[0]?.props?.children === '다른 연도도 확인해 볼까요?',
  );
  assert.equal(footer.props.children[0].props.children, '다른 연도도 확인해 볼까요?');
  assert.equal(footer.props.children[1].props.children, '연도를 바꿔 다른 해의 기록도 살펴보세요.');
  const yearButton = footer.props.children[2];
  assert.equal(yearButton.props.children[0].props.children, '연도 선택');
  assert.equal(yearButton.props.children[1].props.name, 'arrow-forward');
  yearButton.props.onPress();
  view = ui.render();
  view.nodes.find((node) => node.type === 'HomeYearPicker').props.onClose();
  assert.equal(sheet(ui.render()).props.contentKey, 2026);
  ui.render()
    .nodes.find((node) => node.props.accessibilityLabel === '2026년, 연도 선택')
    .props.onPress();
  ui.render()
    .nodes.find((node) => node.type === 'HomeYearPicker')
    .props.onApply(2024);
  view = ui.render();
  assert.equal(sheet(view).props.contentKey, 2024);
  for (const component of ['DiaryAnalysis', 'EmotionStats', 'HabitAnalysis'])
    assert.equal(view.nodes.find((node) => node.type === component).props.year, 2024);
  const sober = view.nodes.find((node) => node.type === 'SoberAnalysis');
  assert.deepEqual(sober.props.sobers, []);
  assert.deepEqual(sober.props.restarts, []);
  assert.equal(sober.props.onOpen, undefined);
  assert.equal(ui.pushes.length, 0);
  assert.equal(view.queries.find((query) => query.kind === 'diary').year, 2024);
  assert.equal(view.queries.find((query) => query.kind === 'habit').year, 2024);
  assert(!view.nodes.some((node) => node.type === 'HomeYearPicker'));
  assert.equal(sheet(ui.render()).props.contentKey, 2024);
});
