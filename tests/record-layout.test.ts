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

test('form sheets retain footer, overlays and the dismissal guard while locking image drag scrolling', () => {
  const guard = () => false;
  const closed = () => {};
  const titleAction = { onPress: () => {}, accessibilityLabel: '일기 날짜 선택' };
  const { RecordFormLayout } = load('../src/components/RecordFormLayout.tsx', {
    './BottomSheetPage': { BottomSheetPage: 'BottomSheetPage' },
  });
  const tree = RecordFormLayout({
    title: '일기 작성',
    titleAction,
    backRoute: '/diary',
    onBeforeClose: guard,
    closeRequested: true,
    onClosed: closed,
    footer: 'save',
    overlays: 'picker',
    children: 'fields',
    scrollEnabled: false,
  });
  const [sheet, overlays] = tree.props.children;
  assert.equal(sheet.type, 'BottomSheetPage');
  assert.equal(sheet.props.title, '일기 작성');
  assert.equal(sheet.props.titleAction, titleAction);
  assert.equal(sheet.props.backRoute, '/diary');
  assert.equal(sheet.props.onBeforeClose, guard);
  assert.equal(sheet.props.closeRequested, true);
  assert.equal(sheet.props.onClosed, closed);
  assert.equal(sheet.props.footer, 'save');
  assert.equal(sheet.props.scrollEnabled, false);
  assert.equal(sheet.props.children.props.children, 'fields');
  assert.equal(overlays, 'picker');
});

test('route sheet closing uses history or the fallback and only focused routes intercept Android back', () => {
  const calls: string[] = [];
  let hasHistory = true;
  let focused = true;
  const { BottomSheetPage } = load('../src/components/BottomSheetPage.tsx', {
    react: { useRef: (current: unknown) => ({ current }), useLayoutEffect: () => {} },
    '../navigation/ModalNavigationProvider': {
      useModalTransition: () => ({
        beginOpening: () => 1,
        beginClosing: () => 2,
        finishTransition: () => {},
      }),
    },
    './BottomSheetModal': { BottomSheetModal: 'BottomSheetModal' },
    'expo-router': {
      useRouter: () => ({
        canGoBack: () => hasHistory,
        back: () => calls.push('back'),
        replace: (route: string) => calls.push(route),
      }),
    },
    'expo-router/react-navigation': {
      useIsFocused: () => focused,
      useRoute: () => ({ key: 'sheet' }),
      useNavigationState: (select: Function) =>
        select({ routes: [{ key: 'sheet', name: 'habit/[id]/index' }] }),
    },
    'react-native': { View: 'View', useWindowDimensions: () => ({ height: 800 }) },
  });
  const page = BottomSheetPage({ title: '습관', backRoute: '/habit', children: 'body' }).props
    .children;
  assert.equal(page.props.presentation, 'screen');
  assert.equal(page.props.dismissOnBack, true);
  assert.equal(page.props.fixedHeight, true);
  assert.equal(page.props.children, 'body');
  assert.deepEqual(calls, []);
  page.props.onClose();
  hasHistory = false;
  page.props.onClose();
  assert.deepEqual(calls, ['back', '/habit']);
  focused = false;
  assert.equal(BottomSheetPage({ backRoute: '/habit' }).props.children.props.dismissOnBack, false);
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

test('diary photo picker guards dismissal and scrolling while preparing or dragging photos', () => {
  const { DiaryImagesPicker } = load('../src/screens/diary/DiaryImagesPicker.tsx', {
    '../../components/BottomSheetModal': { BottomSheetModal: 'BottomSheetModal' },
    '../../components/Button': { Button: 'Button' },
    '../../components/Text': { Text: 'Text' },
    '../../domain/limits': { DIARY_IMAGE_MAX_COUNT: 5 },
    './DiaryFormImages': { DiaryFormImages: 'DiaryFormImages' },
  });
  for (const busy of [true, false]) {
    for (const dragging of [true, false]) {
      const onRemove = () => {};
      const onReorder = () => {};
      const tree = DiaryImagesPicker({ images: [], busy, dragging, onRemove, onReorder });
      assert.equal(tree.props.onBeforeClose(), !busy && !dragging);
      assert.equal(tree.props.scrollEnabled, !dragging);
      assert.equal(tree.props.footer(() => {}).props.disabled, busy || dragging);
      const images = tree.props.children.props.children[2];
      assert.equal(images.props.onRemove, onRemove);
      assert.equal(images.props.onReorder, onReorder);
    }
  }
});

test('optional sheet title action opens its picker and blocks presses while disabled', () => {
  const { BottomSheetHeader } = load('../src/components/BottomSheetHeader.tsx');
  const nodes = (tree: any): any[] =>
    Array.isArray(tree)
      ? tree.flatMap(nodes)
      : tree && typeof tree === 'object'
        ? [tree, ...nodes(tree.props?.children)]
        : [];
  let opened = 0;
  const titleAction = {
    onPress: () => opened++,
    accessibilityLabel: '일기 날짜 선택',
    disabled: false,
  };
  const render = () => nodes(BottomSheetHeader({ title: '2026. 10. 14.', titleAction }));
  render()
    .find((node) => node.props.accessibilityLabel === '일기 날짜 선택')
    .props.onPress();
  assert.equal(opened, 1);
  titleAction.disabled = true;
  const button = render().find((node) => node.props.accessibilityLabel === '일기 날짜 선택');
  assert.equal(button.props.disabled, true);
  button.props.onPress();
  assert.equal(opened, 1);
  assert(
    !nodes(BottomSheetHeader({ title: '일기 수정' })).some(
      (node) => node.props.accessibilityRole === 'button',
    ),
  );
});
