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
          return {
            useState: (value: unknown) => [layoutState[stateIndex++] ?? value, () => {}],
            useRef: (current: unknown) => ({ current }),
            useEffect: () => {},
          };
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native-gesture-handler')
          return { Pressable: (props: any) => jsx('GesturePressable', props) };
        if (name === './ColorTransition')
          return load('../src/components/ColorTransition.tsx', reducedMotion);
        if (name === 'nativewind') return { cssInterop: (component: unknown) => component };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name === '@tanstack/react-query') return { useQuery: () => ({ data: null }) };
        if (name.endsWith('domain/diaryFilters')) return require('../src/domain/diaryFilters');
        if (name.endsWith('/queries'))
          return { useToday: () => '2026-10-05', diaryQueries: { byDate: () => ({}) } };
        if (name.includes('tokens.json')) return { __esModule: true, default: tokens };
        if (name.includes('AppThemeProvider'))
          return {
            useAppTheme: () => ({
              reducedMotion,
              rem: geometry.rem,
              iconSizes: { md: 24, lg: 30 },
              tabContentBottom: 100,
              navigationBottom: 24,
              navigationHeight: 64,
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
        if (name === 'expo-router') return { useRouter: () => ({ push: () => {} }) };
        if (name.endsWith('/ModalNavigationProvider'))
          return { useModalNavigation: () => ({ openModal: () => {} }) };
        if (name === 'expo-router/react-navigation') return { useIsFocused: () => focused };
        return {
          Text: 'Text',
          Wordmark: 'Wordmark',
          EmotionImage: 'EmotionImage',
          HomeTodaySection: 'HomeTodaySection',
          HomeGreeting: 'HomeGreeting',
          HomeAnalysisCard: 'HomeAnalysisCard',
          ColorView: 'ColorView',
        };
      },
    },
  );
  return exports;
}

test('fade visibility animates the gradient while retaining the bottom surface and safe area', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  for (const visible of [false, true]) {
    const tree = ScrollEdgeFade({ edge: 'bottom', visible });
    const [fade, surface] = tree.props.children;
    assert.equal(tree.props.pointerEvents, 'none');
    assert.equal(tree.props.style.height, 102);
    assert.equal(fade.props.style.height, 30);
    assert.equal(fade.props.style.opacity, visible ? 1 : 0);
    assert.equal(fade.props.style.transitionProperty, 'opacity');
    assert.equal(fade.props.style.transitionDuration, `${tokens.motion.scrollFade}ms`);
    assert.equal(fade.props.children.type, 'LinearGradient');
    assert.equal(fade.props.children.props.colors[0], '#FFFFFF');
    assert.equal(surface.props.style.height, 72);
    assert.match(surface.props.className, /bg-theme-surface/);
  }
});

test('top and bottom fades share a viewport overlay without a native scroll wrapper', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  for (const edge of ['top', 'bottom']) {
    const tree = ScrollEdgeFade({ edge, visible: true });
    assert.equal(tree.props.children[0].props.children.type, 'LinearGradient');
    assert.equal(tree.props.pointerEvents, 'none');
  }
});

test('reduced motion disables fade and the page background transition', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', true);
  assert.equal(
    ScrollEdgeFade({ edge: 'top', visible: true }).props.children[0].props.style.transitionDuration,
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
  const on = emotion(load('../src/screens/home/HomeGreeting.tsx', false, true).HomeGreeting());
  const off = emotion(load('../src/screens/home/HomeGreeting.tsx', false, false).HomeGreeting());
  const reduced = emotion(load('../src/screens/home/HomeGreeting.tsx', true, true).HomeGreeting());
  assert(on.props.style.animationName);
  assert.equal(on.props.style.animationDuration, `${tokens.motion.greeting}ms`);
  assert.equal(off.props.style.animationName, undefined);
  assert.equal(reduced.props.style.animationName, undefined);
  assert.equal(reduced.props.style.transform[0].rotate, '5deg');
  assert.equal(on.key, 'moving');
  assert.equal(off.key, 'idle');
  assert.equal(reduced.key, 'idle');
});

test('home retains its decoration within the page scroll viewport', () => {
  function nodes(node: any): any[] {
    if (!node || typeof node !== 'object') return [];
    return [node, ...[node.props?.children].flat().flatMap(nodes)];
  }
  const tree = load('../app/(tabs)/index.tsx', false, true).default();
  const rendered = nodes(tree);
  assert(rendered.some((node) => node.props.accessibilityLabel === 'hiding-cat'));
  assert.equal(rendered.filter((node) => node.type === 'ScrollView').length, 1);
  assert.equal(rendered.filter((node) => node.type === 'HomeTodaySection').length, 1);
  assert(!tree.props.className.includes('border-b'));
  assert.equal(tree.props.style, undefined);
  const cat = rendered.find((node) => node.props.accessibilityLabel === 'hiding-cat');
  assert(cat.props.className.includes('max-h-full'));
  assert(
    rendered.some(
      (node) => node.props.className === 'flex-1 min-h-0 justify-end overflow-hidden px-[5%]',
    ),
  );
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

test('edge gradients match their surface at the opaque end and reach full transparency', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  for (const edge of ['top', 'bottom']) {
    const tree = ScrollEdgeFade({ edge, visible: true });
    assert.match(tree.props.className, new RegExp(`${edge}-0`));
    const gradient = tree.props.children[0].props.children;
    const colors = gradient.props.colors;
    const locations = gradient.props.locations;
    assert.equal(colors[0], '#FFFFFF');
    assert.equal(colors.at(-1), '#FFFFFF00');
    assert.equal(colors.length, locations.length);
    assert.equal(locations[0], 0);
    assert.equal(locations.at(-1), 1);
    const alphas = colors.map((color: string) =>
      color.length === 7 ? 255 : parseInt(color.slice(-2), 16),
    );
    assert(Math.abs(alphas[locations.indexOf(0.5)] / 255 - 0.5) < 1 / 255);
    for (let index = 1; index < colors.length; index++) {
      assert(locations[index] > locations[index - 1]);
      assert(alphas[index] <= alphas[index - 1]);
    }
    assert.equal(gradient.props.start.y, edge === 'top' ? 0 : 1);
    assert.equal(gradient.props.end.y, edge === 'top' ? 1 : 0);
    assert.equal(tree.props.children[1] !== false, edge === 'bottom');
  }
});

test('page titles use content height and merged padding at every app font size', () => {
  for (const rem of [14, 15, 16]) {
    const { PageTopSection } = load('../src/components/PageTopSection.tsx', false, true, [], {
      rem,
      bottom: 24,
    });
    const onLayout = () => {};
    const header = PageTopSection({
      title: '일기 목록',
      hashtags: '#감정',
      onLayout,
    });
    assert.match(header.props.className, /pt-8 pb-1 px-\[5%\]/);
    assert.doesNotMatch(header.props.className, /\bh-auto\b|\bh-\[/);
    assert.equal(header.props.onLayout, onLayout);
    const content = header.props.children;
    assert.match(header.props.className, /gap-1 items-start/);
    assert.equal(content.length, 2);
    assert.equal(content[0].type, 'Text');
    assert.equal(content[1].type, 'Text');
    assert.equal(content[0].props.children, '#감정');
    assert.equal(content[1].props.children, '일기 목록');
    assert.equal(content[1].props.accessibilityRole, 'header');
    const plain = PageTopSection({ title: '앱 설정', hashtags: '#맞춤' });
    assert.equal(plain.props.style, undefined);
    assert.equal(plain.props.className, header.props.className);
  }
});

test('sticky toolbar overlaps its always-visible h-8 gradient by one pixel', () => {
  for (const reducedMotion of [false, true]) {
    const { Toolbar } = load('../src/components/Toolbar.tsx', reducedMotion);
    const toolbar = Toolbar({ children: 'buttons' });
    const [surface, gradient] = toolbar.props.children;
    assert.match(surface.props.className, /bg-theme-surface/);
    assert.equal(surface.props.children.props.children, 'buttons');
    assert.equal(gradient.type, 'LinearGradient');
    assert.match(gradient.props.className, /h-8/);
    assert(gradient.props.className.split(' ').includes('-mt-px'));
    assert.equal(gradient.props.colors[0], '#FFFFFF');
    assert.equal(gradient.props.colors.at(-1), '#FFFFFF00');
    assert.equal(gradient.props.colors.length, gradient.props.locations.length);
    assert.equal(gradient.props.start.y, 0);
    assert.equal(gradient.props.end.y, 1);
    assert.equal(gradient.props.pointerEvents, 'none');
    for (const node of [toolbar, surface, gradient]) {
      assert(!node.props.className.includes('absolute'));
      assert.equal(node.props.style, undefined);
      assert.equal(node.props.visible, undefined);
    }
  }
});

test('viewport fades stay inside their edges', () => {
  const { ScrollEdgeFade } = load('../src/components/ScrollEdgeFade.tsx', false);
  const top = ScrollEdgeFade({ edge: 'top', visible: true });
  const bottom = ScrollEdgeFade({ edge: 'bottom', visible: true });
  assert.match(top.props.className, /top-0/);
  assert.match(bottom.props.className, /bottom-0/);
  for (const fade of [top, bottom]) {
    assert.equal(fade.props.pointerEvents, 'none');
  }
});
