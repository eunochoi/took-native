import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });

function harness() {
  const components = new Map<string, any[]>();
  const timers = new Map<number, { callback: () => void; duration: number }>();
  const announcements: string[] = [];
  let slots: any[];
  let cursor = 0;
  let key = '';
  let context: any = null;
  let nextTimer = 0;
  let effects: (() => void)[] = [];
  const effect = (fn: () => any, deps: unknown[]) => {
    const index = cursor++;
    const previous = slots[index];
    if (previous && deps.every((value, i) => Object.is(previous.deps[i], value))) return;
    const record = { deps, cleanup: undefined as any };
    slots[index] = record;
    effects.push(() => {
      previous?.cleanup?.();
      record.cleanup = fn();
    });
  };
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/NoticeProvider.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      Error,
      setTimeout: (callback: () => void, duration: number) => {
        const id = ++nextTimer;
        timers.set(id, { callback, duration });
        return id;
      },
      clearTimeout: (id: number) => timers.delete(id),
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            createContext: () => ({ Provider: 'Provider' }),
            useContext: () => context,
            useId: () => key,
            useState: (initial: any) => {
              const record = slots;
              const index = cursor++;
              if (!(index in record)) record[index] = initial;
              return [
                record[index],
                (next: any) => {
                  record[index] = typeof next === 'function' ? next(record[index]) : next;
                },
              ];
            },
            useRef: (initial: any) => {
              const index = cursor++;
              return slots[index] ?? (slots[index] = { current: initial });
            },
            useCallback: (fn: any, deps: unknown[]) => {
              const index = cursor++;
              if (!slots[index] || deps.some((value, i) => !Object.is(slots[index].deps[i], value)))
                slots[index] = { fn, deps };
              return slots[index].fn;
            },
            useEffect: effect,
            useLayoutEffect: effect,
          };
        if (name === 'react-native')
          return {
            View: 'View',
            AccessibilityInfo: {
              announceForAccessibility: (message: string) => announcements.push(message),
            },
          };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ top: 24, left: 8, right: 12 }) };
        if (name === '../theme/AppThemeProvider') return { useAppTheme: () => ({ rem: 16 }) };
        if (name === './Text') return { Text: 'Text' };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  const render = (component: any, props: any, name: string) => {
    key = name;
    slots = components.get(name) ?? [];
    components.set(name, slots);
    cursor = 0;
    effects = [];
    const tree = component(props);
    effects.splice(0).forEach((fn) => fn());
    return tree;
  };
  const refresh = () => {
    context = render(exports.NoticeProvider, { children: 'screens' }, 'provider').props.value;
  };
  const host = (name: string, modal = false, active = true) => {
    const wrapper = render(exports.NoticeHost, { modal, active }, `${name}-wrapper`);
    return wrapper ? render(wrapper.type, wrapper.props, name) : null;
  };
  const unmount = (name: string) => {
    components.get(name)?.forEach((slot) => slot?.cleanup?.());
    components.delete(name);
  };
  refresh();
  return {
    refresh,
    host,
    unmount,
    timers,
    announcements,
    show: (content: any) => {
      context.showNotice(content);
      refresh();
    },
    notice: () => context.notice,
    outsideProvider: () => {
      context = null;
      return exports.NoticeHost({});
    },
    outsideConsumer: () => {
      context = null;
      return exports.useNotice();
    },
  };
}

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}

test('success and info notices expire after 2 seconds; errors after 4 seconds with no confirmation control', () => {
  const ui = harness();
  for (const [tone, duration] of [
    ['success', 2000],
    ['info', 2000],
    ['error', 4000],
  ] as const) {
    ui.show({ title: '처리 결과', message: '상세 안내', tone });
    const timer = [...ui.timers.values()][0];
    assert.equal(timer.duration, duration);
    const tree = ui.host('root');
    assert.equal(tree.props.pointerEvents, 'none');
    assert.equal(tree.props.style.top, 40);
    assert.equal(tree.props.style.paddingLeft, 24);
    assert.equal(tree.props.style.paddingRight, 28);
    assert(nodes(tree).some((node) => node.props.children === '처리 결과'));
    assert(nodes(tree).some((node) => node.props.children === '상세 안내'));
    assert(nodes(tree).every((node) => !node.props.onPress));
    assert.equal(ui.announcements.at(-1), '처리 결과. 상세 안내');
    timer.callback();
    ui.refresh();
    assert.equal(ui.notice(), null);
    assert.equal(ui.host('root'), null);
  }
});

test('a repeated or newer notice resets the timer; stale callbacks cannot remove the latest message', () => {
  const ui = harness();
  ui.show({ title: '저장했어요', tone: 'success' });
  const first = [...ui.timers.values()][0];
  const firstId = ui.notice().id;
  ui.show({ title: '저장했어요', tone: 'success' });
  assert.notEqual(ui.notice().id, firstId);
  assert.equal(ui.timers.size, 1);
  first.callback();
  ui.refresh();
  assert.equal(ui.notice().title, '저장했어요');
  ui.show({ title: '저장 실패', tone: 'error' });
  assert.equal(ui.notice().title, '저장 실패');
  assert.equal([...ui.timers.values()][0].duration, 4000);
  ui.unmount('provider');
  assert.equal(ui.timers.size, 0);
});

test('only the top native modal displays notices; closing it hands the same notice to the remaining host', () => {
  const ui = harness();
  ui.show({ title: '저장 실패', tone: 'error' });
  assert(ui.host('root'));
  ui.host('first', true);
  ui.refresh();
  assert.equal(ui.host('root'), null);
  assert(ui.host('first', true));
  ui.host('second', true);
  ui.refresh();
  assert.equal(ui.host('first', true), null);
  assert(ui.host('second', true));
  ui.host('second', true, false);
  ui.refresh();
  assert.equal(ui.host('second', true, false), null);
  assert(ui.host('first', true));
  ui.unmount('first');
  ui.refresh();
  assert(ui.host('root'));
  assert.equal(ui.notice().title, '저장 실패');
  assert.equal(ui.timers.size, 1);
});

test('standalone widget sheets can render without a notice provider; consumers require the provider', () => {
  const ui = harness();
  assert.equal(ui.outsideProvider(), null);
  assert.throws(() => ui.outsideConsumer(), /NoticeProvider/);
});
