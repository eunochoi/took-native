import assert from 'node:assert/strict';
import test from 'node:test';
import { moveItem } from '../src/components/sortable/order';

test('reordering shifts intervening items in both directions without mutating the draft', () => {
  const input = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(moveItem(input, 0, 4), ['b', 'c', 'd', 'e', 'a']);
  assert.deepEqual(moveItem(input, 4, 1), ['a', 'e', 'b', 'c', 'd']);
  assert.deepEqual(input, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(moveItem(input, -1, 2), input);
  assert.deepEqual(moveItem(input, 1, 5), input);
});

test('moving through several slots always projects from the original order', () => {
  const original = ['a', 'b', 'c', 'd'];
  const first = moveItem(original, 1, 3);
  const returning = moveItem(original, 1, 0);
  assert.deepEqual(first, ['a', 'c', 'd', 'b']);
  assert.deepEqual(returning, ['b', 'a', 'c', 'd']);
  assert.deepEqual(moveItem(original, 1, 1), original);
});

// Exercise page callbacks without mounting native gesture / SQLite modules.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
function renderer(path: string, states: any[], saved: any[] = []) {
  let cursor = 0;
  const exports: any = {};
  const habits = [1, 2, 3].map((id) => ({ id, name: `habit ${id}` }));
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useState: (initial: any) => {
              const index = cursor++;
              if (states[index] === undefined) states[index] = initial;
              return [
                states[index],
                (next: any) => {
                  states[index] = typeof next === 'function' ? next(states[index]) : next;
                },
              ];
            },
            useCallback: (fn: any) => fn,
            useEffect: () => {},
          };
        if (name === 'react-native-sortables')
          return { __esModule: true, default: { Grid: 'Grid', Handle: 'Handle' } };
        if (name === 'react-native-reanimated')
          return { default: {}, useAnimatedRef: () => ({ current: null }) };
        if (name === 'react-native') return { View: 'View', Pressable: 'Pressable' };
        if (name === '@tanstack/react-query')
          return { useQuery: () => ({ data: habits, isPending: false, isError: false }) };
        if (name === 'expo-router') return { useRouter: () => ({}) };
        if (name === 'expo-router/react-navigation') return { usePreventRemove: () => {} };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ bottom: 0 }) };
        if (name.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ rem: 15, colors: {} }) };
        if (name.endsWith('SettingsProvider'))
          return {
            useSettings: () => ({
              settings: { habitOrder: [] },
              updateSettings: async (value: any) => {
                saved.push(value);
              },
            }),
          };
        if (name.endsWith('/db/habit')) return { sortHabits: (items: any[]) => items };
        if (name.endsWith('/queries')) return { habitQueries: { list: () => ({}) } };
        if (name.endsWith('useScrollFade')) return { useScrollFade: () => ({}) };
        if (name.endsWith('sortable/order')) return { moveItem };
        if (name.endsWith('domain/constants')) return { DIARY_IMAGE_MAX_COUNT: 5 };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  return (name: string, props?: any) => {
    cursor = 0;
    return exports[name](props);
  };
}

test('photo grid keeps add tile outside draggable data and passes the drop order to the form', () => {
  const render = renderer('src/screens/diary/DiaryFormImages.tsx', []);
  const moves: number[][] = [];
  const dragging: boolean[] = [];
  const props = {
    images: [
      { file: 'a', uri: 'a' },
      { file: 'b', uri: 'b' },
    ],
    busy: false,
    onReorder: (from: number, to: number) => moves.push([from, to]),
    onDragging: (value: boolean) => dragging.push(value),
  };
  let tree = render('DiaryFormImages', props);
  const grid = nodes(tree).find((node) => node.type === 'Grid');
  assert.equal(grid.props.data, props.images);
  assert.equal(grid.props.autoScrollDirection, 'horizontal');
  grid.props.onDragStart();
  tree = render('DiaryFormImages', props);
  assert.equal(
    nodes(tree).find((node) => node.props.accessibilityLabel === '사진 추가').props.disabled,
    true,
  );
  grid.props.onDragEnd({ fromIndex: 0, toIndex: 1 });
  assert.deepEqual(moves, [[0, 1]]);
  assert.deepEqual(dragging, [true, false]);
  assert.equal(
    nodes(render('DiaryFormImages', { ...props, busy: true })).find((node) => node.type === 'Grid')
      .props.sortEnabled,
    false,
  );
});

test('habit grid saves the returned ID order and prevents saving during a drag', async () => {
  const saved: any[] = [];
  const render = renderer(
    'app/habit/order.tsx',
    [null, [3, 1, 2], false, false, false, false],
    saved,
  );
  const grid = nodes(render('default')).find((node) => node.type === 'Grid');
  grid.props.onDragStart();
  const saveButton = (tree: any) =>
    nodes(tree).find(
      (node) => node.type === 'FormSubmitButton' && node.props.label === '순서 저장하기',
    );
  assert.equal(saveButton(render('default')).props.disabled, true);
  grid.props.onDragEnd({ data: [{ id: 3 }, { id: 2 }, { id: 1 }] });
  const button = saveButton(render('default'));
  assert.equal(button.props.disabled, false);
  button.props.onPress();
  await Promise.resolve();
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), [{ habitOrder: [3, 2, 1] }]);
});
