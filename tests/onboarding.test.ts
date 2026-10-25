import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function nodes(tree: any, type: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== 'object') return [];
  if (typeof tree.type === 'function') return nodes(tree.type(tree.props), type);
  return [...(String(tree.type) === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
function load(file: string, dependencies: Record<string, unknown>) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      Error,
      require: (name: string) => {
        if (name.endsWith('.png')) return name;
        assert(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}
function harness(values = new Map<string, string>(), platform = 'android') {
  let failRead = false;
  let persist: () => Promise<void> = async () => {};
  let updateSettings: () => Promise<void> = async () => {};
  const writes: string[] = [];
  const slots: any[] = [];
  let cursor = 0;
  let effects: (() => void)[] = [];
  let closes = 0;
  const storage = load('../src/onboarding/storage.ts', {
    'expo-sqlite/kv-store': {
      __esModule: true,
      default: {
        getItemAsync: async (key: string) => {
          if (failRead) throw new Error('read failed');
          return values.get(key) ?? null;
        },
        setItemAsync: async (key: string, value: string) => {
          writes.push(value);
          await persist();
          values.set(key, value);
        },
      },
    },
  });
  const dependencies = {
    react: {
      useState: (initial: any) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [
          slots[i],
          (value: any) => {
            slots[i] = value;
          },
        ];
      },
      useRef: (initial: any) => {
        const i = cursor++;
        return slots[i] ?? (slots[i] = { current: initial });
      },
      useEffect: (fn: () => any, deps: unknown[]) => {
        const i = cursor++;
        if (slots[i]?.deps?.every((value: unknown, index: number) => value === deps[index])) return;
        slots[i]?.cleanup?.();
        slots[i] = { deps };
        effects.push(() => {
          slots[i].cleanup = fn();
        });
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      Platform: { OS: platform },
      Linking: { openURL: async () => {} },
      Pressable: 'Pressable',
      View: 'View',
      ScrollView: 'ScrollView',
      useWindowDimensions: () => ({ height: 800 }),
    },
    'react-native-reanimated': { default: { View: 'View' }, __esModule: true },
    '../../theme/tokens.json': { motion: { fade: 200 } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Sheet' },
    '../../components/Button': { Button: 'Button' },
    '../../components/Text': { Text: 'Text' },
    '../../onboarding/storage': storage,
    '../../settings/SettingsProvider': {
      useSettings: () => ({ settings: {}, updateSettings: () => updateSettings() }),
    },
    '../../theme/AppThemeProvider': { useAppTheme: () => ({ rem: 15 }) },
  };
  const components = load('../src/screens/onboarding/OnboardingSheet.tsx', {
    ...dependencies,
    './WelcomePage': { WelcomePage: 'WelcomePage' },
    './ThemePage': { ThemePage: 'ThemePage' },
    './UsagePage': { UsagePage: 'UsagePage' },
    './CalendarGuidePage': { CalendarGuidePage: 'CalendarGuidePage' },
    // Test sheet behavior independently of the static page markup.
    './WidgetPage': { WidgetPage: 'WidgetPage' },
    './BackupPage': { BackupPage: 'BackupPage' },
  });
  const renderSheet = (firstRun = true) => {
    cursor = 0;
    const sheet = components.OnboardingSheet({
      firstRun,
      onClose: () => {
        closes++;
      },
    });
    const close = () => {
      if (!sheet.props.onBeforeClose()) return false;
      closes++;
      return true;
    };
    const body = sheet.props.renderBody(close);
    const footer = sheet.props.footer(close);
    return { sheet, body, footer, buttons: nodes(footer, 'Button') };
  };
  return {
    values,
    writes,
    storage,
    renderSheet,
    closes: () => closes,
    setPersist: (fn: typeof persist) => {
      persist = fn;
    },
    setUpdateSettings: (fn: typeof updateSettings) => {
      updateSettings = fn;
    },
    failRead: () => {
      failRead = true;
    },
    renderGate: (ready: boolean) => {
      cursor = 0;
      const tree = components.FirstRunOnboarding({ ready });
      const pending = effects;
      effects = [];
      pending.forEach((fn) => fn());
      return tree;
    },
  };
}

async function lastPage(h: ReturnType<typeof harness>, firstRun = true) {
  h.renderSheet(firstRun).body.props.onLayout({ nativeEvent: { layout: { width: 360 } } });
  h.renderSheet(firstRun).body.props.onMomentumScrollEnd({
    nativeEvent: { contentOffset: { x: 1800 } },
  });
  return h.renderSheet(firstRun);
}

test('first-run gate waits for app readiness and shows only if completion is absent', async () => {
  const h = harness();
  assert.equal(h.renderGate(false), null);
  await tick();
  assert.equal(h.renderGate(false), null);
  h.renderGate(true);
  await tick();
  const guide = h.renderGate(true);
  assert.equal(guide.props.firstRun, true);
  const completed = harness();
  completed.values.set('onboardingCompleted', 'true');
  completed.renderGate(true);
  await tick();
  assert.equal(completed.renderGate(true), null);
  const unreadable = harness();
  unreadable.failRead();
  unreadable.renderGate(true);
  await tick();
  assert.equal(unreadable.renderGate(true).props.firstRun, true);
});

test('visiting all pages leaves completion absent and relaunch shows the guide', async () => {
  const h = harness();
  const last = await lastPage(h);
  assert.equal(last.buttons.at(-1).props.label, '포포툭 시작하기');
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
  assert.deepEqual(h.writes, []);
  const relaunch = harness(h.values);
  relaunch.renderGate(true);
  await tick();
  assert.equal(relaunch.renderGate(true).props.firstRun, true);
  assert.equal(
    harness(h.values).renderSheet().body.props.accessibilityLabel,
    '앱 안내, 6단계 중 1단계',
  );
});

test('iOS onboarding includes the calendar guide, omits the Android widget page and completes five steps', async () => {
  const h = harness(new Map(), 'ios');
  const first = h.renderSheet();
  assert.equal(first.body.props.accessibilityLabel, '앱 안내, 5단계 중 1단계');
  assert.equal(nodes(first.body, 'CalendarGuidePage').length, 1);
  assert.equal(nodes(first.body, 'WidgetPage').length, 0);
  first.body.props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  const laidOut = h.renderSheet();
  laidOut.body.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 4 } } });
  const last = h.renderSheet();
  assert.equal(last.body.props.accessibilityLabel, '앱 안내, 5단계 중 5단계');
  await last.buttons.at(-1).props.onPress();
  assert.equal(await h.storage.hasCompletedOnboarding(), true);
  assert.equal(h.closes(), 1);
});

test('completion waits for persistence and repeated taps write only once', async () => {
  const h = harness();
  let resolve!: () => void;
  h.setPersist(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const last = await lastPage(h);
  const saving = last.buttons.at(-1).props.onPress();
  await last.buttons.at(-1).props.onPress();
  assert.equal(h.closes(), 0);
  assert.equal(h.renderSheet().buttons.at(-1).props.disabled, true);
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
  assert.deepEqual(h.writes, ['true']);
  resolve();
  await saving;
  assert.equal(await h.storage.hasCompletedOnboarding(), true);
  assert.equal(h.closes(), 1);
  await last.buttons.at(-1).props.onPress();
  assert.deepEqual(h.writes, ['true']);
});

test('failed completion stays on the last page and can be retried', async () => {
  const h = harness();
  h.setPersist(async () => {
    throw new Error('disk full');
  });
  await (await lastPage(h)).buttons.at(-1).props.onPress();
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
  assert.equal(h.closes(), 0);
  const failed = h.renderSheet();
  assert.equal(failed.body.props.accessibilityLabel, '앱 안내, 6단계 중 6단계');
  assert(nodes(failed.footer, 'Text').some((node) => node.props.accessibilityRole === 'alert'));
  assert.equal(failed.buttons.at(-1).props.disabled, false);
  h.setPersist(async () => {});
  await failed.buttons.at(-1).props.onPress();
  assert.equal(await h.storage.hasCompletedOnboarding(), true);
  assert.equal(h.closes(), 1);
});

test('settings replay can close without setting or clearing completion', async () => {
  const h = harness();
  assert.equal(h.renderSheet(false).sheet.props.dismissible, true);
  assert.equal(h.renderSheet(false).sheet.props.scrollEnabled, true);
  assert.equal(h.renderSheet(false).body.props.horizontal, true);
  assert.equal(h.renderSheet(false).sheet.props.onBeforeClose(), true);
  const last = await lastPage(h, false);
  assert.equal(last.buttons.at(-1).props.label, '닫기');
  await last.buttons.at(-1).props.onPress();
  assert.equal(h.closes(), 1);
  assert.deepEqual(h.writes, []);
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
});

test('first-run onboarding keeps drag dismissal disabled before completion', () => {
  const h = harness();
  const { sheet, body } = h.renderSheet();
  assert.equal(sheet.props.scrollEnabled, false);
  assert.equal(sheet.props.dismissible, false);
  assert.equal(sheet.props.onBeforeClose(), false);
  assert.equal(body.props.scrollEnabled, true);
});

test('footer navigation, dots and swipes stay in sync without completing onboarding', () => {
  const h = harness();
  assert.equal(h.renderSheet().buttons.at(-1).props.disabled, true);
  h.renderSheet().body.props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  const first = h.renderSheet();
  assert.deepEqual(
    first.buttons.map((button) => button.props.label),
    ['다음'],
  );
  first.buttons.at(-1).props.onPress();
  const second = h.renderSheet();
  assert.equal(second.body.props.accessibilityLabel, '앱 안내, 6단계 중 2단계');
  assert.deepEqual(
    second.buttons.map((button) => button.props.label),
    ['이전', '다음'],
  );
  second.buttons[0].props.onPress();
  assert.equal(h.renderSheet().body.props.accessibilityLabel, '앱 안내, 6단계 중 1단계');
  const tabs = nodes(h.renderSheet().footer, 'Pressable');
  tabs[3].props.onPress();
  assert.equal(h.renderSheet().body.props.accessibilityLabel, '앱 안내, 6단계 중 4단계');
  h.renderSheet().body.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 } } });
  const swiped = h.renderSheet();
  assert.equal(nodes(swiped.footer, 'Pressable')[1].props.accessibilityState.selected, true);
  swiped.body.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.equal(h.renderSheet().body.props.accessibilityLabel, '앱 안내, 6단계 중 3단계');
  assert.deepEqual(h.writes, []);
});

test('settings persistence blocks every page navigation path until saving finishes', async () => {
  const h = harness();
  h.renderSheet().body.props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  h.renderSheet().buttons.at(-1).props.onPress();
  const theme = nodes(h.renderSheet().body, 'ThemePage')[0];
  let resolve!: () => void;
  h.setUpdateSettings(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const pending = theme.props.onChange({ fontSize: 'large' });
  const saving = h.renderSheet();
  assert(saving.buttons.every((button) => button.props.disabled));
  assert(nodes(saving.footer, 'Pressable').every((tab) => tab.props.disabled));
  assert.equal(saving.body.props.scrollEnabled, false);
  saving.buttons.at(-1).props.onPress();
  saving.body.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 5 } } });
  saving.body.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  assert.equal(h.renderSheet().body.props.accessibilityLabel, '앱 안내, 6단계 중 2단계');
  resolve();
  await pending;
  const saved = h.renderSheet();
  assert(saved.buttons.every((button) => !button.props.disabled));
  saved.buttons.at(-1).props.onPress();
  assert.equal(h.renderSheet().body.props.accessibilityLabel, '앱 안내, 6단계 중 3단계');
});

test('a failed settings save allows retry and does not complete onboarding', async () => {
  const h = harness();
  h.renderSheet().body.props.onLayout({ nativeEvent: { layout: { width: 390 } } });
  h.renderSheet().buttons.at(-1).props.onPress();
  h.setUpdateSettings(async () => {
    throw new Error('save failed');
  });
  await nodes(h.renderSheet().body, 'ThemePage')[0].props.onChange({ themeMode: 'dark' });
  const failed = h.renderSheet();
  assert(nodes(failed.footer, 'Text').some((node) => node.props.accessibilityRole === 'alert'));
  assert(failed.buttons.every((button) => !button.props.disabled));
  h.setUpdateSettings(async () => {});
  await nodes(failed.body, 'ThemePage')[0].props.onChange({ themeMode: 'dark' });
  assert.equal(
    nodes(h.renderSheet().footer, 'Text').filter((node) => node.props.accessibilityRole === 'alert')
      .length,
    0,
  );
  assert.deepEqual(h.writes, []);
});

test('all pages can scroll vertically and only the active page is exposed to screen readers', () => {
  const h = harness();
  const first = h.renderSheet();
  assert.equal(first.sheet.props.fillContent, true);
  const pages = nodes(first.body, 'ScrollView').filter((node) => !node.props.horizontal);
  assert.equal(pages.length, 6);
  assert(pages.every((page) => page.props.nestedScrollEnabled));
  const hidden = nodes(first.body, 'View').filter(
    (node) => node.props.importantForAccessibility === 'no-hide-descendants',
  );
  assert.equal(hidden.length, 5);
});

function welcomeHarness(reducedMotion = false) {
  let selected: unknown;
  const { WelcomePage } = load('../src/screens/onboarding/WelcomePage.tsx', {
    react: {
      useState(initial: unknown) {
        selected ??= initial;
        return [
          selected,
          (next: unknown) => {
            selected = next;
          },
        ];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Image: 'Image', View: 'View' },
    'react-native-reanimated': { default: { View: 'AnimatedView' }, __esModule: true },
    'react-native-svg': { default: 'Svg', Path: 'Path', __esModule: true },
    '../../components/PickerOption': { PickerOption: 'PickerOption' },
    '../../components/Text': { Text: 'Text' },
    '../../theme/AppThemeProvider': {
      useAppTheme: () => ({
        reducedMotion,
        colors: {
          emotionPositive: '#ffdddd',
          emotionNeutral: '#dddddd',
          emotionNegative: '#ddddff',
        },
      }),
    },
  });
  return () => WelcomePage({ imageWidth: 315 });
}

test('Blue starts neutral and each preview updates its image, description and selection locally', () => {
  const render = welcomeHarness();
  const first = render();
  const options = nodes(first, 'PickerOption');
  assert.equal(options[1].props.selected, true);
  assert.equal(nodes(first, 'Image')[1].props.source, '../../../assets/cats/cat-blue.png');
  assert.equal(nodes(first, 'AnimatedView')[1].props.style.opacity, 1);
  for (const [index, image, description] of [
    [0, 'cat-blue-p.png', '기쁘고 설레는 날엔 분홍빛이 번져.'],
    [2, 'cat-blue-n.png', '마음이 무거운 날엔 푸른빛이 짙어져.'],
    [1, 'cat-blue.png', '특별할 것 없는 날에도 나는 나야.'],
  ] as const) {
    nodes(render(), 'PickerOption')[index].props.onPress();
    const preview = render();
    const layers = nodes(preview, 'AnimatedView');
    assert.equal(layers.filter((layer) => layer.props.style.opacity === 1).length, 1);
    assert.equal(layers[index].props.style.opacity, 1);
    assert.equal(nodes(layers[index], 'Image')[0].props.source, `../../../assets/cats/${image}`);
    assert.equal(nodes(preview, 'PickerOption')[index].props.selected, true);
    assert(nodes(preview, 'Text').some((text) => text.props.children === description));
  }
});

test('Blue preview fades briefly and respects reduced motion', () => {
  for (const reducedMotion of [false, true]) {
    const render = welcomeHarness(reducedMotion);
    nodes(render(), 'PickerOption')[0].props.onPress();
    assert(
      nodes(render(), 'AnimatedView').every(
        (layer) => layer.props.style.transitionDuration === (reducedMotion ? '0ms' : '200ms'),
      ),
    );
  }
});
