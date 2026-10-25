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
  StackActions,
} = require('../node_modules/expo-router/build/react-navigation/routers/StackRouter.js');
const {
  TabRouter,
} = require('../node_modules/expo-router/build/react-navigation/routers/TabRouter.js');

test('new and existing widget URLs redirect on cold and warm launches without changing other deep links', () => {
  for (const initial of [true, false]) {
    for (const path of [
      'pawpaw-took://sober/42',
      'pawpaw-took:///sober/42',
      'took-local://sober/42',
      'took-local:///sober/42',
      '/sober/42',
    ]) {
      assert.equal(redirectSystemPath({ path, initial }), '/widget?soberId=42');
    }
    for (const path of [
      'pawpaw-took://sober',
      'pawpaw-took://sober/',
      'pawpaw-took://sober/0',
      'pawpaw-took://sober/9007199254740992',
      'took-local://sober',
      'took-local://sober/',
      'took-local://sober/0',
      'took-local://sober/9007199254740992',
    ]) {
      assert.equal(redirectSystemPath({ path, initial }), '/widget');
    }
    for (const path of [
      'pawpaw-took://diary/1',
      'pawpaw-took://sober/42/edit',
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

function entry(soberId: unknown, reset: (state: any) => void) {
  const effects: (() => void)[] = [];
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../app/widget.tsx', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react')
          return { useLayoutEffect: (effect: () => void) => effects.push(effect) };
        if (name === 'expo-router')
          return {
            useLocalSearchParams: () => ({ soberId }),
            useNavigation: () => ({ reset }),
          };
        throw Error(`Unexpected import: ${name}`);
      },
    },
  );
  assert.equal(exports.default(), null);
  effects.forEach((effect) => effect());
}

test('widget entry replaces previous stacks and closes back to the sober tab', () => {
  const routeNames = ['(tabs)', 'widget', 'diary/new', 'sober/[id]/index', 'sober/[id]/edit'];
  const options = { routeNames, routeParamList: {}, routeGetIdList: {} };
  const stack = StackRouter({ initialRouteName: '(tabs)' });
  const tabOptions = {
    routeNames: ['index', 'calendar', 'diary', 'habit', 'sober', 'setting'],
    routeParamList: {},
    routeGetIdList: {},
  };
  const tabs = TabRouter({ initialRouteName: 'index' });
  for (const previous of [[], ['diary/new'], ['sober/[id]/index', 'sober/[id]/edit']]) {
    let state = stack.getInitialState(options);
    for (const name of [...previous, 'widget']) {
      state = stack.getStateForAction(state, StackActions.push(name, { id: '9' }), options);
    }
    for (const id of ['42', '7', '7']) {
      entry(id, (payload) => {
        state = stack.getRehydratedState(
          stack.getStateForAction(state, { type: 'RESET', payload }, options),
          options,
        );
      });
      assert.deepEqual(
        Array.from(state.routes, (route: any) => route.name),
        ['(tabs)', 'sober/[id]/index'],
      );
      assert.equal(state.index, 1);
      assert.equal(state.routes[1].params.id, id);
      const tabState = tabs.getRehydratedState(state.routes[0].state, tabOptions);
      assert.equal(tabState.routes[tabState.index].name, 'sober');
    }
    state = stack.getStateForAction(state, StackActions.pop(1), options);
    assert.equal(state.routes.length, 1);
    assert.equal(state.routes[0].name, '(tabs)');
    const tabState = tabs.getRehydratedState(state.routes[0].state, tabOptions);
    assert.equal(tabState.routes[tabState.index].name, 'sober');
  }
});

test('an unconfigured widget or invalid identifier opens only the sober list', () => {
  for (const id of [undefined, '', '0', '-1', '1.5', 'abc', ['1', '2'], '9007199254740992']) {
    let state: any;
    entry(id, (next) => {
      state = next;
    });
    assert.equal(state.index, 0);
    assert.equal(state.routes.length, 1);
    assert.equal(state.routes[0].name, '(tabs)');
    assert.equal(state.routes[0].state.routes[0].name, 'sober');
  }
});
