import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function load(file: string, modules: Record<string, any> = {}) {
  const exports: Record<string, any> = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name in modules) return modules[name];
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native')
          return {
            View: 'View',
            ScrollView: 'ScrollView',
            Pressable: 'Pressable',
            KeyboardAvoidingView: 'KeyboardAvoidingView',
            Image: 'Image',
          };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ top: 32, bottom: 24 }) };
        if (name.includes('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: { accent: '#00F' }, iconSizes: { md: 24 } }) };
        if (name === './ColorTransition')
          return { ColorView: 'ColorView', ColorKeyboardAvoidingView: 'ColorKeyboardAvoidingView' };
        if (name === './Text') return { Text: 'Text' };
        if (name === './AppIcon') return { AppIcon: 'AppIcon' };
        if (name === './ScrollEdgeFade') return { ScrollEdgeFade: 'ScrollEdgeFade' };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  return exports;
}

test('form layout delegates keyboard avoidance to the native container and preserves fade events / drag lock', () => {
  const events: unknown[] = [];
  const fade = {
    topVisible: true,
    bottomVisible: false,
    onScroll: () => events.push('scroll'),
    onLayout: (event: unknown) => events.push(['fade-layout', event]),
    onContentSizeChange: (width: number, height: number) =>
      events.push(['fade-size', width, height]),
  };
  const { RecordFormLayout } = load('../src/components/RecordFormLayout.tsx', {
    '../hooks/useScrollFade': { useScrollFade: () => fade },
  });
  const tree = RecordFormLayout({
    header: 'header',
    footer: 'save',
    overlays: 'picker',
    children: 'fields',
    scrollEnabled: false,
  });
  const [header, viewport, footer, overlays] = tree.props.children;
  const [scroll, top, bottom] = viewport.props.children;
  assert.equal(header, 'header');
  assert.equal(overlays, 'picker');
  assert.equal(tree.type, 'KeyboardAvoidingView');
  assert.equal(tree.props.behavior, 'padding');
  assert.equal(viewport.props.ref, undefined);
  assert.equal(scroll.props.ref, undefined);
  assert.equal(scroll.props.scrollEnabled, false);
  assert.equal(scroll.props.contentContainerStyle, undefined);
  assert.equal(scroll.props.children, 'fields');
  assert.equal(footer.props.children, 'save');
  assert.equal(footer.props.style.paddingBottom, 24);
  assert.equal(top.props.visible, true);
  assert.equal(bottom.props.visible, false);
  assert.equal(bottom.props.includeBottomInset, false);
  const event = { nativeEvent: { layout: { height: 200 } } };
  scroll.props.onLayout(event);
  scroll.props.onContentSizeChange(300, 800);
  scroll.props.onScroll();
  assert.deepEqual(events, [['fade-layout', event], ['fade-size', 300, 800], 'scroll']);
});

test('form layout enables scrolling by default and retains native keyboard dismissal', () => {
  let updates = 0;
  const { RecordFormLayout } = load('../src/components/RecordFormLayout.tsx', {
    '../hooks/useScrollFade': {
      useScrollFade: () => ({
        onLayout: () => updates++,
        onContentSizeChange: () => updates++,
        onScroll: () => {},
      }),
    },
  });
  const tree = RecordFormLayout({});
  assert.equal(tree.type, 'KeyboardAvoidingView');
  const scroll = tree.props.children[1].props.children[0];
  assert.equal(scroll.props.scrollEnabled, true);
  assert.equal(scroll.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(scroll.props.keyboardDismissMode, 'none');
  scroll.props.onLayout({});
  scroll.props.onContentSizeChange(300, 200);
  assert.equal(updates, 2);
});

test('shared header respects custom back guards, history and per-screen fallback routes', () => {
  const calls: string[] = [];
  let hasHistory = false;
  const { RecordHeader } = load('../src/components/RecordHeader.tsx', {
    'expo-router': {
      useRouter: () => ({
        canGoBack: () => hasHistory,
        back: () => calls.push('back'),
        replace: (route: string) => calls.push(route),
      }),
    },
  });
  for (const route of ['/diary', '/habit', '/sober', '/']) {
    const header = RecordHeader({ title: '제목', backRoute: route });
    header.props.children[0].props.onPress();
  }
  assert.deepEqual(calls, ['/diary', '/habit', '/sober', '/']);
  hasHistory = true;
  RecordHeader({ title: '제목' }).props.children[0].props.onPress();
  RecordHeader({
    title: '제목',
    onBack: () => calls.push('guard'),
  }).props.children[0].props.onPress();
  assert.deepEqual(calls.slice(-2), ['back', 'guard']);
});
