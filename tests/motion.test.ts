import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import tokens from '../src/theme/tokens.json';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any, key?: string) => ({ type, props, key });
function load(
  file: string,
  reducedMotion: boolean,
  focused = true,
  layoutState: number[] = [],
  geometry = { rem: 15, bottom: 24 },
) {
  let stateIndex = 0;
  const exports: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('theme/classes')) return require('../src/theme/classes');
        if (name === 'react')
          return { useState: (value: unknown) => [layoutState[stateIndex++] ?? value, () => {}] };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native-gesture-handler')
          return { Pressable: (props: any) => jsx('GesturePressable', props) };
        if (name === './ColorTransition')
          return load('../src/components/ColorTransition.tsx', reducedMotion);
        if (name === 'nativewind') return { cssInterop: (component: unknown) => component };
        if (name.includes('tokens.json')) return { __esModule: true, default: tokens };
        if (name.includes('AppThemeProvider'))
          return {
            useAppTheme: () => ({
              reducedMotion,
              rem: geometry.rem,
              iconSizes: { md: 24, lg: 30 },
              tabContentBottom: 100,
              colors: { surface: '#FFFFFF', accentLight: '#F0F7FF' },
            }),
          };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ bottom: geometry.bottom }) };
        if (name === 'react-native-reanimated')
          return {
            __esModule: true,
            default: {
              View: 'AnimatedView',
              Text: 'AnimatedText',
              ScrollView: 'AnimatedScrollView',
              createAnimatedComponent: (component: unknown) => component,
            },
          };
        if (name === 'react-native')
          return {
            KeyboardAvoidingView: 'KeyboardAvoidingView',
            View: 'View',
            useWindowDimensions: () => ({ width: 390, height: 844 }),
            Pressable: 'Pressable',
            ScrollView: 'ScrollView',
            TextInput: 'TextInput',
            Animated: { View: 'NativeAnimatedView' },
            StyleSheet: { absoluteFill: { position: 'absolute' } },
            Image: { resolveAssetSource: () => ({ width: 100, height: 100 }) },
          };
        if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
        if (name === 'expo-router/react-navigation') return { useIsFocused: () => focused };
        if (name === 'date-fns')
          return { format: () => '오늘', parseISO: (value: unknown) => value };
        if (name === 'date-fns/locale') return { ko: {} };
        return {
          Text: 'Text',
          EmotionImage: 'EmotionImage',
          TodayRecordSection: 'TodayRecordSection',
          ColorView: 'ColorView',
        };
      },
    },
  );
  return exports;
}

test('fade visibility preserves hit testing, insets and surface gradient without low-level animation hooks', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  for (const visible of [false, true]) {
    const tree = ScrollEdgeFade({ edge: 'bottom', tone: 'surface', visible });
    assert.equal(tree.props.pointerEvents, 'none');
    assert.equal(tree.props.style.opacity, visible ? 1 : 0);
    assert.equal(tree.props.style.height, 69);
    assert.equal(tree.props.style.transitionProperty, 'opacity');
    assert.equal(tree.props.style.transitionDuration, `${tokens.motion.fade}ms`);
    assert.equal(tree.props.children.type, 'LinearGradient');
    assert.equal(tree.props.children.props.colors[0], '#FFFFFFFF');
  }
});

test('top and bottom fades share a viewport overlay without a native scroll wrapper', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  for (const edge of ['top', 'bottom']) {
    const tree = ScrollEdgeFade({ edge, visible: true });
    assert.equal(tree.props.children.type, 'LinearGradient');
    assert.equal(tree.props.pointerEvents, 'none');
  }
});

test('reduced motion disables fade and the page background transition', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', true);
  assert.equal(
    ScrollEdgeFade({ edge: 'top', visible: true }).props.style.transitionDuration,
    '0ms',
  );
  const { ColorView } = load('../src/components/ColorTransition.tsx', true);
  assert.equal(ColorView({}).props.style[1].transitionDuration, '0ms');
});

test('home focus remounts the greeting and reduced motion retains the resting rotation', () => {
  function emotion(node: any): any {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'AnimatedView') return node;
    for (const child of [node.props?.children].flat()) {
      const result = emotion(child);
      if (result) return result;
    }
  }
  const on = emotion(
    load('../src/screens/home/HomeTopSection.tsx', false, true).HomeTopSection({
      today: '2026-10-05',
    }),
  );
  const off = emotion(
    load('../src/screens/home/HomeTopSection.tsx', false, false).HomeTopSection({
      today: '2026-10-05',
    }),
  );
  const reduced = emotion(
    load('../src/screens/home/HomeTopSection.tsx', true, true).HomeTopSection({
      today: '2026-10-05',
    }),
  );
  assert(on.props.style.animationName);
  assert.equal(on.props.style.animationDuration, `${tokens.motion.greeting}ms`);
  assert.equal(off.props.style.animationName, undefined);
  assert.equal(reduced.props.style.animationName, undefined);
  assert.equal(reduced.props.style.transform[0].rotate, '5deg');
  assert.equal(on.key, 'moving');
  assert.equal(off.key, 'idle');
  assert.equal(reduced.key, 'idle');
});

test('home keeps its decoration in a fixed layout without main scrolling', () => {
  function nodes(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat().flatMap(nodes)];
  }
  for (const available of [1100, 500]) {
    const tree = load('../src/screens/home/HomeTopSection.tsx', false, true, [
      available,
      400,
    ]).HomeTopSection({
      today: '2026-10-05',
    });
    const rendered = nodes(tree);
    assert(rendered.some((node) => node.props.accessibilityLabel === 'hiding-cat'));
    assert.equal(
      rendered.some((node) => node.type === 'ScrollView'),
      false,
    );
    assert.equal(rendered.filter((node) => node.type === 'TodayRecordSection').length, 1);
    assert(tree.props.className.includes('border-b-[1px]'));
    assert.equal(tree.props.style, undefined);
    const cat = rendered.find((node) => node.props.accessibilityLabel === 'hiding-cat');
    assert(cat.props.className.includes('max-h-full'));
    assert(
      rendered.some(
        (node) => node.props.className === 'flex-1 min-h-0 justify-end overflow-hidden',
      ),
    );
  }
});

test('Tailwind cannot reintroduce the NativeWind animation engine', async () => {
  const postcss = require('postcss');
  const tailwind = require('tailwindcss');
  const { cssToReactNativeRuntime } = require('react-native-css-interop/dist/css-to-rn');
  const config = require('../tailwind.config.js');
  const output = await postcss([
    tailwind({
      ...config,
      content: [
        {
          raw: 'bg-theme-surface transition-colors transition-opacity duration-200 ease-in-out animate-spin',
          extension: 'html',
        },
      ],
    }),
  ]).process(readFileSync(new URL('../global.css', import.meta.url), 'utf8'), { from: undefined });
  const compiled = cssToReactNativeRuntime(output.css, { inlineRem: false });
  assert(compiled.rules['bg-theme-surface']);
  assert.equal(compiled.rules['transition-colors'], undefined);
  assert.equal(compiled.rules['transition-opacity'], undefined);
  assert.equal(compiled.rules['animate-spin'], undefined);
});

test('the page background transition preserves native view props and refs', () => {
  const { ColorView } = load('../src/components/ColorTransition.tsx', false);
  const ref = { current: null };
  const style = { flex: 1 };
  const tree = ColorView({ ref, style, pointerEvents: 'none' });
  assert.equal(tree.props.ref, ref);
  assert.equal(tree.props.pointerEvents, 'none');
  assert.equal(tree.props.style[0], style);
  assert.equal(tree.props.style[1].transitionProperty, 'backgroundColor');
});

test('gesture pressable preserves pressed style callbacks, props and refs without color animation', () => {
  const { GesturePressable } = load('../src/components/GesturePressable.tsx', false);
  const ref = {};
  const tree = GesturePressable({
    ref,
    disabled: true,
    style: ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.5 : 1 }),
  });
  assert.equal(tree.props.ref, ref);
  assert.equal(tree.props.disabled, true);
  assert.equal(tree.props.style({ pressed: true }).opacity, 0.5);
  assert.equal(tree.props.style({ pressed: false }).opacity, 1);
});

test('static icon color values do not trigger the Worklets inline shared-value warning', () => {
  const babel = require('@babel/core');
  const source = readFileSync(
    new URL('../src/components/IconColorPicker.tsx', import.meta.url),
    'utf8',
  );
  const { code } = babel.transformSync(source, {
    filename: 'IconColorPicker.tsx',
    configFile: false,
    babelrc: false,
    plugins: [['@babel/plugin-syntax-typescript', { isTSX: true }], 'react-native-worklets/plugin'],
  });
  assert.equal(code.includes('getUseOfValueInStyleWarning'), false);
});
