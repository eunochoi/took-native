import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function harness() {
  const slots: any[] = [];
  let cursor = 0;
  const effects: (() => void)[] = [];
  let choose: () => Promise<string[] | null> = async () => ['cache/a.zip'];
  let restore: () => Promise<void> = async () => {};
  let reload: () => Promise<void> = async () => {};
  let cancel: () => Promise<void> = async () => {};
  let update: () => Promise<void> = async () => {};
  const events: string[] = [];
  const discarded: string[][] = [];
  const exports: any = {};
  const onScroll = () => {};
  const names = [
    'ColorScrollView',
    'TabBottomSpacer',
    'AlertModal',
    'ConfirmModal',
    'ScrollEdgeFade',
    'Text',
    'BackupDestinationPicker',
    'AppearanceSettingsSection',
    'BackupSection',
    'EmotionIconStyleSelector',
    'SettingsTopSection',
  ];
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../app/(tabs)/setting.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/widgets/sober'))
          return { refreshSoberWidgets: () => events.push('widget') };
        if (name === 'tailwind-merge') return require('tailwind-merge');
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
                  slots[i] = next;
                },
              ];
            },
            useEffect: (fn: any) => {
              const i = cursor++;
              if (!(i in slots)) {
                slots[i] = {};
                effects.push(() => {
                  slots[i].cleanup = fn();
                });
              }
            },
          };
        if (name.endsWith('/backup'))
          return {
            chooseBackup: () => choose(),
            discardBackupSelection: (uris: string[]) => discarded.push(uris),
            restoreBackup: async (_db: any, _uris: string[]) => {
              events.push('restore');
              await restore();
            },
            exportBackup: () => {},
          };
        if (name.includes('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, rem: 15, iconSizes: {} }) };
        if (name === '@tanstack/react-query')
          return {
            useQueryClient: () => ({
              cancelQueries: async () => {
                events.push('cancel');
                await cancel();
              },
              resetQueries: async () => {
                events.push('reset');
              },
            }),
          };
        if (name.endsWith('/ModalNavigationProvider'))
          return { useModalNavigation: () => ({ openModal: () => undefined }) };
        if (name === 'expo-router')
          return { useRouter: () => ({ push: () => {} }), useScrollToTop: () => {} };
        if (name === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (name.includes('SettingsProvider'))
          return {
            useSettings: () => ({
              settings: {},
              updateSettings: () => update(),
              reloadSettings: async () => {
                events.push('reload');
                await reload();
              },
            }),
          };
        if (name.includes('useScrollFade')) return { useScrollFade: () => ({ onScroll }) };
        if (name === 'react-native')
          return {
            ScrollView: 'ScrollView',
            View: 'View',
            Pressable: 'Pressable',
            Alert: {},
            Linking: {},
          };
        return Object.fromEntries(names.map((value) => [value, value]));
      },
    },
  );
  let tree: any;
  function render() {
    cursor = 0;
    tree = exports.default();
    effects.splice(0).forEach((fn) => fn());
  }
  function find(node: any, type: string): any {
    if (!node || typeof node !== 'object') return undefined;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat()) {
      const match = find(child, type);
      if (match) return match;
    }
  }
  render();
  return {
    render,
    events,
    discarded,
    scroll: () => find(tree, 'ScrollView'),
    onScroll,
    backup: () => find(tree, 'BackupSection').props,
    confirm: () => find(tree, 'ConfirmModal').props,
    alert: () => find(tree, 'AlertModal').props,
    appearance: () => find(tree, 'AppearanceSettingsSection').props,
    emotion: () => find(tree, 'EmotionIconStyleSelector').props,
    setUpdate(fn: typeof update) {
      update = fn;
    },
    setChoose(fn: typeof choose) {
      choose = fn;
    },
    setRestore(fn: typeof restore) {
      restore = fn;
    },
    setReload(fn: typeof reload) {
      reload = fn;
    },
    setCancel(fn: typeof cancel) {
      cancel = fn;
    },
    unmount() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test('settings passes a callable scroll handler to its ordinary ScrollView', () => {
  const ui = harness();
  assert.equal(ui.scroll().props.onScroll, ui.onScroll);
  assert.equal(typeof ui.scroll().props.onScroll, 'function');
});

test('appearance save errors reach the picker while immediate changes show an error alert', async () => {
  const h = harness();
  h.setUpdate(async () => {
    throw new Error('저장 실패');
  });
  await assert.rejects(h.appearance().onApply({ themeMode: 'dark' }), /저장 실패/);
  h.render();
  assert.equal(h.alert().visible, false);
  assert.equal(h.backup().activity, null);
  h.emotion().onChange('type2');
  await tick();
  h.render();
  assert.equal(h.alert().title, '설정을 저장하지 못했어요');
});

test('appearance save rejects competing work and releases the settings lock after completion', async () => {
  const h = harness();
  let finish!: () => void;
  h.setUpdate(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const pending = h.appearance().onApply({ fontSize: 'large' });
  h.render();
  assert.equal(h.appearance().disabled, true);
  await assert.rejects(h.appearance().onApply({ themeMode: 'dark' }), /다른 작업/);
  finish();
  await pending;
  h.render();
  assert.equal(h.appearance().disabled, false);
});

test('file selection waits for confirmation; cancel cleans cache without changing records', async () => {
  const h = harness();
  h.backup().onRestore();
  await tick();
  h.render();
  assert.equal(h.confirm().visible, true);
  assert.deepEqual(h.events, []);
  const onCancel = h.confirm().onCancel;
  onCancel();
  onCancel();
  h.render();
  assert.equal(h.confirm().visible, false);
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.discarded, [['cache/a.zip']]);
  assert.equal(h.backup().activity, null);
});

test('confirmation consumes selection once, restores then refreshes; stale cancel cannot delete in-flight files', async () => {
  const h = harness();
  let finish: () => void;
  h.setRestore(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  h.backup().onRestore();
  await tick();
  h.render();
  const confirm = h.confirm();
  confirm.onConfirm();
  confirm.onConfirm();
  confirm.onCancel();
  await tick();
  assert.deepEqual(h.events, ['cancel', 'restore']);
  assert.deepEqual(h.discarded, []);
  finish!();
  await tick();
  h.render();
  assert.deepEqual(h.events, ['cancel', 'restore', 'widget', 'reload', 'reset']);
  assert.deepEqual(h.discarded, [['cache/a.zip']]);
  assert.equal(h.alert().title, '복원 완료');
  assert.equal(h.backup().activity, null);
});

test('file-picker cancel and selection failure release the busy state', async () => {
  const h = harness();
  h.setChoose(async () => null);
  h.backup().onRestore();
  await tick();
  h.render();
  assert.equal(h.confirm().visible, false);
  assert.equal(h.backup().activity, null);
  h.setChoose(async () => {
    throw new Error('bad file');
  });
  h.backup().onRestore();
  await tick();
  h.render();
  assert.equal(h.alert().title, '복원하지 못했어요');
  assert.equal(h.backup().activity, null);
});

test('unmount cleans a pending selection and a late picker result without starting restore', async () => {
  const pending = harness();
  pending.backup().onRestore();
  await tick();
  pending.render();
  const confirm = pending.confirm().onConfirm;
  pending.unmount();
  confirm();
  await tick();
  assert.deepEqual(pending.events, []);
  assert.deepEqual(pending.discarded, [['cache/a.zip']]);
  const h = harness();
  let choose: (value: string[]) => void;
  h.setChoose(
    () =>
      new Promise<string[]>((resolve) => {
        choose = resolve;
      }),
  );
  h.backup().onRestore();
  h.unmount();
  choose!(['cache/late.zip']);
  await tick();
  assert.deepEqual(h.events, []);
  assert.deepEqual(h.discarded, [['cache/late.zip']]);
});

test('leaving before query cancellation completes prevents restore; failed restore and refresh both clean cache', async () => {
  const h = harness();
  let finish: () => void;
  h.setCancel(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  h.backup().onRestore();
  await tick();
  h.render();
  h.confirm().onConfirm();
  h.unmount();
  finish!();
  await tick();
  assert.deepEqual(h.events, ['cancel']);
  assert.deepEqual(h.discarded, [['cache/a.zip']]);
  for (const afterRestore of [false, true]) {
    const failed = harness();
    const fail = async () => {
      throw new Error('failure');
    };
    if (afterRestore) failed.setReload(fail);
    else failed.setRestore(fail);
    failed.backup().onRestore();
    await tick();
    failed.render();
    failed.confirm().onConfirm();
    await tick();
    failed.render();
    assert.equal(failed.alert().title, afterRestore ? '기록은 복원됐어요' : '복원하지 못했어요');
    assert.deepEqual(failed.discarded, [['cache/a.zip']]);
    assert.equal(failed.backup().activity, null);
  }
});

test('an in-flight restore keeps its files through unmount and refreshes shared caches afterward', async () => {
  const h = harness();
  let finish: () => void;
  h.setRestore(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  h.backup().onRestore();
  await tick();
  h.render();
  h.confirm().onConfirm();
  await tick();
  h.unmount();
  assert.deepEqual(h.discarded, []);
  finish!();
  await tick();
  assert.deepEqual(h.events, ['cancel', 'restore', 'widget', 'reload', 'reset']);
  assert.deepEqual(h.discarded, [['cache/a.zip']]);
});
