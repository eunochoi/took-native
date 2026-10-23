import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { HABIT_ICON_OPTIONS } from '../src/domain/constants';
import { SOBER_ICONS } from '../src/domain/sober';
import { HABIT_ICON_CATEGORIES } from '../src/screens/habit/habitIconCategories';
import { SOBER_ICON_CATEGORIES } from '../src/screens/sober/soberIconCategories';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

function picker(kind: 'habit' | 'sober', value: string, colorKey = 'pink') {
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  let closed = 0;
  let deferred: (() => void) | undefined;
  const applied: string[] = [];
  const scrolls: any[] = [];
  const chipScrolls: any[] = [];
  const sizes: number[][] = [];
  const dimensions = { width: 393, height: 900, fontScale: 1 };
  const theme = { rem: 15 };
  const vertical = {
    scrollTo: (position: any) => scrolls.push(JSON.parse(JSON.stringify(position))),
  };
  const horizontal = {
    scrollTo: (position: any) => chipScrolls.push(JSON.parse(JSON.stringify(position))),
  };
  const modules = new Map<string, any>();
  const jsx = (type: any, props: any, key?: string) =>
    typeof type === 'function' ? type(props) : { type, props, key };
  const react = {
    createElement(type: any, props: any, ...children: any[]) {
      return jsx(
        type,
        { ...props, children: children.length === 1 ? children[0] : children },
        props?.key,
      );
    },
    useState(initial: any) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [
        slots[index],
        (next: any) => {
          const result = typeof next === 'function' ? next(slots[index]) : next;
          if (!Object.is(result, slots[index])) {
            slots[index] = result;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial: any) {
      const index = cursor++;
      return slots[index] ?? (slots[index] = { current: initial });
    },
    useEffect(callback: () => void, dependencies: any[]) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((item, i) => !Object.is(item, slots[index][i]))) {
        slots[index] = dependencies;
        effects.push(callback);
      }
    },
  };
  function load(path: string): any {
    if (modules.has(path)) return modules.get(path);
    const exports = {};
    modules.set(path, exports);
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports,
        require(name: string) {
          if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
          if (name === 'react') return react;
          if (name === 'react-native')
            return {
              View: 'View',
              ScrollView: 'ScrollView',
              Pressable: 'Pressable',
              useWindowDimensions: () => dimensions,
            };
          if (name === 'react-native-reanimated')
            return { useAnimatedRef: () => react.useRef(vertical) };
          if (name === 'react-native-safe-area-context')
            return {
              useSafeAreaInsets: () => ({ top: 24, bottom: 30 }),
            };
          if (name.endsWith('AppThemeProvider')) return { useAppTheme: () => theme };
          if (name.endsWith('/constants')) return require('../src/domain/constants');
          if (name.endsWith('/sober')) return { SOBER_ICONS };
          if (name.endsWith('habitIconCategories'))
            return require('../src/screens/habit/habitIconCategories');
          if (name.endsWith('soberIconCategories'))
            return require('../src/screens/sober/soberIconCategories');
          if (name.endsWith('/IconPicker')) return load('src/components/IconPicker.tsx');
          if (name.endsWith('/PickerOption')) return load('src/components/PickerOption.tsx');
          if (name.endsWith('/classes')) return require('../src/theme/classes');
          if (name === 'tailwind-merge') return require(name);
          const component = name.split('/').at(-1)!;
          return { [component]: component };
        },
      },
    );
    return exports;
  }
  const componentName = kind === 'habit' ? 'HabitIconPicker' : 'SoberIconPicker';
  const Component = load(`src/screens/${kind}/${componentName}.tsx`)[componentName];
  let shell: any;
  let scroll: any;
  let footer: any;
  let content: any[];
  function render() {
    do {
      dirty = false;
      cursor = 0;
      shell = Component({
        value,
        colorKey,
        onClose: () => closed++,
        onApply: (key: string) => applied.push(key),
      });
      scroll = shell.props.renderScrollView({
        ref: shell.props.scrollRef,
        onScroll: 'sheet-scroll-handler',
        onLayout: 'sheet-layout-handler',
        onContentSizeChange: (...size: number[]) => sizes.push(size),
      });
      footer = shell.props.footer((action?: () => void) => {
        closed++;
        deferred = action;
      });
      content = nodes([shell.props.fixedContent, scroll, footer]);
      const chipScroll = content.find((node) => node.type === 'ScrollView');
      chipScroll.props.ref.current = horizontal;
      const pending = effects;
      effects = [];
      pending.forEach((callback) => callback());
    } while (dirty);
  }
  render();
  return {
    render,
    applied,
    scrolls,
    chipScrolls,
    sizes,
    dimensions,
    theme,
    get shell() {
      return shell;
    },
    get scroll() {
      return scroll;
    },
    get closed() {
      return closed;
    },
    get chipScroll() {
      return content.find((node) => node.type === 'ScrollView');
    },
    get icons() {
      return nodes(scroll).filter((node) => node.type === 'HabitIcon' || node.type === 'SoberIcon');
    },
    row(key: string) {
      return nodes(scroll).find((node) => node.key === key);
    },
    chipRow(id: string) {
      return content.find((node) => node.key === id);
    },
    option(label: string) {
      return content.find(
        (node) =>
          node.type === 'Pressable' &&
          (node.props.accessibilityLabel === label ||
            node.props.accessibilityLabel.startsWith(`${label}. `)),
      );
    },
    press(label: string) {
      const button = content.find((node) => node.props?.label === label) ?? this.option(label);
      assert(button, label);
      button.props.onPress();
      render();
    },
    finishClose() {
      deferred?.();
      deferred = undefined;
    },
    reopen() {
      slots.length = 0;
      deferred = undefined;
      render();
    },
  };
}

for (const kind of ['habit', 'sober'] as const) {
  const categories = kind === 'habit' ? HABIT_ICON_CATEGORIES : SOBER_ICON_CATEGORIES;
  const defaultKey = kind === 'habit' ? 'goal' : 'favorite';
  const defaultLabel = '기본 1';
  test(`${kind} picker starts in basic with five icons and switches categories with category descriptions`, () => {
    const h = picker(kind, defaultKey);
    assert.equal(h.shell.props.title, kind === 'habit' ? '습관 아이콘' : '거리두기 아이콘');
    assert.equal(h.option(defaultLabel).props.accessibilityState.selected, true);
    assert.equal(h.option('기본 카테고리').props.accessibilityState.selected, true);
    assert.equal(h.icons.length, 5);
    assert.deepEqual(
      nodes(h.shell.props.fixedContent)
        .filter((node) => node.type === 'Text')
        .map((node) => node.props.children),
      [...categories.map(({ label }) => label), categories[0].label, categories[0].description],
    );
    for (const category of categories) {
      h.press(`${category.label} 카테고리`);
      assert.equal(h.option(`${category.label} 카테고리`).props.accessibilityState.selected, true);
      assert.deepEqual(
        h.icons.map((node) => node.props.name),
        [...category.keys],
      );
      assert(h.icons.every((node) => node.props.colorKey === 'pink'));
      if (category.id === 'basic') {
        assert.equal(h.option(defaultLabel).props.accessibilityState.selected, true);
      } else {
        assert.equal(h.option(defaultLabel), undefined);
      }
      for (const key of category.keys) {
        const label =
          key === defaultKey
            ? defaultLabel
            : kind === 'habit'
              ? HABIT_ICON_OPTIONS.find((option) => option.key === key)!.label
              : SOBER_ICONS[key as keyof typeof SOBER_ICONS].label;
        const row = h.option(label);
        assert.equal(row.props.accessibilityLabel, label);
        assert.equal(nodes(row).filter((node) => node.type === 'Text').length, 1);
        assert.equal(h.row(key).props.className, 'aspect-square');
        assert.equal(h.row(key).props.style.width, h.row(category.keys[0]).props.style.width);
        assert(
          nodes(h.shell.props.fixedContent).some(
            (node) => node.props?.children === category.description,
          ),
        );
        assert(!JSON.stringify(row).includes('numberOfLines'));
      }
    }
    assert.equal(h.scroll.props.onScroll, 'sheet-scroll-handler');
    assert.equal(h.scroll.props.onLayout, 'sheet-layout-handler');
  });

  test(`${kind} draft survives navigation and applies only after the shared close callback`, () => {
    const h = picker(kind, defaultKey);
    const key = categories[0].keys[1];
    const label = '기본 2';
    h.press(label);
    assert.equal(h.option(label).props.accessibilityState.selected, true);
    const previousKey = h.scroll.key;
    h.press(`${categories[1].label} 카테고리`);
    assert.notEqual(h.scroll.key, previousKey);
    assert.equal(h.scroll.key, h.shell.props.contentKey);
    h.press(`${categories[0].label} 카테고리`);
    assert.equal(h.option(label).props.accessibilityState.selected, true);
    h.press('선택 완료');
    assert.deepEqual(h.applied, []);
    assert.equal(h.closed, 1);
    h.finishClose();
    assert.deepEqual(h.applied, [key]);
  });

  test(`${kind} cancelling discards the draft and the default icon can also be confirmed`, () => {
    const savedKey = categories[0].keys[1];
    const h = picker(kind, savedKey);
    h.press(defaultLabel);
    assert.equal(h.option(defaultLabel).props.accessibilityState.selected, true);
    h.shell.props.onClose();
    assert.deepEqual(h.applied, []);
    h.reopen();
    assert.equal(h.option(defaultLabel).props.accessibilityState.selected, false);
    assert.equal(h.option('기본 2').props.accessibilityState.selected, true);
    h.press(defaultLabel);
    h.press('선택 완료');
    h.finishClose();
    assert.deepEqual(h.applied, [defaultKey]);
  });

  test(`${kind} every basic icon reopens as selected and confirms its own key`, () => {
    for (const key of categories[0].keys) {
      const h = picker(kind, key);
      assert.equal(h.option('기본 카테고리').props.accessibilityState.selected, true);
      const row = nodes(h.row(key)).find((node) => node.type === 'Pressable');
      assert.equal(row.props.accessibilityState.selected, true);
      h.press('선택 완료');
      h.finishClose();
      assert.deepEqual(h.applied, [key]);
    }
  });
}

test('editing reveals a measured selected row after opening once and preserves the shared content-size callback', () => {
  const h = picker('habit', 'photography');
  assert.equal(h.option('배움과 즐거움 카테고리').props.accessibilityState.selected, true);
  assert.equal(h.option('사진').props.accessibilityState.selected, true);
  h.row('photography').props.onLayout({ nativeEvent: { layout: { y: 617 } } });
  assert.deepEqual(h.scrolls, []);
  h.shell.props.onOpened();
  assert.deepEqual(h.scrolls, [{ y: 602, animated: true }]);
  h.scroll.props.onContentSizeChange(300, 1100);
  assert.deepEqual(h.sizes, [[300, 1100]]);
  assert.equal(h.scrolls.length, 1);
  h.press('작은 돌봄 카테고리');
  h.press('배움과 즐거움 카테고리');
  h.row('photography').props.onLayout({ nativeEvent: { layout: { y: 617 } } });
  assert.equal(h.scrolls.length, 1);
});

test('the saved 19 icon opens in 19+ with smoking and alcohol and keeps its selected key', () => {
  const h = picker('sober', 'age19');
  assert.equal(h.option('19+ 카테고리').props.accessibilityState.selected, true);
  assert.equal(h.option('기타 카테고리'), undefined);
  assert.equal(h.option('술과 담배 카테고리'), undefined);
  assert.deepEqual(
    h.icons.map((node) => node.props.name),
    ['smoking', 'alcohol', 'age19'],
  );
  assert.equal(h.option('19').props.accessibilityLabel, '19');
  h.shell.props.onOpened();
  assert.deepEqual(h.scrolls, []);
  h.row('age19').props.onLayout({ nativeEvent: { layout: { y: 24 } } });
  assert.deepEqual(h.scrolls, [{ y: 9, animated: true }]);
  assert.equal(h.option('19').props.accessibilityState.selected, true);
});

test('category chips reveal the active category even when layout arrives after content size', () => {
  const h = picker('habit', 'photography');
  h.chipScroll.props.onContentSizeChange(650, 48);
  h.chipScroll.props.onLayout({ nativeEvent: { layout: { width: 300 } } });
  h.render();
  h.chipRow('learning').props.onLayout({ nativeEvent: { layout: { x: 500, width: 120 } } });
  h.render();
  assert.deepEqual(h.chipScrolls.at(-1), { x: 410, animated: false });
});

test('short screens and large fonts move top content into the one vertical viewport while keeping the footer fixed', () => {
  const h = picker('habit', 'goal');
  h.shell.props.fixedContent.props.onLayout({ nativeEvent: { layout: { height: 80 } } });
  h.render();
  assert(h.shell.props.fixedContent);
  const fixedKey = h.scroll.key;
  h.dimensions.height = 500;
  h.dimensions.fontScale = 1.5;
  h.theme.rem = 16;
  h.render();
  assert.equal(h.shell.props.fixedContent, undefined);
  assert.notEqual(h.scroll.key, fixedKey);
  assert(nodes(h.scroll).some((node) => node.props?.accessibilityLabel === '기본 1'));
  assert.equal(nodes(h.scroll).filter((node) => node.type === 'AnimatedScrollView').length, 1);
  assert(!nodes(h.scroll).some((node) => node.props?.label === '선택 완료'));
  h.press('선택 완료');
  h.finishClose();
  assert.deepEqual(h.applied, ['goal']);
});

test('grid reduces columns for larger text and accounts for its offset when revealing selection', () => {
  const h = picker('habit', 'photography');
  const originalWidth = h.row('photography').props.style.width;
  h.dimensions.fontScale = 1.5;
  h.render();
  assert(h.row('photography').props.style.width > originalWidth);
  const grid = nodes(h.scroll).find((node) => node.props?.className === 'flex-row flex-wrap gap-3');
  grid.props.onLayout({ nativeEvent: { layout: { y: 180, width: 330 } } });
  h.render();
  h.row('photography').props.onLayout({ nativeEvent: { layout: { y: 320 } } });
  h.shell.props.onOpened();
  assert.deepEqual(h.scrolls.at(-1), { y: 485, animated: true });
});
