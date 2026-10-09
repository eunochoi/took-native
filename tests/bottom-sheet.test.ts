import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import tokens from '../src/theme/tokens.json';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Execute the actual component and motion hook with controlled gesture events and animation completion.
function harness(
  initialVisible = true,
  reducedMotion = false,
  maxHeight?: number,
  options: {
    scrollFade?: boolean;
    fixedHeight?: boolean;
    presentation?: 'modal' | 'screen';
    dismissOnBack?: boolean;
    onBeforeClose?: () => boolean;
    onOpening?: () => void;
    onOpened?: () => void;
    scrollEnabled?: boolean;
    footer?: unknown;
  } = {},
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
  let hardwareBack: (() => boolean) | undefined;
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
  const animations: any[] = [];
  const scrollCommands: number[] = [];
  function shared(initial: any) {
    const index = cursor++;
    if (slots[index]) return slots[index];
    let value = initial;
    const cell: any = {
      animation: undefined,
      get value() {
        return value;
      },
      set value(next: any) {
        if (next?.kind) {
          const animation = { ...next, cell, from: value };
          cell.animation = animation;
          animations.push(animation);
        } else {
          cell.animation = undefined;
          value = next;
        }
      },
    };
    return (slots[index] = cell);
  }
  const animate = (kind: string) => (target: number, config: any, callback?: Function) => ({
    kind,
    target,
    config,
    callback,
  });
  const complete = (animation: any, finished = true) => {
    if (animation.cell.animation === animation) {
      animation.cell.animation = undefined;
      if (finished) animation.cell.value = animation.target;
    }
    animation.callback?.(finished);
  };
  const preset = (name: string) => ({
    name,
    duration(milliseconds: number) {
      return { ...this, milliseconds };
    },
    reduceMotion(reduced: string) {
      return { ...this, reduced };
    },
    withCallback(callback: Function) {
      return { ...this, callback };
    },
  });
  const gesture = (kind: string) => {
    const instance: any = { kind, handlers: {}, config: {} };
    for (const name of [
      'onTouchesDown',
      'onTouchesMove',
      'onTouchesUp',
      'onStart',
      'onUpdate',
      'onEnd',
      'onFinalize',
    ])
      instance[name] = (fn: Function) => {
        instance.handlers[name] = fn;
        return instance;
      };
    for (const name of [
      'enabled',
      'manualActivation',
      'maxPointers',
      'shouldCancelWhenOutside',
      'requireExternalGestureToFail',
    ])
      instance[name] = (value: any) => {
        instance.config[name] = value;
        return instance;
      };
    return instance;
  };
  const exports: any = {};
  const jsx = (type: unknown, props: any, key?: string) =>
    typeof type === 'function' ? type(props) : { type, props, key };
  const sheetModules: Record<string, any> = {};
  const context: any = {
    exports,
    requestAnimationFrame: (fn: () => void) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame: () => {},
    require: (name: string) => {
      const sheetModule = sheetModules[name.split('/').at(-1)!];
      if (sheetModule) return sheetModule;
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
          BackHandler: {
            addEventListener: (_name: string, callback: () => boolean) => {
              hardwareBack = callback;
              return {
                remove: () => {
                  hardwareBack = undefined;
                },
              };
            },
          },
        };
      if (name === 'react-native-gesture-handler')
        return {
          GestureDetector: 'GestureDetector',
          GestureHandlerRootView: 'GestureHandlerRootView',
          Gesture: { Pan: () => gesture('pan'), Native: () => gesture('native') },
        };
      if (name.endsWith('AnimatedScrollView')) return { AnimatedScrollView: 'ScrollView' };
      if (name.endsWith('useBottomSheetMotion')) return hookExports;
      if (name === 'react-native-reanimated')
        return {
          __esModule: true,
          default: { View: 'AnimatedView' },
          ReduceMotion: { Always: 'always', System: 'system' },
          FadeIn: preset('FadeIn'),
          SlideInDown: preset('SlideInDown'),
          useSharedValue: shared,
          useAnimatedRef: () => memo(() => ({}), []),
          useAnimatedStyle: (fn: Function) => ({ current: fn }),
          useAnimatedScrollHandler: (handlers: any) => handlers.onScroll,
          scrollTo: (_ref: any, _x: number, y: number) => scrollCommands.push(y),
          cancelAnimation: (cell: any) => {
            cell.animation = undefined;
          },
          withTiming: animate('timing'),
          withSpring: animate('spring'),
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
  };
  const hookExports: any = {};
  const compile = (path: string) =>
    ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
  runInNewContext(compile('../src/hooks/useBottomSheetMotion.ts'), {
    ...context,
    exports: hookExports,
  });
  for (const path of [
    '../src/hooks/useBottomSheetLifecycle.ts',
    '../src/components/BottomSheetHeader.tsx',
    '../src/components/BottomSheetScrollViewport.tsx',
  ]) {
    const moduleExports = {};
    runInNewContext(compile(path), { ...context, exports: moduleExports });
    sheetModules[
      path
        .split('/')
        .at(-1)!
        .replace(/\.tsx?$/, '')
    ] = moduleExports;
  }
  runInNewContext(compile('../src/components/BottomSheetModal.tsx'), context);
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
  let gestureState = 'began';
  const pan = () => find(tree, (node) => node.props?.gesture?.kind === 'pan').props.gesture;
  const manager = {
    activate: () => {
      gestureState = 'active';
      pan().handlers.onStart();
    },
    fail: () => {
      gestureState = 'failed';
      pan().handlers.onFinalize();
    },
  };
  const touchEvent = (x: number, y: number) => ({
    numberOfTouches: 1,
    allTouches: [{ absoluteX: x, absoluteY: y }],
  });
  render();
  return {
    render,
    back() {
      return hardwareBack?.();
    },
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
    layout(value = 400) {
      this.sheet().props.children.props.onLayout({ nativeEvent: { layout: { height: value } } });
    },
    completeOpen() {
      this.layout();
      this.completeAnimation();
      this.completeEnter();
    },
    completeEnter() {
      this.sheet().props.entering.callback(true);
    },
    latestAnimation() {
      return animations.at(-1);
    },
    completeAnimation(finished = true) {
      complete(animations.at(-1), finished);
      render();
    },
    complete,
    offset(y: number) {
      this.scroll().props.onScroll({ contentOffset: { y } });
    },
    begin(x = 0, y = 0) {
      gestureState = 'began';
      pan().handlers.onTouchesDown(touchEvent(x, y), manager);
    },
    move(x: number, y: number) {
      if (gestureState === 'failed') return;
      pan().handlers.onTouchesMove(touchEvent(x, y), manager);
      if (gestureState === 'active') pan().handlers.onUpdate({ absoluteX: x, absoluteY: y });
    },
    end(success = true) {
      if (gestureState === 'failed') return;
      pan().handlers.onTouchesUp({}, manager);
      if (gestureState === 'active') pan().handlers.onEnd({}, success);
      pan().handlers.onFinalize();
      render();
    },
    get gestureState() {
      return gestureState;
    },
    get scrollCommands() {
      return scrollCommands;
    },
    get pan() {
      return pan();
    },
    get native() {
      return find(tree, (node) => node.props?.gesture?.kind === 'native').props.gesture;
    },
    get y() {
      return this.sheet().props.style.current().transform[0].translateY;
    },
    close(action?: () => void) {
      return close(action);
    },
    scroll() {
      return find(tree, (node) => node.type === 'ScrollView');
    },
    sheet() {
      return find(tree, (node) => node.key?.startsWith('sheet-'));
    },
    flushFrames() {
      frames.splice(0).forEach((fn) => fn());
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test('sheet waits for onShow, retains its body through close, and dispatches accepted work exactly once', () => {
  const h = harness();
  assert.equal(h.sheet(), undefined);
  assert.equal(h.tree.props.animationType, 'none');
  h.show();
  h.layout();
  assert.equal(h.sheet().props.entering.milliseconds, tokens.motion.pickerOpen);
  h.completeEnter();
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
  assert.ok(h.sheet());
  assert.equal(h.sheet().props.pointerEvents, 'none');
  assert.equal(h.latestAnimation().config.duration, tokens.motion.pickerClose);
  const exit = h.latestAnimation();
  assert.equal(h.tree.props.visible, true);
  assert.equal(h.closes, 0);
  h.completeAnimation();
  assert.equal(h.tree.props.visible, false);
  assert.equal(h.closes, 1);
  assert.equal(actions, 0);
  h.flushFrames();
  assert.equal(actions, 1);
  h.complete(exit);
  h.flushFrames();
  assert.equal(actions, 1);
  h.setVisible(false);
  assert.equal(h.closes, 1);
});

test('rapid reopen ignores the previous close and its deferred action', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  let actions = 0;
  h.close(() => actions++);
  const oldExit = h.latestAnimation();
  h.setVisible(false);
  h.setVisible(true);
  assert.ok(h.sheet());
  h.complete(oldExit);
  h.render();
  h.flushFrames();
  assert.equal(h.tree.props.visible, true);
  assert.equal(h.closes, 0);
  assert.equal(actions, 0);
});

test('hidden mount does not close; closing before onShow needs no missing animation', () => {
  const h = harness(false);
  assert.equal(h.closes, 0);
  h.setVisible(true);
  h.setVisible(false);
  assert.equal(h.tree.props.visible, false);
  assert.equal(h.closes, 1);
});

test('reduced motion applies to open and close; interrupted close never dispatches an action', () => {
  const h = harness(true, true);
  h.show();
  h.layout();
  assert.equal(h.sheet().props.entering.reduced, 'always');
  h.completeEnter();
  let actions = 0;
  h.close(() => actions++);
  assert.equal(h.latestAnimation().config.reduceMotion, 'always');
  h.completeAnimation(false);
  h.flushFrames();
  assert.equal(h.tree.props.visible, false);
  assert.equal(actions, 0);
});

test('unmount and reopen prevent stale close work from running', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  let actions = 0;
  h.close(() => actions++);
  h.completeAnimation();
  h.setVisible(false);
  h.setVisible(true);
  h.flushFrames();
  assert.equal(actions, 0);
  const next = harness();
  next.show();
  next.completeOpen();
  next.close(() => actions++);
  next.unmount();
  next.completeAnimation();
  next.flushFrames();
  assert.equal(next.closes, 0);
  assert.equal(actions, 0);
});

test('accepted work survives the normal picker unmount caused by onClose', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  let actions = 0;
  h.close(() => actions++);
  h.completeAnimation();
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
  const viewport = h.tree.props.children.props.children;
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
  assert.ok(scroll.props.ref);
  assert.equal(scroll.props.contentContainerStyle.paddingBottom, 75);
  assert.equal(scroll.props.contentContainerClassName, 'gap-6 pt-6 pb-12');
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

test('a touch begun below the top stays a scroll even when it reaches zero; the next touch can drag', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  h.offset(120);
  h.begin();
  assert.equal(h.gestureState, 'failed');
  h.offset(0);
  h.move(0, 160);
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
  h.end();
  h.begin();
  h.move(0, 60);
  assert.equal(h.gestureState, 'active');
  assert.equal(h.y, 60);
  assert.deepEqual(h.scrollCommands, [0]);
  assert.equal(h.native.config.requireExternalGestureToFail, h.pan);
  assert.equal(h.scroll().props.bounces, false);
  assert.equal(h.scroll().props.overScrollMode, 'never');
  h.end();
  assert.equal(h.latestAnimation().kind, 'spring');
  h.completeAnimation();
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
});

test('upward and horizontal touches remain scrolls; a stationary tap never becomes a sheet drag', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  h.begin();
  h.move(0, -20);
  assert.equal(h.gestureState, 'failed');
  h.begin();
  h.move(30, 10);
  assert.equal(h.gestureState, 'failed');
  h.begin();
  h.move(2, 3);
  assert.equal(h.gestureState, 'began');
  h.end();
  assert.equal(h.gestureState, 'failed');
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
  assert.deepEqual(h.scrollCommands, []);
});

test('release distance decides dismissal; passing the line and dragging back restores the sheet', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  h.begin();
  h.move(0, 140);
  h.move(0, 60);
  h.end();
  assert.equal(h.latestAnimation().kind, 'spring');
  h.completeAnimation();
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
  h.begin();
  h.move(0, 100); // 25 percent of the measured 400-point sheet.
  h.end();
  assert.equal(h.latestAnimation().kind, 'timing');
  assert.equal(h.latestAnimation().from, 100);
  assert(h.latestAnimation().target >= 400);
  assert.equal(h.closes, 0);
  assert.equal(h.sheet().props.pointerEvents, 'none');
  let applied = 0;
  assert.equal(
    h.close(() => applied++),
    false,
  );
  h.completeAnimation();
  h.flushFrames();
  assert.equal(h.tree.props.visible, false);
  assert.equal(h.closes, 1);
  assert.equal(applied, 0);
});

test('OS cancellation past the threshold restores instead of dismissing', () => {
  const h = harness(true, true);
  h.show();
  h.completeOpen();
  h.begin();
  h.move(0, 160);
  h.end(false);
  assert.equal(h.latestAnimation().kind, 'spring');
  assert.equal(h.latestAnimation().config.reduceMotion, 'always');
  h.completeAnimation();
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
});

test('short sheets use their actual height rather than the maximum allowed height', () => {
  const h = harness(true, false, 720);
  h.show();
  h.layout(200);
  h.completeEnter();
  h.begin();
  h.move(0, 55);
  h.end();
  assert.equal(h.latestAnimation().kind, 'timing');
  h.completeAnimation();
  assert.equal(h.closes, 1);
});

test('Android back while a touch is undecided cannot interrupt the accepted close', () => {
  const h = harness();
  h.show();
  h.completeOpen();
  h.begin();
  h.tree.props.onRequestClose();
  h.move(0, 140);
  assert.equal(h.gestureState, 'failed');
  assert.equal(h.latestAnimation().kind, 'timing');
  h.completeAnimation();
  assert.equal(h.closes, 1);
  assert.equal(h.tree.props.visible, false);
});

test('opening never waits for a sheet layout event and closing has a safe unmeasured distance', () => {
  const h = harness();
  h.show();
  assert.ok(h.sheet());
  assert.equal(h.sheet().props.entering.name, 'SlideInDown');
  assert.equal(h.y, 0);
  // The backdrop fades through one shared opacity without waiting for sheet measurement.
  const viewport = h.tree.props.children.props.children;
  assert.equal(viewport.props.children[0].props.entering, undefined);
  assert.equal(viewport.props.children[0].props.style.current().opacity, 0);
  assert.equal(h.latestAnimation().target, 1);
  h.completeAnimation();
  assert.equal(viewport.props.children[0].props.style.current().opacity, 1);
  h.completeEnter();
  assert.equal(h.close(), true);
  assert(h.latestAnimation().target >= 800);
  h.completeAnimation();
  assert.equal(h.closes, 1);
});

test('route sheets mount without a Modal onShow and keep one touch owned by the scroll viewport', () => {
  const h = harness(true, false, 720, { presentation: 'screen', fixedHeight: true });
  assert.equal(h.tree.type, 'GestureHandlerRootView');
  assert.ok(h.sheet());
  h.completeOpen();
  h.offset(120);
  h.begin();
  h.offset(0);
  h.move(0, 150);
  h.end();
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
  h.begin();
  h.move(0, 150);
  h.end();
  assert.equal(h.closes, 0);
  h.completeAnimation();
  assert.equal(h.closes, 1);
  assert.equal(h.tree, null);
});

test('route sheet Android back waits for its close animation and inactive routes do not handle back', () => {
  const h = harness(true, false, 720, { presentation: 'screen' });
  h.completeOpen();
  assert.equal(h.back(), true);
  assert.equal(h.closes, 0);
  h.completeAnimation();
  assert.equal(h.closes, 1);
  const inactive = harness(true, false, 720, { presentation: 'screen', dismissOnBack: false });
  assert.equal(inactive.back(), undefined);
});

test('busy route dismissal restores the sheet instead of hiding the guarded page', () => {
  let busy = true;
  let blocked = 0;
  const h = harness(true, false, 720, {
    presentation: 'screen',
    onBeforeClose: () => {
      if (!busy) return true;
      blocked++;
      return false;
    },
  });
  h.completeOpen();
  h.begin();
  h.move(0, 150);
  h.end();
  assert.equal(blocked, 1);
  assert.equal(h.latestAnimation().kind, 'spring');
  h.completeAnimation();
  assert.equal(h.y, 0);
  assert.equal(h.closes, 0);
  assert.ok(h.sheet());
  busy = false;
  assert.equal(h.back(), true);
  h.completeAnimation();
  assert.equal(h.closes, 1);
});

test('form drag lock disables the sheet pan and the footer stays outside the scroll viewport', () => {
  const h = harness(true, false, 720, {
    presentation: 'screen',
    scrollEnabled: false,
    footer: 'save',
  });
  assert.equal(h.pan.config.enabled, false);
  assert.equal(h.scroll().props.scrollEnabled, false);
  const footer = h.sheet().props.children.props.children.at(-1);
  assert.equal(footer.props.children, 'save');
  assert.equal(footer.props.style.paddingBottom, 45);
  assert.equal(footer.props.className, 'pb-4');
  assert.equal(h.scroll().props.contentContainerStyle, undefined);
  assert.equal(h.scroll().props.contentContainerClassName, 'gap-6 pt-6 pb-12');
});

test('footer actions use the shared close lifecycle and dispatch once after dismissal', () => {
  let applied = 0;
  const h = harness(true, false, 720, {
    footer: (close: (action: () => void) => boolean) => ({
      onPress: () => close(() => applied++),
    }),
  });
  h.show();
  h.completeOpen();
  const action = h.sheet().props.children.props.children.at(-1).props.children;
  assert.equal(action.onPress(), true);
  assert.equal(action.onPress(), false);
  assert.equal(applied, 0);
  h.completeAnimation();
  h.flushFrames();
  assert.equal(h.closes, 1);
  assert.equal(applied, 1);
});

test('saved route sheet remains mounted until the controlled closing animation completes', () => {
  const h = harness(true, false, 720, { presentation: 'screen' });
  h.completeOpen();
  h.setVisible(false);
  assert.equal(h.closes, 0);
  assert.ok(h.sheet());
  h.completeAnimation();
  assert.equal(h.closes, 1);
  assert.equal(h.tree, null);
});

test('route opening callbacks follow the sheet entry rather than backdrop completion', () => {
  const events: string[] = [];
  const h = harness(true, false, 720, {
    presentation: 'screen',
    onOpening: () => events.push('opening'),
    onOpened: () => events.push('opened'),
  });
  assert.deepEqual(events, ['opening']);
  h.completeAnimation();
  assert.deepEqual(events, ['opening']);
  h.completeEnter();
  h.completeEnter();
  assert.deepEqual(events, ['opening', 'opened']);
});

test('cancelled entry releases its transition and stale entry cannot release a new session', () => {
  let opened = 0;
  const h = harness(true, false, 720, {
    presentation: 'screen',
    onOpened: () => opened++,
  });
  const oldEntry = h.sheet().props.entering.callback;
  oldEntry(false);
  assert.equal(opened, 1);
  h.setVisible(false);
  h.completeAnimation();
  h.setVisible(true);
  oldEntry(true);
  assert.equal(opened, 1);
  h.completeEnter();
  assert.equal(opened, 2);
});

test('blocked dismissal during entry preserves the opening callback and subsequent close', () => {
  let opening = true;
  const h = harness(true, false, 720, {
    presentation: 'screen',
    onBeforeClose: () => !opening,
    onOpened: () => {
      opening = false;
    },
  });
  h.back();
  assert.equal(h.closes, 0);
  h.completeEnter();
  assert.equal(opening, false);
  h.back();
  h.completeAnimation();
  assert.equal(h.closes, 1);
});

test('controlled dismissal requested during entry retries after the opening lock releases', () => {
  let opening = true;
  const h = harness(true, false, 720, {
    presentation: 'screen',
    onBeforeClose: () => !opening,
    onOpened: () => {
      opening = false;
    },
  });
  h.setVisible(false);
  assert.equal(h.closes, 0);
  h.completeEnter();
  h.completeAnimation();
  assert.equal(h.closes, 1);
});
