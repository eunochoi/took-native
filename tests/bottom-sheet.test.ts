import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import tokens from '../src/theme/tokens.json';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Execute the actual component with deterministic React hooks and preset completion callbacks.
function harness(
  initialVisible = true,
  reducedMotion = false,
  maxHeight?: number,
  options: { scrollFade?: boolean; fixedHeight?: boolean } = {},
) {
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: (() => void)[] = [];
  const frames: (() => void)[] = [];
  let close: (action?: () => void) => boolean;
  let closes = 0;
  let visible = initialVisible;
  let tree: any;
  const depsEqual = (a?: unknown[], b?: unknown[]) =>
    a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const memo = (factory: () => any, deps: unknown[]) => {
    const index = cursor++;
    if (!slots[index] || !depsEqual(slots[index].deps, deps))
      slots[index] = { value: factory(), deps };
    return slots[index].value;
  };
  const effect = (fn: () => any, deps: unknown[]) => {
    const index = cursor++;
    if (!slots[index] || !depsEqual(slots[index].deps, deps)) {
      const previous = slots[index];
      slots[index] = { deps };
      effects.push(() => {
        previous?.cleanup?.();
        slots[index].cleanup = fn();
      });
    }
  };
  const preset = (name: string) => ({
    name,
    duration(value: number) {
      return { ...this, milliseconds: value };
    },
    reduceMotion(value: string) {
      return { ...this, reduced: value };
    },
    withCallback(callback: (finished: boolean) => void) {
      return { ...this, callback };
    },
  });
  const exports: any = {};
  const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/BottomSheetModal.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      requestAnimationFrame: (fn: () => void) => {
        frames.push(fn);
        return frames.length;
      },
      cancelAnimationFrame: () => {},
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useRef: (value: any) => {
              const i = cursor++;
              return slots[i] ?? (slots[i] = { current: value });
            },
            useState: (value: any) => {
              const i = cursor++;
              if (!(i in slots)) slots[i] = value;
              return [
                slots[i],
                (next: any) => {
                  if (!Object.is(slots[i], next)) {
                    slots[i] = next;
                    dirty = true;
                  }
                },
              ];
            },
            useMemo: memo,
            useCallback: (fn: any, deps: unknown[]) => memo(() => fn, deps),
            useEffect: effect,
            useLayoutEffect: effect,
          };
        if (name.endsWith('useScrollFade'))
          return {
            useScrollFade: () => ({
              topVisible: true,
              bottomVisible: true,
              onScroll: () => {},
              onLayout: () => {},
              onContentSizeChange: () => {},
              onScrollOffset: memo(() => () => {}, []),
            }),
          };
        if (name.endsWith('ScrollEdgeFade')) return { ScrollEdgeFade: 'ScrollEdgeFade' };
        if (name.includes('tokens.json')) return { __esModule: true, default: tokens };
        if (name.includes('AppThemeProvider'))
          return {
            useAppTheme: () => ({ colors: {}, rem: 15, reducedMotion, iconSizes: { md: 20 } }),
          };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ top: 24, bottom: 30, left: 0, right: 0 }) };
        if (name === 'react-native')
          return {
            Modal: 'Modal',
            KeyboardAvoidingView: 'KeyboardAvoidingView',
            View: 'View',
            ScrollView: 'ScrollView',
            Pressable: 'Pressable',
            useWindowDimensions: () => ({ height: 800 }),
            Keyboard: { dismiss: () => {}, addListener: () => ({ remove: () => {} }) },
            AccessibilityInfo: { announceForAccessibility: () => {} },
          };
        if (name === 'react-native-reanimated')
          return {
            __esModule: true,
            default: { View: 'AnimatedView' },
            ReduceMotion: { Always: 'always', System: 'system' },
            FadeIn: preset('FadeIn'),
            FadeOut: preset('FadeOut'),
            SlideInDown: preset('SlideInDown'),
            SlideOutDown: preset('SlideOutDown'),
          };
        if (name === 'react-native-worklets')
          return { scheduleOnRN: (fn: any, ...args: any[]) => fn(...args) };
        return {
          ColorView: 'ColorView',
          ColorPressable: 'ColorPressable',
          Text: 'Text',
          AppIcon: 'AppIcon',
        };
      },
    },
  );
  function render() {
    do {
      dirty = false;
      cursor = 0;
      tree = exports.BottomSheetModal({
        visible,
        title: '선택',
        maxHeight,
        ...options,
        onClose: () => {
          closes++;
        },
        children: (fn: typeof close) => {
          close = fn;
          return null;
        },
      });
      const pending = effects;
      effects = [];
      pending.forEach((fn) => fn());
    } while (dirty);
    return tree;
  }
  function find(node: any, predicate: (node: any) => boolean): any {
    if (!node || typeof node !== 'object') return undefined;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat()) {
      const match = find(child, predicate);
      if (match) return match;
    }
  }
  render();
  return {
    render,
    get tree() {
      return tree;
    },
    get closes() {
      return closes;
    },
    setVisible(value: boolean) {
      visible = value;
      render();
    },
    show() {
      tree.props.onShow();
      render();
    },
    close(action?: () => void) {
      return close(action);
    },
    scroll() {
      return find(tree, (node) => node.type === 'ScrollView');
    },
    sheet() {
      return find(tree, (node) => node.props?.entering?.name === 'SlideInDown');
    },
    flushFrames() {
      frames.splice(0).forEach((fn) => fn());
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test('sheet waits for native onShow and keeps its window until exit finishes; actions run once afterward', () => {
  const h = harness();
  assert.equal(h.sheet(), undefined);
  assert.equal(h.tree.props.animationType, 'none');
  h.show();
  const sheet = h.sheet();
  assert.equal(sheet.props.entering.milliseconds, tokens.motion.pickerOpen);
  let actions = 0;
  assert.equal(
    h.close(() => actions++),
    true,
  );
  assert.equal(
    h.close(() => actions++),
    false,
  );
  h.render();
  assert.equal(h.sheet(), undefined);
  assert.equal(h.tree.props.visible, true);
  assert.equal(h.closes, 0);
  sheet.props.exiting.callback(true);
  h.render();
  assert.equal(h.tree.props.visible, false);
  assert.equal(h.closes, 1);
  assert.equal(actions, 0);
  h.flushFrames();
  assert.equal(actions, 1);
  sheet.props.exiting.callback(true);
  h.flushFrames();
  assert.equal(actions, 1);
  h.setVisible(false);
  assert.equal(h.closes, 1);
});

test('rapid reopen ignores the old exit and its deferred action', () => {
  const h = harness();
  h.show();
  const oldSheet = h.sheet();
  let actions = 0;
  h.close(() => actions++);
  h.render();
  h.setVisible(false);
  h.setVisible(true);
  assert.ok(h.sheet());
  oldSheet.props.exiting.callback(true);
  h.render();
  h.flushFrames();
  assert.equal(h.tree.props.visible, true);
  assert.equal(h.closes, 0);
  assert.equal(actions, 0);
});

test('hidden mount does not close; closing before onShow completes without waiting for missing children', () => {
  const h = harness(false);
  assert.equal(h.closes, 0);
  h.setVisible(true);
  h.setVisible(false);
  assert.equal(h.tree.props.visible, false);
  assert.equal(h.closes, 1);
});

test('reduced motion uses presets without motion; interrupted exit never dispatches an action', () => {
  const h = harness(true, true);
  h.show();
  const sheet = h.sheet();
  assert.equal(sheet.props.entering.reduced, 'always');
  assert.equal(sheet.props.exiting.reduced, 'always');
  let actions = 0;
  h.close(() => actions++);
  h.render();
  sheet.props.exiting.callback(false);
  h.render();
  h.flushFrames();
  assert.equal(h.tree.props.visible, false);
  assert.equal(actions, 0);
});

test('unmounted sheet and a reopen before the queued action cannot dispatch stale work', () => {
  const h = harness();
  h.show();
  const sheet = h.sheet();
  let actions = 0;
  h.close(() => actions++);
  h.render();
  sheet.props.exiting.callback(true);
  h.setVisible(false);
  h.setVisible(true);
  h.flushFrames();
  assert.equal(actions, 0);
  const next = harness();
  next.show();
  const nextSheet = next.sheet();
  next.close(() => actions++);
  next.render();
  next.unmount();
  nextSheet.props.exiting.callback(true);
  next.flushFrames();
  assert.equal(next.closes, 0);
  assert.equal(actions, 0);
});

test('an accepted action survives the normal picker unmount caused by onClose', () => {
  const h = harness();
  h.show();
  const sheet = h.sheet();
  let actions = 0;
  h.close(() => actions++);
  h.render();
  sheet.props.exiting.callback(true);
  h.unmount();
  h.flushFrames();
  assert.equal(h.closes, 1);
  assert.equal(actions, 1);
});

test('record sheets can constrain height without changing other picker defaults', () => {
  const defaultSheet = harness();
  const records = harness(true, false, 480);
  defaultSheet.show();
  records.show();
  assert.equal(records.sheet().props.children.props.style.maxHeight, 480);
  assert(defaultSheet.sheet().props.children.props.style.maxHeight > 480);
});

test('sheet delegates keyboard avoidance to its native container without measured padding or forced scrolling', () => {
  const h = harness();
  h.show();
  const viewport = h.tree.props.children;
  const surface = h.sheet().props.children;
  const scroll = h.scroll();
  assert.equal(viewport.type, 'KeyboardAvoidingView');
  assert.equal(viewport.props.behavior, 'padding');
  assert.equal(viewport.props.ref, undefined);
  assert.equal(viewport.props.onLayout, undefined);
  assert.equal(viewport.props.style.paddingBottom, undefined);
  assert(h.sheet().props.className.includes('shrink'));
  assert(surface.props.className.includes('shrink'));
  assert.equal(surface.props.style.paddingBottom, undefined);
  assert.equal(surface.props.style.maxHeight, 800 * 0.85);
  assert.equal(scroll.props.ref, undefined);
  assert.equal(scroll.props.contentContainerStyle.paddingBottom, 60);
  assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(scroll.props.keyboardDismissMode, 'none');
});

test('fixed-height sheets retain their requested height and a shrinking scroll viewport', () => {
  const h = harness(true, false, 720, { fixedHeight: true });
  h.show();
  const surface = h.sheet().props.children;
  assert.equal(surface.props.style.height, 720);
  assert.equal(surface.props.style.maxHeight, 720);
  assert(surface.props.children[1].props.className.includes('flex-1'));
  assert(h.scroll().props.className.includes('flex-1'));
});

test('day info uses automatic height with a bounded viewport and scopes surface fades to that viewport', () => {
  const h = harness(true, false, 480, { scrollFade: true });
  h.show();
  const surface = h.sheet().props.children;
  assert.equal(surface.props.style.height, undefined);
  assert.equal(surface.props.style.maxHeight, 480);
  const body = surface.props.children[1];
  assert(body.props.className.includes('shrink'));
  assert(body.props.className.includes('overflow-hidden'));
  const scroll = h.scroll();
  assert(scroll.props.className.includes('shrink'));
  scroll.props.onLayout({ nativeEvent: { layout: { height: 350 } } });
  scroll.props.onContentSizeChange(300, 128);
  scroll.props.onContentSizeChange(300, 900);
  h.render();
  assert.equal(h.sheet().props.children.props.style.height, undefined);
  assert.equal(h.sheet().props.children.props.style.maxHeight, 480);
  const fades = body.props.children[1].props.children;
  assert.equal(fades.length, 2);
  assert(fades.every((node: any) => node.props.tone === 'surface'));
  assert.equal(fades[1].props.includeBottomInset, false);
  const other = harness();
  other.show();
  assert.equal(other.sheet().props.children.props.style.height, undefined);
  assert.equal(other.sheet().props.children.props.children[1].props.children[1], false);
});
