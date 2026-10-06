import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(file: string) {
  const exports: Record<string, Function> = {};
  const slots: any[] = [];
  const offsets: unknown[] = [];
  let cursor = 0;
  let changes = 0;
  const jsx = (type: any, props: any, key?: string): any =>
    typeof type === 'function' ? type(props) : { type, props, key };
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useCallback: (fn: Function) => fn,
            useRef: (initial: unknown) => {
              const index = cursor++;
              slots[index] ??= { current: initial };
              return slots[index];
            },
            useState: (initial: unknown) => {
              const index = cursor++;
              if (!(index in slots)) slots[index] = initial;
              return [
                slots[index],
                (value: any) => {
                  const next = typeof value === 'function' ? value(slots[index]) : value;
                  if (!Object.is(next, slots[index])) changes++;
                  slots[index] = next;
                },
              ];
            },
          };
        if (name === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            Image: 'Image',
            FlatList: 'FlatList',
            useWindowDimensions: () => ({ width: 390 }),
          };
        if (name.endsWith('AppThemeProvider')) return { useAppTheme: () => ({ rem: 15 }) };
        if (name.endsWith('/media')) return { mediaUri: (file: string) => `file:///${file}` };
        if (name === './scrollFade') return require('../src/hooks/scrollFade');
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return {
    render: (name: string, props?: any) => {
      cursor = 0;
      return exports[name](props);
    },
    attachList: () => {
      slots[3].current = { scrollToOffset: (value: unknown) => offsets.push(value) };
    },
    offsets,
    get hookCount() {
      return cursor;
    },
    get changes() {
      return changes;
    },
  };
}

const images = [
  { id: 1, diary_id: 1, file_name: 'one.jpg', position: 0 },
  { id: 2, diary_id: 1, file_name: 'two.jpg', position: 1 },
];

test('one-photo previews open the diary with fixed aspect ratios and no measurement state', () => {
  const view = load('../src/screens/diary/DiaryGallery.tsx');
  let opened = 0;
  for (const square of [false, true]) {
    const tree = view.render('DiaryGallery', {
      images: images.slice(0, 1),
      square,
      onPress: () => opened++,
    });
    assert.equal(tree.type, 'Pressable');
    assert.equal(view.hookCount, 0);
    assert.equal(tree.props.onLayout, undefined);
    assert(tree.props.className.includes(square ? 'aspect-square' : 'aspect-[4/3]'));
    assert.equal(tree.props.children.props.source.uri, 'file:///one.jpg');
    tree.props.onPress();
  }
  assert.equal(opened, 2);
  assert.equal(view.render('DiaryGallery', { images: [] }), null);
});

test('multi-photo paging keeps snapping, page indicators and reset after a width change', () => {
  const view = load('../src/screens/diary/DiaryGallery.tsx');
  const props = { images, square: true };
  let tree = view.render('DiaryGallery', props);
  view.attachList();
  tree.props.onLayout({ nativeEvent: { layout: { width: 120 } } });
  tree = view.render('DiaryGallery', props);
  let list = tree.props.children[0];
  assert.equal(list.props.snapToInterval, 127.5);
  assert.equal(list.props.style.height, 120);
  list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 127.5 } } });
  tree = view.render('DiaryGallery', props);
  assert.equal(tree.props.children[1].props.accessibilityLabel, '사진 2 / 2');
  tree.props.onLayout({ nativeEvent: { layout: { width: 150 } } });
  tree = view.render('DiaryGallery', props);
  list = tree.props.children[0];
  assert.equal(list.props.snapToInterval, 157.5);
  assert.equal(tree.props.children[1].props.accessibilityLabel, '사진 1 / 2');
  assert.equal(view.offsets.length, 2);
});

test('a single detail photo retains crop and full-image toggling', () => {
  const view = load('../src/screens/diary/DiaryGallery.tsx');
  const props = { images: images.slice(0, 1), detail: true };
  let tree = view.render('DiaryGallery', props);
  tree.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
  tree = view.render('DiaryGallery', props);
  let list = tree.props.children[0];
  assert.equal(list.props.style.height, 351);
  let photo = list.props.renderItem({ item: images[0], index: 0 });
  assert.equal(photo.props.children.props.resizeMode, 'cover');
  photo.props.onPress();
  tree = view.render('DiaryGallery', props);
  list = tree.props.children[0];
  photo = list.props.renderItem({ item: images[0], index: 0 });
  assert.equal(photo.props.children.props.resizeMode, 'contain');
  assert.equal(photo.props.accessibilityState.selected, true);
});

test('fade event sequences handle initial size, scrolling, reset and content shrink without duplicate state changes', () => {
  const view = load('../src/hooks/useScrollFade.ts');
  let fade = view.render('useScrollFade');
  const state = () => {
    fade = view.render('useScrollFade');
    return [fade.topVisible, fade.bottomVisible];
  };
  fade.onContentSizeChange(300, 1600);
  assert.deepEqual(state(), [false, false]);
  fade.onLayout({ nativeEvent: { layout: { height: 800 } } });
  assert.deepEqual(state(), [false, true]);
  const changes = view.changes;
  fade.onScrollOffset(0);
  fade.onScrollOffset(3);
  assert.equal(view.changes, changes);
  fade.onScroll({
    nativeEvent: {
      contentOffset: { y: 100 },
      contentSize: { height: 1600 },
      layoutMeasurement: { height: 800 },
    },
  });
  assert.deepEqual(state(), [true, true]);
  fade.onScrollOffset(800);
  assert.deepEqual(state(), [true, false]);
  fade.onScrollOffset(0);
  assert.deepEqual(state(), [false, true]);
  fade.onContentSizeChange(300, 200);
  assert.deepEqual(state(), [false, false]);
});
