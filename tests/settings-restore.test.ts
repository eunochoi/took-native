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
  const notices: any[] = [];
  const exports: any = {};
  const onScroll = () => {};
  const routes: unknown[] = [];
  const openedUrls: string[] = [];
  const names = [
    'ColorScrollView',
    'Toolbar',
    'AppIcon',
    'OnboardingSheet',
    'TabBottomSpacer',
    'ConfirmModal',
    'ScrollEdgeFade',
    'Text',
    'BackupDestinationPicker',
    'AppearanceSettingsSection',
    'BackupSection',
    'PageTopSection',
    'NotificationSettingsSection',
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
      Error,
      require: (name: string) => {
        if (name.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: (notice: any) => notices.push(notice) }) };
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
          return {
            useModalNavigation: () => ({ openModal: (route: unknown) => routes.push(route) }),
          };
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
        if (name.includes('useScrollFade'))
          return { useScrollFade: () => ({ onScroll, topVisible: true }) };
        if (name === 'react-native')
          return {
            ScrollView: 'ScrollView',
            View: 'View',
            Pressable: 'Pressable',
            Alert: {},
            Linking: {
              openURL: async (url: string) => {
                openedUrls.push(url);
              },
            },
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
    routes,
    openedUrls,
    toolbar: () => find(tree, 'Toolbar'),
    onboarding: () => find(tree, 'OnboardingSheet'),
    backup: () => find(tree, 'BackupSection').props,
    confirm: () => find(tree, 'ConfirmModal').props,
    notice: () => notices.at(-1),
    appearance: () => find(tree, 'AppearanceSettingsSection').props,
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

test('settings passes a callable scroll handler to its native scrolling viewport', () => {
  const ui = harness();
  assert.equal(ui.scroll().props.onScroll, ui.onScroll);
  assert.equal(typeof ui.scroll().props.onScroll, 'function');
});

test('immediate appearance save failures show a notice and allow retry', async () => {
  const h = harness();
  h.setUpdate(async () => {
    throw new Error('저장 실패');
  });
  await h.appearance().onChange({ themeMode: 'dark' });
  h.render();
  assert.equal(h.notice().title, '설정을 저장하지 못했어요');
  assert.equal(h.notice().message, '저장 실패');
  assert.equal(h.backup().activity, null);
  let saves = 0;
  h.setUpdate(async () => {
    saves++;
  });
  await h.appearance().onChange({ fontSize: 'large' });
  h.render();
  assert.equal(saves, 1);
  assert.equal(h.appearance().disabled, false);
});

test('appearance save ignores competing work and releases the settings lock after completion', async () => {
  const h = harness();
  let finish!: () => void;
  let saves = 0;
  h.setUpdate(() => {
    saves++;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  const pending = h.appearance().onChange({ fontSize: 'large' });
  h.render();
  assert.equal(h.appearance().disabled, true);
  await h.appearance().onChange({ themeMode: 'dark' });
  assert.equal(saves, 1);
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
  assert.equal(h.notice().title, '복원 완료');
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
  assert.equal(h.notice().title, '복원하지 못했어요');
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
    assert.equal(failed.notice().title, afterRestore ? '기록은 복원됐어요' : '복원하지 못했어요');
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

test('settings restores the three actions to a sticky toolbar below the shared title', async () => {
  const ui = harness();
  const scroll = ui.scroll();
  assert.deepEqual(Array.from(scroll.props.stickyHeaderIndices), [0, 2]);
  const [fade, title, toolbar, body] = scroll.props.children;
  assert.equal(fade.props.className, 'h-0 overflow-visible');
  assert.equal(fade.props.collapsable, false);
  assert.equal(fade.props.pointerEvents, 'none');
  assert.equal(fade.props.children.type, 'ScrollEdgeFade');
  assert.equal(fade.props.children.props.edge, 'top');
  assert.equal(title.type, 'PageTopSection');
  assert.equal(title.props.onLayout, undefined);
  assert.equal(toolbar.type, 'Toolbar');
  assert.equal(toolbar.props.fadeVisible, undefined);
  assert.equal(body.props.children[0].type, 'NotificationSettingsSection');
  const [guide, privacy, web] = toolbar.props.children;
  assert.equal(guide.props.children[0].props.name, 'info');
  assert.equal(guide.props.children[1].props.children, '소개');
  assert.equal(privacy.props.accessibilityLabel, '개인정보처리방침');
  assert.equal(web.props.accessibilityLabel, '웹 서비스 열기');
  assert.equal(privacy.props.children[0].type, 'AppIcon');
  assert.equal(privacy.props.children[1].props.children, '개인정보처리방침');
  assert.equal(web.props.children.type, 'AppIcon');
  guide.props.onPress();
  ui.render();
  assert(ui.onboarding());
  privacy.props.onPress();
  await web.props.onPress();
  assert.deepEqual(ui.routes, ['/privacy']);
  assert.deepEqual(ui.openedUrls, ['https://to-ok.me']);
});

test('settings toolbar stays disabled while a settings save is running', async () => {
  const ui = harness();
  let finish!: () => void;
  ui.setUpdate(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const saving = ui.appearance().onChange({ themeMode: 'dark' });
  ui.render();
  for (const button of ui.toolbar().props.children) {
    assert.equal(button.props.disabled, true);
    assert.equal(button.props.accessibilityState.disabled, true);
  }
  finish();
  await saving;
  ui.render();
  for (const button of ui.toolbar().props.children) {
    assert.equal(button.props.disabled, false);
  }
});
