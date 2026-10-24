import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { EMOTIONS } from '../src/domain/constants';
import { DIARY_EMOTION_GROUPS } from '../src/domain/diaryFilters';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

function picker(value: number | null, allowDeselect = false) {
  const state: any[] = [];
  const refs: any[] = [];
  let cursor = 0;
  let refCursor = 0;
  let closed = 0;
  let deferred: (() => void) | undefined;
  const applied: (number | null)[] = [];
  const scrolls: any[] = [];
  const sizes: number[][] = [];
  const dimensions = { width: 393, height: 900, fontScale: 1 };
  const theme = { rem: 15 };
  const exports: any = {};
  const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
  const useRef = (initial: any) => {
    const index = refCursor++;
    return (refs[index] ??= { current: initial });
  };
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/screens/diary/DiaryEmotionPicker.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            createElement(type: unknown, props: any, ...children: any[]) {
              return jsx(
                type,
                { ...props, children: children.length === 1 ? children[0] : children },
                props?.key,
              );
            },
            useRef,
            useState: (initial: any) => {
              const index = cursor++;
              if (!(index in state))
                state[index] = typeof initial === 'function' ? initial() : initial;
              return [
                state[index],
                (next: any) => {
                  state[index] = next;
                },
              ];
            },
          };
        if (name === 'react-native') return { View: 'View', useWindowDimensions: () => dimensions };
        if (name === 'react-native-reanimated')
          return {
            useAnimatedRef: () => useRef({ scrollTo: (position: any) => scrolls.push(position) }),
          };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ top: 24, bottom: 30 }) };
        if (name.endsWith('/AppThemeProvider')) return { useAppTheme: () => theme };
        if (name.endsWith('/constants')) return { EMOTIONS };
        if (name.endsWith('/diaryFilters')) return { DIARY_EMOTION_GROUPS };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  function render() {
    cursor = 0;
    refCursor = 0;
    const shell = exports.DiaryEmotionPicker({
      value,
      allowDeselect,
      onClose: () => {
        closed++;
      },
      onApply: (next: number | null) => applied.push(next),
    });
    const scroll = shell.props.renderScrollView({
      onContentSizeChange: (width: number, height: number) => sizes.push([width, height]),
    });
    const footer = shell.props.footer((after?: () => void) => {
      closed++;
      deferred = after;
    });
    const content = nodes([shell.props.fixedContent, scroll, footer]);
    return { shell, scroll, footer, content };
  }
  return {
    render,
    dimensions,
    theme,
    applied,
    scrolls,
    sizes,
    get closed() {
      return closed;
    },
    option(label: string) {
      const option = render().content.find((node) => node.props.accessibilityLabel === label);
      assert(option, `missing choice ${label}`);
      return option;
    },
    emotion(id: number) {
      return this.option(`${EMOTIONS[id].name}, ${EMOTIONS[id].description}`);
    },
    press(label: string) {
      this.option(label).props.onPress();
    },
    confirm() {
      const { footer } = render();
      assert(!footer.props.disabled);
      footer.props.onPress();
    },
    finishClose() {
      deferred?.();
      deferred = undefined;
    },
  };
}

test('new diary starts in positive with readable cards and requires a selection', () => {
  const ui = picker(null);
  assert.equal(ui.option('긍정 카테고리').props.selected, true);
  assert.equal(ui.render().footer.props.disabled, true);
  assert.deepEqual(
    ui
      .render()
      .content.filter((node) => node.type === 'PickerOption')
      .slice(0, 3)
      .map((node) => node.props.accessibilityLabel),
    ['긍정 카테고리', '중립 카테고리', '부정 카테고리'],
  );
  for (const id of [0, 1, 2, 3]) {
    const card = ui.emotion(id);
    assert.equal(card.props.selected, false);
    assert(nodes(card).some((node) => node.type === 'EmotionImage' && node.props.emotion === id));
    assert(nodes(card).some((node) => node.props.children === EMOTIONS[id].name));
    assert(
      nodes(card).some(
        (node) =>
          node.props.children === EMOTIONS[id].description &&
          node.props.numberOfLines === undefined,
      ),
    );
  }
  assert.equal(ui.render().scroll.props.children[1].props.children.length, 2);
  ui.press('중립 카테고리');
  assert.equal(ui.render().footer.props.disabled, true);
  assert.equal(ui.emotion(4).props.selected, false);
  assert.equal(ui.emotion(9).props.selected, false);
});

test('every existing emotion reopens in its category and confirms its original stored number', () => {
  const groups = [
    ['positive', '긍정'],
    ['negative', '부정'],
    ['neutral', '중립'],
  ] as const;
  const covered: number[] = [];
  for (const [group, label] of groups) {
    for (const id of DIARY_EMOTION_GROUPS[group].emotions) {
      const ui = picker(id);
      covered.push(id);
      assert.equal(ui.option(`${label} 카테고리`).props.selected, true);
      assert.equal(ui.emotion(id).props.selected, true);
      ui.confirm();
      assert.equal(ui.closed, 1);
      assert.deepEqual(ui.applied, []);
      ui.finishClose();
      assert.deepEqual(ui.applied, [id]);
    }
  }
  assert.deepEqual(
    covered.sort((a, b) => a - b),
    EMOTIONS.map((_, id) => id),
  );
});

test('switching categories preserves a draft and cancelling never applies it', () => {
  const ui = picker(0);
  ui.press('부정 카테고리');
  ui.emotion(7).props.onPress();
  ui.press('중립 카테고리');
  ui.press('부정 카테고리');
  assert.equal(ui.emotion(7).props.selected, true);
  ui.press('긍정 카테고리');
  assert.equal(ui.emotion(0).props.selected, false);
  ui.confirm();
  ui.finishClose();
  assert.deepEqual(ui.applied, [7]);

  const cancel = picker(4);
  cancel.emotion(9).props.onPress();
  cancel.render().shell.props.onClose();
  assert.deepEqual(cancel.applied, []);
  assert.equal(picker(4).emotion(4).props.selected, true);
});

test('normal selection stays selected on a second tap while optional deselection applies null', () => {
  const required = picker(9);
  required.emotion(9).props.onPress();
  assert.equal(required.emotion(9).props.selected, true);
  assert.equal(required.render().footer.props.disabled, false);
  const optional = picker(9, true);
  optional.emotion(9).props.onPress();
  assert.equal(optional.emotion(9).props.selected, false);
  assert.equal(optional.render().footer.props.label, '적용하기');
  optional.confirm();
  optional.finishClose();
  assert.deepEqual(optional.applied, [null]);
});

test('narrow screens and large fonts use one column and keep the footer outside the scroll area', () => {
  const ui = picker(3);
  const initialIconSize = nodes(ui.emotion(3)).find((node) => node.type === 'EmotionImage').props
    .size;
  const top = ui.render().shell.props.fixedContent;
  top.props.onLayout({ nativeEvent: { layout: { height: 180 } } });
  assert(ui.render().shell.props.fixedContent);
  const originalKey = ui.render().scroll.key;
  ui.dimensions.height = 500;
  ui.dimensions.fontScale = 1.5;
  ui.theme.rem = 16;
  let view = ui.render();
  assert.equal(view.shell.props.fixedContent, undefined);
  assert.notEqual(view.scroll.key, originalKey);
  assert.equal(view.scroll.props.children[1].props.children.length, 4);
  assert(!nodes(view.scroll).some((node) => node.type === 'Button'));
  assert.equal(ui.emotion(3).props.selected, true);
  assert.equal(
    nodes(ui.emotion(3)).find((node) => node.type === 'EmotionImage').props.size,
    (initialIconSize * 16) / 15,
  );
  ui.dimensions.fontScale = 1;
  view.scroll.props.children[1].props.onLayout({ nativeEvent: { layout: { y: 180, width: 240 } } });
  view = ui.render();
  assert.equal(view.scroll.props.children[1].props.children.length, 4);
  ui.confirm();
  ui.finishClose();
  assert.deepEqual(ui.applied, [3]);
});

test('editing reveals the initial row after opening and category changes reset the viewport', () => {
  const ui = picker(3);
  let view = ui.render();
  const grid = view.scroll.props.children[1];
  grid.props.onLayout({ nativeEvent: { layout: { y: 20, width: 333 } } });
  grid.props.children[1].props.onLayout({ nativeEvent: { layout: { y: 200 } } });
  assert.equal(ui.scrolls.length, 0);
  view.shell.props.onOpened();
  assert.equal(ui.scrolls.length, 1);
  assert.equal(ui.scrolls[0].y, 205);
  view.scroll.props.onContentSizeChange(333, 600);
  assert.deepEqual(ui.sizes, [[333, 600]]);
  assert.equal(ui.scrolls.length, 1);
  const oldKey = view.scroll.key;
  ui.press('중립 카테고리');
  view = ui.render();
  assert.notEqual(view.scroll.key, oldKey);
  assert.equal(view.scroll.key, view.shell.props.contentKey);
  ui.press('긍정 카테고리');
  view = ui.render();
  view.scroll.props.children[1].props.children[1].props.onLayout({
    nativeEvent: { layout: { y: 200 } },
  });
  assert.equal(ui.scrolls.length, 1);
});
