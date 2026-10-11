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
        if (name.endsWith('.png')) return { width: 390, height: 100 };
        assert(name in dependencies, `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}
function harness(values = new Map<string, string>()) {
  let failRead = false;
  let persist: () => Promise<void> = async () => {};
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
      Linking: { openURL: async () => {} },
      Pressable: 'Pressable',
      View: 'View',
      ScrollView: 'ScrollView',
      useWindowDimensions: () => ({ height: 800 }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) },
    '../../components/BottomSheetModal': { BottomSheetModal: 'Sheet' },
    '../../components/Text': { Text: 'Text' },
    '../../onboarding/storage': storage,
    '../../settings/SettingsProvider': {
      useSettings: () => ({ settings: {}, updateSettings: async () => {} }),
    },
    '../../theme/AppThemeProvider': { useAppTheme: () => ({ rem: 15 }) },
  };
  const components = load('../src/screens/onboarding/OnboardingSheet.tsx', {
    ...dependencies,
    './WelcomePage': { WelcomePage: 'WelcomePage' },
    './ThemePage': { ThemePage: 'ThemePage' },
    './UsagePage': { UsagePage: 'UsagePage' },
    // Test sheet behavior independently of the static page markup.
    './WidgetPage': { WidgetPage: 'WidgetPage' },
    './BackupPage': {
      BackupPage: (props: any) =>
        jsx('Button', {
          label: props.busy ? '저장 중…' : '확인',
          disabled: props.busy,
          onPress: props.onConfirm,
        }),
    },
  });
  const renderSheet = (firstRun = true) => {
    cursor = 0;
    const sheet = components.OnboardingSheet({
      firstRun,
      onClose: () => {
        closes++;
      },
    });
    const body = sheet.props.renderBody(() => {
      if (!sheet.props.onBeforeClose()) return false;
      closes++;
      return true;
    });
    return { sheet, body, footer: sheet.props.footer, buttons: nodes(body, 'Button') };
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
    nativeEvent: { contentOffset: { x: 1440 } },
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
  assert.equal(last.buttons.at(-1).props.label, '확인');
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
  assert.deepEqual(h.writes, []);
  const relaunch = harness(h.values);
  relaunch.renderGate(true);
  await tick();
  assert.equal(relaunch.renderGate(true).props.firstRun, true);
  assert.equal(
    harness(h.values).renderSheet().body.props.accessibilityLabel,
    '앱 안내, 5단계 중 1단계',
  );
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
  assert.equal(failed.body.props.accessibilityLabel, '앱 안내, 5단계 중 5단계');
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
  assert.equal(h.renderSheet(false).sheet.props.onBeforeClose(), true);
  await (await lastPage(h, false)).buttons.at(-1).props.onPress();
  assert.equal(h.closes(), 1);
  assert.deepEqual(h.writes, []);
  assert.equal(await h.storage.hasCompletedOnboarding(), false);
});
