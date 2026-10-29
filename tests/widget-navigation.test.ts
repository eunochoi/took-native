import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { redirectSystemPath } from '../app/+native-intent';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const {
  StackRouter,
} = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
const {
  TabRouter,
} = require('../node_modules/expo-router/build/react-navigation/routers/TabRouter.js');

test('existing widget URLs redirect on cold and warm launches without changing other deep links', () => {
  for (const initial of [true, false]) {
    for (const path of ['took-local://sober/42', 'took-local:///sober/42', '/sober/42']) {
      assert.equal(redirectSystemPath({ path, initial }), '/widget?soberId=42');
    }
    for (const path of [
      'took-local://sober',
      'took-local://sober/',
      'took-local://sober/0',
      'took-local://sober/9007199254740992',
    ]) {
      assert.equal(redirectSystemPath({ path, initial }), '/widget');
    }
    for (const path of [
      'took-local://diary/1',
      'took-local://sober/42/edit',
      'https://example.com/sober/42',
      'invalid%',
      '',
    ]) {
      assert.equal(redirectSystemPath({ path, initial }), path);
    }
  }
});

function widgetFlow(active = true) {
  let params: any = {};
  let state = StackRouter({ initialRouteName: '(tabs)' }).getInitialState({
    routeNames: ['(tabs)', 'widget', 'diary/new', 'sober/[id]/index'],
    routeParamList: {},
    routeGetIdList: {},
  });
  let focusEffect: () => (() => void) | undefined;
  let cleanup: (() => void) | undefined;
  let focused = true;
  let sequence = 0;
  const frames = new Map<number, () => void>();
  const changes = new Set<() => void>();
  const pushes: any[] = [];
  const resets: any[] = [];
  let transitionResets = 0;
  const handled = { current: null };
  const appState = {
    currentState: active ? 'active' : 'background',
    addEventListener: (_: string, fn: () => void) => {
      changes.add(fn);
      return { remove: () => changes.delete(fn) };
    },
  };
  const navigation = {
    isFocused: () => focused,
    getState: () => state,
    reset: (payload: any) => {
      resets.push(payload);
      state = payload;
    },
    setParams: (next: any) => {
      params = { ...params, ...next };
    },
  };
  function render(path: string) {
    const exports: any = {};
    runInNewContext(
      ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      }).outputText,
      {
        exports,
        requestAnimationFrame: (fn: () => void) => {
          frames.set(++sequence, fn);
          return sequence;
        },
        cancelAnimationFrame: (id: number) => frames.delete(id),
        require: (name: string) => {
          if (name === 'react') return { useCallback: (fn: any) => fn, useRef: () => handled };
          if (name === 'react/jsx-runtime')
            return { jsx: (type: any, props: any) => ({ type, props }) };
          if (name === 'react-native')
            return { AppState: appState, View: 'View', ActivityIndicator: 'Spinner' };
          if (name === 'expo-router')
            return {
              useLocalSearchParams: () => params,
              useNavigation: () => navigation,
              useFocusEffect: (fn: any) => {
                focusEffect = fn;
              },
            };
          if (name === 'expo-router/react-navigation')
            return { useRoute: () => ({ key: 'widget-request' }) };
          if (name.endsWith('/ModalNavigationProvider'))
            return {
              useModalTransition: () => ({
                resetTransitions: () => transitionResets++,
                openModal: (href: any) => {
                  pushes.push(href);
                  return true;
                },
              }),
            };
          if (name.endsWith('/AppThemeProvider'))
            return { useAppTheme: () => ({ colors: { accent: 'blue' } }) };
          throw Error(`Unexpected dependency: ${name}`);
        },
      },
    );
    return path.endsWith('widget.tsx') ? exports.default() : exports.useWidgetDetail();
  }
  return {
    params: (next: any) => {
      params = next;
    },
    entry: () => render('../app/widget.tsx'),
    detail: () => render('../src/navigation/useWidgetDetail.ts'),
    focus: () => {
      focused = true;
      cleanup = focusEffect();
    },
    blur: () => {
      focused = false;
      cleanup?.();
    },
    active: (value: boolean) => {
      appState.currentState = value ? 'active' : 'background';
      changes.forEach((fn) => fn());
    },
    flush: () => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
    pushes,
    resets,
    transitionResets: () => transitionResets,
  };
}

test('widget first restores only the sober tab, then its focused screen opens one detail', () => {
  const h = widgetFlow();
  h.params({ soberId: '42' });
  assert(h.entry(), 'a pending entry must show a loading view');
  h.focus();
  assert.equal(h.resets.length, 0, 'do not reset during initial layout');
  h.flush();
  assert.equal(h.resets.length, 1);
  assert.equal(h.transitionResets(), 1);
  const payload = h.resets[0];
  assert.equal(payload.routes.length, 1, 'never create tabs and transparent modal together');
  const tab = TabRouter({ initialRouteName: 'index' }).getRehydratedState(payload.routes[0].state, {
    routeNames: ['index', 'calendar', 'diary', 'habit', 'sober', 'setting'],
    routeParamList: {},
    routeGetIdList: {},
  });
  const sober = tab.routes[tab.index];
  assert.equal(sober.name, 'sober');
  h.blur();
  h.params(sober.params);
  h.detail();
  h.flush();
  assert.equal(h.pushes.length, 0, 'wait for sober focus');
  h.focus();
  h.flush();
  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].params.id, '42');
  h.active(true);
  h.flush();
  assert.equal(h.pushes.length, 1, 'consume each request once');
});

test('backgrounding or losing focus cancels pending navigation; resume retries when active', () => {
  const h = widgetFlow(false);
  h.params({ soberId: '7' });
  h.entry();
  h.focus();
  h.flush();
  assert.equal(h.resets.length, 0);
  h.active(true);
  h.blur();
  h.flush();
  assert.equal(h.resets.length, 0);
  h.entry();
  h.focus();
  h.flush();
  assert.equal(h.resets.length, 1);
  h.blur();
  h.params({ widgetSoberId: '7', widgetRequest: 'request-7' });
  h.active(false);
  h.detail();
  h.focus();
  h.flush();
  assert.equal(h.pushes.length, 0);
  h.active(true);
  h.flush();
  assert.equal(h.pushes.length, 1);
});

test('a newer widget request cancels an older pending detail', () => {
  const h = widgetFlow();
  h.params({ widgetSoberId: '7', widgetRequest: 'old' });
  h.detail();
  h.focus();
  h.blur();
  h.params({ widgetSoberId: '42', widgetRequest: 'new' });
  h.detail();
  h.focus();
  h.flush();
  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].params.id, '42');
});

test('an unconfigured widget or invalid identifier opens only the sober list', () => {
  for (const soberId of [undefined, '', '0', '-1', '1.5', 'abc', ['1', '2'], '9007199254740992']) {
    const h = widgetFlow();
    h.params({ soberId });
    h.entry();
    h.focus();
    h.flush();
    assert.equal(h.resets[0].routes.length, 1);
    assert.equal(h.resets[0].routes[0].state.routes[0].params.widgetSoberId, undefined);
    assert.equal(h.pushes.length, 0);
  }
});
