import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { EMOTIONS } from '../src/domain/constants';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}
function picker(path: string, name: string, initial: Record<string, unknown>) {
  const exports: Record<string, Function> = {};
  const state: unknown[] = [];
  let cursor = 0;
  let closed = 0;
  let deferred: (() => void) | undefined;
  const applied: unknown[][] = [];
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (dependency: string) => {
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            useState: (value: unknown) => {
              const index = cursor++;
              if (!(index in state)) state[index] = value;
              return [
                state[index],
                (next: unknown) => {
                  state[index] = next;
                },
              ];
            },
          };
        if (dependency.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: { md: 18 }, rem: 15 }) };
        if (dependency.endsWith('/constants')) return { EMOTIONS };
        if (dependency === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            useWindowDimensions: () => ({ height: 900 }),
          };
        const component = dependency.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  const render = () => {
    cursor = 0;
    const shell = exports[name]({
      ...initial,
      onClose: () => {
        closed++;
      },
      onApply: (...values: unknown[]) => applied.push(values),
    });
    const close = (action?: () => void) => {
      closed++;
      deferred = action;
    };
    return {
      shell,
      content: nodes([
        typeof shell.props.children === 'function' ? shell.props.children(close) : shell,
        typeof shell.props.footer === 'function' ? shell.props.footer(close) : shell.props.footer,
      ]),
    };
  };
  return {
    render,
    applied,
    get closed() {
      return closed;
    },
    press: (label: string) => {
      const item = render().content.find(
        (node) => node.props.accessibilityLabel === label || node.props.label === label,
      );
      assert(item, `missing choice ${label}`);
      assert(!item.props.disabled, `disabled choice ${label}`);
      item.props.onPress();
    },
    finish: () => {
      deferred?.();
      deferred = undefined;
    },
  };
}
const sortPicker = (props: Record<string, unknown>) =>
  picker('src/components/RecordSortPicker.tsx', 'RecordSortPicker', {
    title: '정렬',
    sort: 'DESC',
    ...props,
  });
const filterPicker = (props: Record<string, unknown> = {}) =>
  picker('src/screens/diary/DiaryFilterPicker.tsx', 'DiaryFilterPicker', {
    year: null,
    month: 0,
    emotion: null,
    currentYear: 2026,
    ...props,
  });

test('year picker keeps its final action in the footer and applies only after closing', () => {
  const ui = picker('src/screens/home/HomeYearPicker.tsx', 'HomeYearPicker', {
    year: 2026,
    currentYear: 2026,
    query: { data: [2025, 2026], isError: false, isPending: false },
  });
  assert(!nodes(ui.render().shell.props.children).some((node) => node.type === 'Button'));
  assert.equal(typeof ui.render().shell.props.footer, 'function');
  ui.press('2025년');
  ui.press('적용하기');
  assert.equal(ui.closed, 1);
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [[2025]]);
  for (const query of [{ isPending: true }, { isError: true }]) {
    const unavailable = picker('src/screens/home/HomeYearPicker.tsx', 'HomeYearPicker', {
      year: 2026,
      currentYear: 2026,
      query,
    });
    assert.equal(unavailable.render().shell.props.footer, undefined);
  }
});

test('sort and priority are drafts and commit together only after the sheet closes', () => {
  const ui = sortPicker({ priorityFirst: false });
  ui.press('과거순');
  ui.press('중요도 우선');
  assert.equal(ui.applied.length, 0);
  ui.press('적용하기');
  assert.equal(ui.closed, 1);
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [['ASC', true]]);
});

test('custom order disables priority and never applies a conflicting combination', () => {
  const ui = sortPicker({ priorityFirst: true, allowCustom: true });
  ui.press('커스텀');
  const priority = ui
    .render()
    .content.find((node) => node.props.accessibilityLabel === '중요도 우선');
  assert.equal(priority.props.disabled, true);
  assert.equal(priority.props.selected, false);
  ui.press('적용하기');
  ui.finish();
  assert.deepEqual(ui.applied, [['CUSTOM', false]]);
});

test('diary sorting exposes date order only and cancel does not persist drafts', () => {
  const ui = sortPicker({});
  assert(
    !ui
      .render()
      .content.some((node) => ['중요도 우선', '커스텀'].includes(node.props.accessibilityLabel)),
  );
  ui.press('과거순');
  ui.render().shell.props.onClose();
  ui.finish();
  assert.equal(ui.applied.length, 0);
  const reopened = sortPicker({});
  assert.equal(
    reopened.render().content.find((node) => node.props.accessibilityLabel === '최신순').props
      .selected,
    true,
  );
});

test('period and emotion apply together; choosing a whole year clears its month', () => {
  const ui = filterPicker();
  ui.press('이전 연도 선택');
  ui.press('2025년 3월');
  ui.press(EMOTIONS[2].name);
  assert.equal(ui.applied.length, 0);
  ui.press('일기 필터 적용');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [[2025, 3, 2]]);
  const year = filterPicker({ year: 2025, month: 3, emotion: 2 });
  year.press('2025년 전체');
  year.press('일기 필터 적용');
  year.finish();
  assert.deepEqual(year.applied, [[2025, 0, 2]]);
});

test('deselecting filter conditions is a draft; dismissing preserves saved conditions', () => {
  const ui = filterPicker({ year: 2025, month: 0, emotion: 2 });
  ui.press('2025년 전체');
  ui.press(EMOTIONS[2].name);
  ui.render().shell.props.onClose();
  ui.finish();
  assert.equal(ui.applied.length, 0);
});

test('filter resets period and emotion drafts without applying them and caps height at 90 percent', () => {
  const ui = filterPicker({ year: 2025, month: 0, emotion: 2 });
  const view = ui.render();
  assert(
    !view.content.some((node) =>
      ['전체 기간', '전체 감정'].includes(node.props.accessibilityLabel),
    ),
  );
  const reset = view.content.find((node) => node.props.accessibilityLabel === '선택 초기화');
  assert.equal(reset.props.accessibilityRole, 'button');
  assert(reset.props.className.includes('h-10'));
  assert(
    !view.content.some((node) => node.props.children === '선택한 항목을 다시 누르면 해제돼요.'),
  );
  ui.press('선택 초기화');
  assert.equal(ui.closed, 0);
  assert.equal(ui.applied.length, 0);
  const cleared = ui.render().content;
  assert(cleared.some((node) => node.props.label === '전체 일기 보기'));
  assert(cleared.some((node) => node.props.accessibilityLabel === '2026년 전체'));
  assert(!cleared.some((node) => node.type === 'PickerOption' && node.props.selected));
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, 0, null]]);
});

test('sort hint reserves the same space for date and custom order', () => {
  const ui = sortPicker({ priorityFirst: false, allowCustom: true });
  const initial = ui
    .render()
    .content.find((node) => node.props.className === 'h-10 justify-center');
  assert.equal(initial.props.children.props.numberOfLines, 2);
  assert(initial.props.children.props.className.includes('text-theme-accent'));
  ui.press('커스텀');
  const custom = ui.render().content.find((node) => node.props.className === 'h-10 justify-center');
  assert.equal(custom.props.className, initial.props.className);
  assert.equal(custom.props.children.props.children, '직접 정한 순서로 보여드려요.');
});

test('only the apply button summarizes draft choices', () => {
  const ui = filterPicker();
  const label = () =>
    ui.render().content.find((node) => node.props.accessibilityLabel === '일기 필터 적용').props
      .label;
  assert.equal(label(), '전체 일기 보기');
  ui.press('2026년 4월');
  ui.press(EMOTIONS[1].name);
  assert.equal(label(), '2026년 4월 · 기쁨 보기');
  assert(!ui.render().content.some((node) => node.props.className === 'h-6 justify-center'));
  ui.press('2026년 4월');
  assert.equal(label(), '2026년 전체 · 기쁨 보기');
  ui.press('2026년 전체');
  ui.press(EMOTIONS[1].name);
  assert.equal(label(), '전체 일기 보기');
  assert.equal(ui.applied.length, 0);
});

test('filter has one full-width action and compact emotion choices', () => {
  const ui = filterPicker();
  const view = ui.render();
  const actions = view.content.filter((node) => node.type === 'Button');
  assert.equal(actions.length, 1);
  assert.equal(actions[0].props.label, '전체 일기 보기');
  assert.equal(actions[0].props.className, undefined);
  const choices = view.content.filter(
    (node) =>
      node.type === 'PickerOption' &&
      EMOTIONS.some((item) => item.name === node.props.accessibilityLabel),
  );
  assert.equal(choices.length, 10);
  assert(choices.every((node) => node.props.dense));
  assert(
    view.content
      .filter((node) => node.type === 'EmotionImage')
      .every((node) => node.props.size === 15 * 2.25),
  );
  ui.press(EMOTIONS[2].name);
  assert.equal(ui.render().content.find((node) => node.type === 'Button').props.label, '사랑 보기');
});

test('record toolbar shows saved sorting and priority while keeping add separate', () => {
  let opened = 0;
  let added = 0;
  const ui = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'DESC',
    priorityFirst: true,
    disabledAdd: false,
    accessibilityLabel: '습관 정렬',
    onPress: () => opened++,
  });
  const view = ui.render();
  assert(view.shell.props.className.includes('h-11'));
  assert(view.content.some((node) => node.type === 'Text' && node.props.children === '최신순'));
  assert.equal(view.content.filter((node) => node.type === 'StarIcon').length, 1);
  ui.press('습관 정렬, 최신순 · 중요도 우선');
  const add = picker('src/components/ToolbarAddButton.tsx', 'ToolbarAddButton', {
    onPress: () => added++,
  });
  add.press('추가');
  assert.equal(opened, 1);
  assert.equal(added, 1);
  const custom = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'CUSTOM',
    priorityFirst: true,
    disabledAdd: false,
  }).render();
  assert(!custom.content.some((node) => node.type === 'StarIcon'));
  assert(custom.content.some((node) => node.type === 'Text' && node.props.children === '커스텀'));
});

test('diary toolbar shows current period and emotion and truncates a long label', () => {
  const ui = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
    sort: 'DESC',
    year: 2026,
    month: 4,
    emotion: 1,
  });
  const view = ui.render();
  assert(view.shell.props.className.includes('h-11'));
  const label = view.content.find(
    (node) => node.type === 'Text' && node.props.children === '26년 4월 · 기쁨',
  );
  assert.equal(label.props.numberOfLines, 1);
  assert.equal(label.props.ellipsizeMode, 'tail');
  const all = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
    sort: 'ASC',
    year: null,
    month: 0,
    emotion: null,
  }).render();
  assert(all.content.some((node) => node.type === 'Text' && node.props.children === '전체'));
  const sort = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'ASC',
    accessibilityLabel: '일기 정렬',
  }).render();
  assert(sort.content.some((node) => node.type === 'Text' && node.props.children === '과거순'));
});
