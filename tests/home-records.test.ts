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
  let visible = false;
  let cleanup: (() => void) | undefined;
  const results: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            useCallback: (fn: Function) => fn,
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
        if (dependency === 'expo-router')
          return {
            useFocusEffect: (effect: () => () => void) => {
              cleanup ??= effect();
            },
          };
        if (dependency === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            useWindowDimensions: () => ({ height: 900 }),
          };
        if (dependency === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ bottom: 20 }) };
        if (dependency.endsWith('tokens.json')) return require('../src/theme/tokens.json');
        if (dependency === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (dependency.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => ({
              colors: {},
              iconSizes: {},
              rem: 15,
              navigationBottom: 35,
              navigationHeight: 54.5,
            }),
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
    blur: () => cleanup?.(),
    render: (next = visible) => {
      cursor = 0;
      queries = [];
      visible = next;
      const tree = exports[name]({
        visible,
        today: '2026-10-05',
        onClose: () => {
          visible = false;
        },
      });
      return { tree, nodes: nodes(tree), queries };
    },
  };
}

const records = () => harness('src/screens/home/HomeRecordsModal.tsx', 'HomeRecordsModal');
const sheet = (view: ReturnType<ReturnType<typeof records>['render']>) =>
  view.nodes.find((node) => node.type === 'BottomSheetModal');

test('home keeps the launcher outside the records modal and main content does not scroll', () => {
  const home = harness('app/(tabs)/index.tsx', 'default');
  let view = home.render();
  assert.equal(view.tree.type, 'ColorView');
  assert(view.tree.props.className.includes('bg-theme-surface'));
  assert(view.nodes.some((node) => node.type === 'HomeTopSection'));
  assert(!view.nodes.some((node) => node.type === 'TabBottomSpacer'));
  assert(
    !view.nodes.some((node) =>
      ['ScrollView', 'AnimatedView', 'HomeRecordsPanel'].includes(node.type),
    ),
  );
  const bottom = view.tree.props.children[1];
  assert.equal(bottom.props.style.paddingBottom, 124.5);
  const launcher = nodes(bottom).find((node) => node.props.accessibilityLabel === '모아보기');
  assert.equal(launcher.type, 'Pressable');
  assert.equal(launcher.props.accessibilityLabel, '모아보기');
  assert.equal(launcher.props.children[1].props.name, 'arrow-forward');
  assert.equal(view.tree.props.children[2].type, 'HomeRecordsModal');
  assert.equal(view.tree.props.children[2].props.visible, false);
  assert(!nodes(bottom).some((node) => node.type === 'HomeRecordsModal'));
  launcher.props.onPress();
  view = home.render();
  assert.equal(view.tree.props.children[2].props.visible, true);
  view.tree.props.children[2].props.onClose();
  assert.equal(home.render().tree.props.children[2].props.visible, false);
  nodes(home.render().tree.props.children[1])
    .find((node) => node.props.accessibilityLabel === '모아보기')
    .props.onPress();
  home.blur();
  assert.equal(home.render().tree.props.children[2].props.visible, false);
});

test('records use the common automatic-height sheet and keep all four analysis sections', () => {
  const ui = records();
  let view = ui.render();
  assert(view.queries.every((query) => !query.enabled));
  assert.equal(sheet(view).props.visible, false);
  assert(!view.nodes.some((node) => node.type === 'DiaryAnalysis'));
  view = ui.render(true);
  assert.equal(sheet(view).props.title, '모아보기');
  assert.equal(sheet(view).props.scrollFade, true);
  assert.equal(sheet(view).props.maxHeight, 810);
  assert.equal(sheet(view).props.contentKey, 2026);
  assert(view.queries.every((query) => query.enabled));
  for (const component of ['DiaryAnalysis', 'EmotionStats', 'HabitAnalysis', 'SoberAnalysis'])
    assert.equal(view.nodes.filter((node) => node.type === component).length, 1);
  assert(
    !view.nodes.some((node) =>
      ['AnimatedView', 'ScrollView', 'ScrollEdgeFade'].includes(node.type),
    ),
  );
  sheet(view).props.onClose();
  assert.equal(sheet(ui.render()).props.visible, false);
});

test('section failures retry independently and cached records remain visible', () => {
  const ui = records();
  let retries = 0;
  ui.results.habit = { isError: true, refetch: () => retries++ };
  let view = ui.render(true);
  for (const component of ['DiaryAnalysis', 'EmotionStats', 'SoberAnalysis'])
    assert(view.nodes.some((node) => node.type === component));
  assert(!view.nodes.some((node) => node.type === 'HabitAnalysis'));
  view.nodes
    .find((node) => node.props.accessibilityLabel === '습관 기록 다시 시도')
    .props.onPress();
  assert.equal(retries, 1);
  ui.results.habit.data = { all: [], top: [], bottom: [] };
  assert(ui.render().nodes.some((node) => node.type === 'HabitAnalysis'));
  ui.results.habit = { isError: false };
  assert(ui.render().nodes.some((node) => node.type === 'HomeStatsSkeleton'));
});

test('year picker closes independently and selected year persists when records reopen', () => {
  const ui = records();
  let view = ui.render(true);
  const content = sheet(view).props.children;
  assert.equal(content.props.className, 'gap-6 pt-1 pb-6');
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
  assert.equal(sheet(ui.render()).props.visible, true);
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
  assert.equal(typeof sober.props.onOpen, 'function');
  assert(!view.nodes.some((node) => node.type === 'HomeYearPicker'));
  sheet(view).props.onClose();
  assert.equal(sheet(ui.render(true)).props.contentKey, 2024);
});
