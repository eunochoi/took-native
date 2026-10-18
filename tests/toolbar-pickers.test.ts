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
        if (dependency.endsWith('/FilterSheet')) {
          const sheetExports: Record<string, Function> = {};
          runInNewContext(
            ts.transpileModule(
              readFileSync(new URL('../src/components/FilterSheet.tsx', import.meta.url), 'utf8'),
              {
                compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
              },
            ).outputText,
            {
              exports: sheetExports,
              require: (name: string) => {
                if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
                if (name === 'react-native') return { View: 'View', Pressable: 'Pressable' };
                if (name.endsWith('AppThemeProvider'))
                  return { useAppTheme: () => ({ iconSizes: { md: 18 } }) };
                const component = name.split('/').at(-1)!;
                return { [component]: component };
              },
            },
          );
          return sheetExports;
        }
        if (dependency === 'tailwind-merge') return require(dependency);
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
            Switch: 'Switch',
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
    let shell = exports[name]({
      ...initial,
      onClose: () => {
        closed++;
      },
      onApply: (...values: unknown[]) => applied.push(values),
    });
    if (typeof shell.type === 'function') shell = shell.type(shell.props);
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
      if (item.type === 'Switch') item.props.onValueChange(!item.props.value);
      else item.props.onPress();
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
    currentMonth: 10,
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
  const choices = ui
    .render()
    .content.filter((node) => ['Switch', 'PickerOption'].includes(node.type));
  assert.equal(choices[0].type, 'Switch');
  assert.equal(choices[0].props.accessibilityLabel, '중요도 우선');
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
  assert.equal(priority.props.value, false);
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

test('filter resets period and emotion drafts without applying them', () => {
  const ui = filterPicker({ year: 2025, month: 0, emotion: 2 });
  const view = ui.render();
  assert(
    !view.content.some((node) =>
      ['전체 기간', '전체 감정'].includes(node.props.accessibilityLabel),
    ),
  );
  const reset = view.content.find((node) => node.props.accessibilityLabel === '선택 초기화');
  assert.equal(reset.props.accessibilityRole, 'button');
  assert(reset.props.className.includes('min-h-12'));
  assert(
    !view.content.some((node) => node.props.children === '선택한 항목을 다시 누르면 해제돼요.'),
  );
  ui.press('선택 초기화');
  assert.equal(ui.closed, 0);
  assert.equal(ui.applied.length, 0);
  const cleared = ui.render().content;
  assert(cleared.some((node) => node.props.label === '적용하기'));
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

test('diary sections summarize drafts while the common footer stays concise', () => {
  const ui = filterPicker();
  const apply = () =>
    ui.render().content.find((node) => node.props.accessibilityLabel === '일기 필터 적용');
  assert.equal(apply().props.label, '적용하기');
  assert(ui.render().content.some((node) => node.props.children === '전체 기간'));
  ui.press('2026년 4월');
  ui.press(EMOTIONS[1].name);
  assert.equal(apply().props.label, '적용하기');
  assert(ui.render().content.some((node) => node.props.children === '2026년 4월'));
  ui.press('2026년 4월');
  assert(ui.render().content.some((node) => node.props.children === '2026년 전체'));
  ui.press('2026년 전체');
  ui.press(EMOTIONS[1].name);
  assert(ui.render().content.some((node) => node.props.children === '전체 기간'));
  assert.equal(ui.applied.length, 0);
});

test('filters share footer reset and apply while diary keeps ten compact emotion choices', () => {
  const samples = [
    filterPicker(),
    picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
      filter: { completion: 'ALL', priority: null },
    }),
    picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
      filter: { priorityOnly: false, minimumDays: 0 },
    }),
  ];
  for (const ui of samples) {
    const view = ui.render();
    const footer = nodes(view.shell.props.footer(() => {}));
    assert(footer.some((node) => node.props.accessibilityLabel === '선택 초기화'));
    assert(footer.some((node) => node.props.label === '적용하기'));
    assert(
      !nodes(view.shell.props.children).some(
        (node) => node.props.accessibilityLabel === '선택 초기화',
      ),
    );
  }
  const view = samples[0].render();
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
  assert(view.content.some((node) => node.type === 'Text' && node.props.children === '최신순'));
  assert.equal(view.content.filter((node) => node.type === 'StarIcon').length, 1);
  ui.press('습관 정렬, 중요도 우선 · 생성일 내림차순');
  const add = picker('src/components/ToolbarAddButton.tsx', 'ToolbarAddButton', {
    onPress: () => added++,
  });
  assert(!add.render().content.some((node) => node.type === 'Text'));
  assert.equal(add.render().content.find((node) => node.type === 'AppIcon').props.name, 'add');
  add.press('추가');
  assert.equal(opened, 1);
  assert.equal(added, 1);
  const custom = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'CUSTOM',
    priorityFirst: true,
    disabledAdd: false,
  }).render();
  assert(!custom.content.some((node) => node.type === 'StarIcon'));
  assert(!custom.content.some((node) => node.type === 'AppIcon'));
  assert(custom.content.some((node) => node.type === 'Text' && node.props.children === '커스텀'));
});

test('diary toolbar shows current period and emotion and truncates a long label', () => {
  const ui = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
    sort: 'DESC',
    year: 2026,
    currentYear: 2026,
    month: 4,
    emotion: 1,
  });
  const view = ui.render();
  const label = view.content.find(
    (node) => node.type === 'Text' && node.props.children === '4월 · 기쁨',
  );
  assert.equal(label.props.numberOfLines, 1);
  assert.equal(label.props.ellipsizeMode, 'tail');
  const all = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
    sort: 'ASC',
    year: null,
    month: 0,
    emotion: null,
  }).render();
  assert(all.content.some((node) => node.type === 'Text' && node.props.children === '필터'));
  const sort = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'ASC',
    accessibilityLabel: '일기 정렬',
    sortLabel: '날짜',
  }).render();
  assert(sort.content.some((node) => node.type === 'Text' && node.props.children === '오래된순'));
});

test('sober sorting shows priority, record, creation in order and applies drafts together', () => {
  const ui = sortPicker({ priorityFirst: false, recordSort: 'DESC', sortLabel: '생성일' });
  const headings = ui
    .render()
    .content.filter(
      (node) =>
        node.type === 'Text' &&
        ['중요한 항목 먼저', '기록', '생성일'].includes(node.props.children),
    )
    .map((node) => node.props.children);
  assert.deepEqual(headings, ['중요한 항목 먼저', '기록', '생성일']);
  ui.press('중요도 우선');
  ui.press('현재 기록 오름차순');
  ui.press('과거순');
  assert.equal(ui.applied.length, 0);
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [['ASC', true, 'ASC']]);
  const cancelled = sortPicker({ priorityFirst: true, recordSort: 'DESC' });
  cancelled.press('현재 기록 오름차순');
  cancelled.render().shell.props.onClose();
  cancelled.finish();
  assert.equal(cancelled.applied.length, 0);
});

test('sober toolbar announces record direction and creation tie breaker', () => {
  const ui = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
    sort: 'ASC',
    recordSort: 'DESC',
    priorityFirst: true,
    accessibilityLabel: '거리두기 항목 정렬',
    onPress: () => {},
  });
  assert.equal(
    ui.render().shell.props.accessibilityLabel,
    '거리두기 항목 정렬, 중요도 우선 · 기록 내림차순 · 생성일 오름차순',
  );
});

test('toolbar indicators show priority and representative sorting without trailing icons', () => {
  for (const priorityFirst of [false, true]) {
    for (const sort of ['ASC', 'DESC']) {
      for (const recordSort of [undefined, 'ASC', 'DESC']) {
        const ui = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
          priorityFirst,
          sort,
          recordSort,
          accessibilityLabel: '정렬',
        }).render();
        const indicators = ui.content.filter((node) =>
          ['Text', 'StarIcon', 'AppIcon'].includes(node.type),
        );
        const labels = indicators.map((node) =>
          node.type === 'StarIcon'
            ? '★'
            : node.type === 'AppIcon'
              ? node.props.name
              : node.props.children,
        );
        const isDefault =
          !priorityFirst && sort === 'DESC' && (!recordSort || recordSort === 'DESC');
        assert.deepEqual(
          labels,
          isDefault
            ? ['sort', '정렬']
            : [
                ...(priorityFirst ? ['★'] : []),
                recordSort
                  ? recordSort === 'DESC'
                    ? '긴 기록순'
                    : '짧은 기록순'
                  : sort === 'DESC'
                    ? '최신순'
                    : '오래된순',
              ],
        );
      }
    }
  }
});

test('sort modal defaults are leftmost', () => {
  const sort = sortPicker({ priorityFirst: false, recordSort: 'DESC', allowCustom: true }).render();
  const choices = sort.content.filter((node) => node.type === 'PickerOption');
  assert.deepEqual(
    choices.map((node) => node.props.accessibilityLabel),
    ['현재 기록 내림차순', '현재 기록 오름차순', '최신순', '과거순', '커스텀'],
  );
  assert.equal(choices[0].props.selected, true);
  assert.equal(choices[2].props.selected, true);
});

test('filter labels shorten this year while retaining other years and full accessible dates', () => {
  for (const [year, month, emotion, label] of [
    [2026, 10, null, '10월'],
    [2025, 10, 1, '25년 10월 · 기쁨'],
    [2026, 0, null, '올해'],
    [null, 0, 1, '기쁨'],
    [null, 0, null, '필터'],
  ] as const) {
    const view = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
      year,
      month,
      emotion,
      currentYear: 2026,
    }).render();
    const text = view.content.find((node) => node.type === 'Text');
    assert.equal(text.props.children, label);
    assert(text.props.className.includes('text-theme-text-secondary'));
    if (year !== null) assert(view.shell.props.accessibilityLabel.includes(`${year}년`));
  }
});

test('habit filter drafts combine completion and exact stars after closing, and reset to all', () => {
  const ui = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completion: 'ALL', priority: null },
  });
  const choices = ui.render().content.filter((node) => node.type === 'PickerOption');
  assert.equal(choices[0].props.accessibilityLabel, '오늘 전체');
  assert.equal(choices[3].props.accessibilityLabel, '별표 전체');
  ui.press('오늘 미완료');
  ui.press('별표 2개');
  assert.equal(ui.applied.length, 0);
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.applied)), [
    [{ completion: 'UNDONE', priority: 1 }],
  ]);
  const reset = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completion: 'DONE', priority: 2 },
  });
  reset.press('선택 초기화');
  assert.equal(reset.applied.length, 0);
  reset.press('적용하기');
  reset.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(reset.applied)), [
    [{ completion: 'ALL', priority: null }],
  ]);
});

test('sober filters draft importance and one minimum period, with cancel and reset', () => {
  const ui = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: false, minimumDays: 0 },
  });
  assert.equal(
    ui.render().content.find((node) => node.type === 'PickerOption').props.accessibilityLabel,
    '현재 기록 전체',
  );
  ui.press('중요한 항목만 보기');
  ui.press('현재 기록 1주 이상');
  ui.press('현재 기록 2주 이상');
  assert.equal(
    ui.render().content.filter((node) => node.type === 'PickerOption' && node.props.selected)
      .length,
    1,
  );
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.applied)), [
    [{ priorityOnly: true, minimumDays: 14 }],
  ]);
  const cancel = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: true, minimumDays: 30 },
  });
  cancel.press('선택 초기화');
  cancel.render().shell.props.onClose();
  cancel.finish();
  assert.equal(cancel.applied.length, 0);
  const reset = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: true, minimumDays: 30 },
  });
  reset.press('선택 초기화');
  reset.press('적용하기');
  reset.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(reset.applied)), [
    [{ priorityOnly: false, minimumDays: 0 }],
  ]);
});

test('diary filter prevents future years and months including direct handler calls', () => {
  const ui = filterPicker({ currentMonth: 10 });
  const option = (label: string) =>
    ui.render().content.find((node) => node.props.accessibilityLabel === label);
  assert.equal(option('다음 연도 선택').props.disabled, true);
  option('다음 연도 선택').props.onPress();
  assert(option('2026년 전체'));
  assert.equal(option('2026년 10월').props.disabled, false);
  assert.equal(option('2026년 11월').props.disabled, true);
  assert.equal(option('2026년 12월').props.disabled, true);
  option('2026년 11월').props.onPress();
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, 0, null]]);
  ui.press('이전 연도 선택');
  assert.equal(option('2025년 12월').props.disabled, false);
  ui.press('2025년 12월');
  ui.press('다음 연도 선택');
  assert.equal(option('2026년 12월').props.selected, false);
  assert.equal(option('다음 연도 선택').props.disabled, true);
});

test('diary filter respects January and December boundaries and clears legacy future selections', () => {
  for (const currentMonth of [1, 12]) {
    const ui = filterPicker({ currentMonth });
    for (let month = 1; month <= 12; month++) {
      const option = ui
        .render()
        .content.find((node) => node.props.accessibilityLabel === `2026년 ${month}월`);
      assert.equal(option.props.disabled, month > currentMonth);
    }
  }
  for (const props of [
    { year: 2027, month: 1 },
    { year: 2026, month: 12 },
  ]) {
    const ui = filterPicker({ ...props, currentMonth: 10 });
    ui.press('일기 필터 적용');
    ui.finish();
    assert.deepEqual(ui.applied, [[props.year === 2027 ? null : 2026, 0, null]]);
  }
});

test('sober filter supports a three-month threshold through the shared footer', () => {
  const ui = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: false, minimumDays: 0 },
  });
  ui.press('현재 기록 3개월 이상');
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.applied)), [
    [{ priorityOnly: false, minimumDays: 90 }],
  ]);
});


test('picker checkbox accessibility announces checked state without changing ordinary options', () => {
  for (const selected of [false, true]) {
    const checkbox = picker('src/components/PickerOption.tsx', 'PickerOption', {
      selected,
      checkbox: true,
      accessibilityLabel: '봄',
    }).render().shell;
    assert.equal(checkbox.props.accessibilityRole, 'checkbox');
    assert.equal(checkbox.props.accessibilityState.checked, selected);
    const option = picker('src/components/PickerOption.tsx', 'PickerOption', {
      selected,
      accessibilityLabel: '일반 선택',
    }).render().shell;
    assert.equal(option.props.accessibilityRole, 'button');
    assert.equal(option.props.accessibilityState.selected, selected);
  }
});


test('emotion icon style cards share checked and unchecked appearance and remain single selection', () => {
  let changed = '';
  const ui = picker(
    'src/screens/settings/EmotionIconStyleSelector.tsx',
    'EmotionIconStyleSelector',
    { value: 'simple', disabled: false, onChange: (value: string) => (changed = value) },
  );
  const options = ui.render().content.filter((node) => node.props.accessibilityRole === 'radio');
  assert.equal(options.length, 3);
  assert.equal(options.filter((node) => node.props.accessibilityState.checked).length, 1);
  assert(options[1].props.className.includes('bg-theme-accent/10'));
  assert(options[0].props.className.includes('bg-theme-border-muted/40'));
  options[0].props.onPress();
  assert.equal(changed, 'basic');
});
