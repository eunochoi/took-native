import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
const start = '2024-03-02T10:20:00.000Z';
function form(name: 'HabitForm' | 'SoberForm', id?: number) {
  const exports: any = {};
  const slots: any[] = [];
  let cursor = 0;
  let dirty = false;
  let effects: Function[] = [];
  const record = {
    id,
    name: '기록',
    priority: 1,
    icon_key: name === 'HabitForm' ? 'goal' : 'favorite',
    icon_color: 'theme',
    initial_started_at: start,
    goal_mode: 'AUTO',
    goal_days: null,
    description: null,
    is_priority: 0,
  };
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/screens/${name}.tsx`, import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('/NoticeProvider'))
          return { useNotice: () => ({ showNotice: () => {} }) };
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            useState: (initial: any) => {
              const index = cursor++;
              if (!(index in slots))
                slots[index] = typeof initial === 'function' ? initial() : initial;
              return [
                slots[index],
                (value: any) => {
                  const next = typeof value === 'function' ? value(slots[index]) : value;
                  dirty ||= slots[index] !== next;
                  slots[index] = next;
                },
              ];
            },
            useRef: (initial: any) => {
              const index = cursor++;
              return slots[index] ?? (slots[index] = { current: initial });
            },
            useEffect: (effect: Function) => effects.push(effect),
          };
        if (dependency === 'react-native') return { View: 'View', TextInput: 'TextInput' };
        if (dependency === 'date-fns') return require('date-fns');
        if (dependency === 'expo-sqlite') return { useSQLiteContext: () => ({}) };
        if (dependency === '@tanstack/react-query')
          return {
            useQuery: () => ({ data: id === undefined ? undefined : record, isPending: false }),
          };
        if (dependency === 'expo-router/react-navigation') return { usePreventRemove: () => {} };
        if (dependency.endsWith('/queries'))
          return {
            habitQueries: { byId: () => ({}) },
            soberQueries: { byId: () => ({}) },
            useRecordMutation: () => ({ isPending: false }),
          };
        if (dependency.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, rem: 15 }) };
        if (dependency.endsWith('domain/constants')) return require('../src/domain/constants');
        if (dependency.endsWith('domain/limits')) return require('../src/domain/limits');
        if (dependency.endsWith('domain/sober')) return require('../src/domain/sober');
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency.endsWith('HabitPriorityPicker'))
          return {
            HABIT_PRIORITY_LABELS: ['기본', '중요', '매우 중요'],
            HabitPriorityPicker: 'HabitPriorityPicker',
          };
        const component = dependency.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  function render(): any[] {
    let tree: any;
    do {
      dirty = false;
      cursor = 0;
      effects = [];
      tree = exports[name]({ id });
      effects.forEach((effect) => effect());
    } while (dirty);
    const nodes = (node: any): any[] => {
      if (Array.isArray(node)) return node.flatMap(nodes);
      if (!node || typeof node !== 'object') return [];
      return [node, ...nodes(node.props?.children), ...nodes(node.props?.overlays)];
    };
    return nodes(tree);
  }
  return { render };
}

test('habit and sober forms allow start selection only during creation and explain the immutable start', () => {
  for (const name of ['HabitForm', 'SoberForm'] as const) {
    for (const id of [undefined, 1]) {
      const ui = form(name, id);
      const nodes = ui.render();
      const row = nodes.find((node) => node.props.accessibilityLabel === '시작 일시 선택');
      assert.equal(row.props.disabled, id !== undefined);
      if (id !== undefined) assert(!row.props.label.includes('NaN'));
      const notice = nodes.find(
        (node) => node.props.children === '시작 일시는 저장 후 변경할 수 없어요.',
      );
      assert(notice.props.className.includes('text-theme-accent'));
      row.props.onPress();
      const picker = ui.render().find((node) => node.type === 'DateTimePicker');
      assert.equal(!!picker, id === undefined);
      if (picker) {
        picker.props.onApply(start);
        assert.equal(ui.render().find((node) => node.type === 'DateTimePicker').props.value, start);
      }
    }
  }
});
