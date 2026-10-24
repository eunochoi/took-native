import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
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
        if (dependency.endsWith('/HabitPriorityPicker'))
          return { HABIT_PRIORITY_LABELS: ['자유 기록', '낮음', '보통', '높음'] };
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
        if (dependency.endsWith('domain/diaryFilters'))
          return require('../src/domain/diaryFilters');
        if (dependency === 'tailwind-merge') return require(dependency);
        if (dependency.endsWith('theme/classes')) return require('../src/theme/classes');
        if (dependency.endsWith('domain/selection')) return require('../src/domain/selection');
        if (dependency === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
        if (dependency === 'react')
          return {
            Fragment: 'Fragment',
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
      onApply: (...values: unknown[]) => applied.push(JSON.parse(JSON.stringify(values))),
    });
    if (typeof shell.type === 'function') shell = shell.type(shell.props);
    const close = (action?: () => void) => {
      closed++;
      deferred = action;
    };
    const nestedContent = nodes(shell)
      .filter((node) => node !== shell && typeof node.props?.children === 'function')
      .map((node) =>
        node.props.children((action?: () => void) => {
          node.props.onClose?.();
          action?.();
        }),
      );
    return {
      shell,
      content: nodes([
        ...nestedContent,
        shell.props.headerAction,
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
    seasons: [],
    emotionGroups: [],
    currentYear: 2026,
    yearsQuery: {
      data: [2026, 2025, 1900],
      isPending: false,
      isError: false,
      error: null,
      refetch: () => {},
    },
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
  assert.equal(choices[0].props.accessibilityLabel, '중요한 항목 먼저');
  ui.press('과거순');
  ui.press('중요한 항목 먼저');
  assert.equal(ui.applied.length, 0);
  ui.press('적용하기');
  assert.equal(ui.closed, 1);
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [['ASC', true]]);
});

test('custom order clears priority and never applies a conflicting combination', () => {
  const ui = sortPicker({ priorityFirst: true, allowCustom: true });
  ui.press('커스텀');
  const priority = ui
    .render()
    .content.find((node) => node.props.accessibilityLabel === '중요한 항목 먼저');
  assert(!priority.props.disabled);
  assert.equal(priority.props.value, false);
  ui.press('적용하기');
  ui.finish();
  assert.deepEqual(ui.applied, [['CUSTOM', false]]);
});

test('enabling priority from custom selects latest order and applies only after closing', () => {
  const ui = sortPicker({ sort: 'CUSTOM', priorityFirst: false, allowCustom: true });
  ui.press('중요한 항목 먼저');
  const content = ui.render().content;
  assert.equal(
    content.find((node) => node.props.accessibilityLabel === '최신순').props.selected,
    true,
  );
  assert.equal(
    content.find((node) => node.props.accessibilityLabel === '커스텀').props.selected,
    false,
  );
  assert.equal(content.find((node) => node.type === 'Switch').props.value, true);
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [['DESC', true]]);
});

test('sort hints describe the actual criteria and custom restriction without persisting canceled drafts', () => {
  const ui = sortPicker({ sort: 'CUSTOM', priorityFirst: false, allowCustom: true });
  ui.press('중요한 항목 먼저');
  assert(
    ui
      .render()
      .content.some(
        (node) =>
          node.type === 'InfoNotice' &&
          node.props.children === '중요한 항목부터, 생성일 순으로 정렬해요.',
      ),
  );
  ui.render().shell.props.onClose();
  ui.finish();
  assert.equal(ui.applied.length, 0);
  for (const [props, hint] of [
    [{ sortLabel: '날짜 정렬' }, '날짜 순으로 정렬해요.'],
    [{ sortLabel: '다시 시작 일시 정렬' }, '다시 시작 일시 순으로 정렬해요.'],
    [{ priorityFirst: false }, '생성일 순으로 정렬해요.'],
    [{ priorityFirst: false, recordSort: 'DESC' }, '현재 기록, 생성일 순으로 정렬해요.'],
    [{ priorityFirst: true, recordSort: 'DESC' }, '중요도, 현재 기록, 생성일 순으로 정렬해요.'],
  ] as const) {
    assert(
      sortPicker(props)
        .render()
        .content.some((node) => node.type === 'InfoNotice' && node.props.children === hint),
    );
  }
});

test('diary sorting exposes date order only and cancel does not persist drafts', () => {
  const ui = sortPicker({});
  assert(
    !ui
      .render()
      .content.some((node) =>
        ['중요한 항목 먼저', '커스텀'].includes(node.props.accessibilityLabel),
      ),
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

test('year, season and emotion apply together only after closing', () => {
  const ui = filterPicker();
  chooseDiaryYear(ui, 2025);
  ui.press('겨울');
  ui.press('긍정');
  assert.equal(ui.applied.length, 0);
  ui.press('일기 필터 적용');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [[2025, ['winter'], ['positive']]]);
});

test('selecting all years preserves independent seasons and cancel preserves saved conditions', () => {
  const ui = filterPicker({ year: 2025, seasons: ['summer'], emotionGroups: ['positive'] });
  chooseDiaryYear(ui, null);
  ui.press('긍정');
  ui.render().shell.props.onClose();
  ui.finish();
  assert.equal(ui.applied.length, 0);
  const applied = filterPicker({ year: 2025, seasons: ['summer'], emotionGroups: ['positive'] });
  chooseDiaryYear(applied, null);
  applied.press('일기 필터 적용');
  applied.finish();
  assert.deepEqual(applied.applied, [[null, ['summer'], ['positive']]]);
});

test('header reset clears all diary drafts without applying until confirmation', () => {
  const ui = filterPicker({ year: 2025, seasons: ['winter'], emotionGroups: ['negative'] });
  const view = ui.render();
  assert(
    nodes(view.shell.props.headerAction).some(
      (node) => node.props.accessibilityLabel === '선택 초기화',
    ),
  );
  assert.equal(view.shell.props.title, '일기 필터');
  assert(
    !nodes(view.shell.props.children).some(
      (node) => node.props.accessibilityRole === 'header' && node.props.children === '일기 필터',
    ),
  );
  assert(
    !nodes(view.shell.props.footer(() => {})).some(
      (node) => node.props.accessibilityLabel === '선택 초기화',
    ),
  );
  ui.press('선택 초기화');
  assert.equal(ui.applied.length, 0);
  assert(
    ui
      .render()
      .content.some((node) => node.type === 'FormPickerRow' && node.props.label === '전체 연도'),
  );
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, [], []]]);
});

test('sort hints share the content gap without reserving an extra fixed-height row', () => {
  const ui = sortPicker({ priorityFirst: false, allowCustom: true });
  const initial = ui.render().shell.props.children;
  assert.equal(initial.props.className, 'gap-7');
  assert.equal(initial.props.children.at(-1).props.className, 'gap-1');
  ui.press('커스텀');
  const custom = ui.render().shell.props.children;
  assert.equal(custom.props.className, initial.props.className);
  const hints = nodes(custom).filter((node) => node.type === 'InfoNotice');
  assert.deepEqual(
    hints.map((node) => node.props.children),
    ['직접 정한 순서로 보여드려요.', '커스텀과 중요도 우선은 함께 선택할 수 없어요.'],
  );
});

test('diary emotion descriptions live inside buttons and the full season legend stays fixed', () => {
  const ui = filterPicker();
  const text = () =>
    ui
      .render()
      .content.filter((node) => node.type === 'Text' || node.type === 'InfoNotice')
      .map((node) => node.props.children);
  for (const [label, description] of [
    ['긍정', '행복, 기쁨\n사랑, 평온'],
    ['중립', '놀람, 무심'],
    ['부정', '불안, 슬픔\n화남, 혼란'],
  ]) {
    const option = ui
      .render()
      .content.find(
        (node) => node.type === 'PickerOption' && node.props.accessibilityLabel === label,
      );
    assert(nodes(option).some((node) => node.props.children === description));
    assert.equal(option.props.dense, true);
  }
  ui.press('여름');
  assert(text().includes('여름'));
  const seasonLegend = '봄 3~5월, 여름 6~8월, 가을 9~11월, 겨울 12~다음 2월';
  assert(text().includes(seasonLegend));
  chooseDiaryYear(ui, 2026);
  ui.press('겨울');
  assert(text().includes('여름 · 겨울'));
  const hint = ui.render().content.find((node) => node.props.children === seasonLegend);
  assert.equal(hint.type, 'InfoNotice');
  assert(!text().some((value) => typeof value === 'string' && value.includes('2027.02')));
  assert(!text().some((value) => typeof value === 'string' && value.includes('겨울은')));
  ui.press('여름');
  ui.press('겨울');
  chooseDiaryYear(ui, null);
  assert(ui.render().content.some((node) => node.props.label === '전체 연도'));
  assert(text().includes('전체 계절'));
});

test('all filters keep reset in the header and apply in the footer', () => {
  const diary = filterPicker().render();
  const choices = diary.content.filter((node) => node.type === 'PickerOption');
  for (const label of ['긍정', '중립', '부정', '봄', '여름', '가을', '겨울']) {
    assert(choices.some((node) => node.props.accessibilityLabel === label));
  }
  assert(!diary.content.some((node) => node.type === 'EmotionImage'));
  assert(choices.every((node) => node.props.compact));
  for (const ui of [
    picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
      filter: { completedOnly: false, priorities: [] },
    }),
    picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
      filter: { priorityOnly: false, minimumDays: 0 },
    }),
  ]) {
    const view = ui.render();
    assert(
      nodes(view.shell.props.headerAction).some(
        (node) => node.props.accessibilityLabel === '선택 초기화',
      ),
    );
    assert(
      !nodes(view.shell.props.footer(() => {})).some(
        (node) => node.props.accessibilityLabel === '선택 초기화',
      ),
    );
  }
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
  assert(view.content.some((node) => node.type === 'Text' && node.props.children === '중요'));
  assert.equal(view.content.filter((node) => node.type === 'StarIcon').length, 0);
  assert.equal(view.content.find((node) => node.type === 'AppIcon').props.name, 'sort');
  ui.press('습관 정렬, 중요한 항목 먼저 · 생성일 최신순');
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
  assert.equal(custom.content.find((node) => node.type === 'AppIcon').props.name, 'sort');
  assert(custom.content.some((node) => node.type === 'Text' && node.props.children === '커스텀'));
});

test('filter toolbar displays its supplied compact and accessible labels', () => {
  const view = picker('src/components/ToolbarFilterButton.tsx', 'ToolbarFilterButton', {
    label: '올해 · 여름 · 긍정',
    accessibilityLabel: '일기 필터, 2026.06~2026.08 · 긍정',
  }).render();
  const label = view.content.find(
    (node) => node.type === 'Text' && node.props.children === '올해 · 여름 · 긍정',
  );
  assert.equal(label.props.numberOfLines, 1);
  assert.equal(label.props.ellipsizeMode, 'tail');
  assert.equal(view.shell.props.accessibilityLabel, '일기 필터, 2026.06~2026.08 · 긍정');
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
  ui.press('중요한 항목 먼저');
  ui.press('현재 기록 짧은 기록순');
  ui.press('과거순');
  assert.equal(ui.applied.length, 0);
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [['ASC', true, 'ASC']]);
  const cancelled = sortPicker({ priorityFirst: true, recordSort: 'DESC' });
  cancelled.press('현재 기록 짧은 기록순');
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
    '거리두기 항목 정렬, 중요한 항목 먼저 · 현재 기록 긴 기록순 · 생성일 과거순',
  );
});

test('toolbar always keeps its sort icon and shows every non-default condition with ellipsis', () => {
  const cases = [
    { sort: 'DESC', priorityFirst: false, label: '정렬' },
    { sort: 'ASC', priorityFirst: false, label: '과거' },
    { sort: 'DESC', priorityFirst: true, label: '중요' },
    { sort: 'ASC', priorityFirst: true, label: '중요 · 과거' },
    { sort: 'DESC', recordSort: 'DESC', priorityFirst: false, label: '정렬' },
    { sort: 'ASC', recordSort: 'DESC', priorityFirst: false, label: '과거' },
    { sort: 'DESC', recordSort: 'DESC', priorityFirst: true, label: '중요' },
    {
      sort: 'ASC',
      recordSort: 'DESC',
      priorityFirst: true,
      label: '중요 · 과거',
    },
    {
      sort: 'DESC',
      recordSort: 'ASC',
      priorityFirst: false,
      label: '짧은 기록',
    },
    {
      sort: 'ASC',
      recordSort: 'ASC',
      priorityFirst: false,
      label: '짧은 기록 · 과거',
    },
    {
      sort: 'DESC',
      recordSort: 'ASC',
      priorityFirst: true,
      label: '중요 · 짧은 기록',
    },
    {
      sort: 'ASC',
      recordSort: 'ASC',
      priorityFirst: true,
      label: '중요 · 짧은 기록 · 과거',
    },
    { sort: 'CUSTOM', priorityFirst: false, label: '커스텀' },
    { sort: 'CUSTOM', priorityFirst: true, label: '커스텀' },
  ];
  for (const { label, ...props } of cases) {
    const ui = picker('src/components/ToolbarSortButton.tsx', 'ToolbarSortButton', {
      ...props,
      accessibilityLabel: '정렬',
    }).render();
    const indicators = ui.content.filter((node) =>
      ['Text', 'StarIcon', 'AppIcon'].includes(node.type),
    );
    assert.deepEqual(
      indicators.map((node) => (node.type === 'AppIcon' ? node.props.name : node.props.children)),
      ['sort', label],
    );
    const text = indicators[1];
    assert.equal(text.props.numberOfLines, 1);
    assert.equal(text.props.ellipsizeMode, 'tail');
    assert(ui.shell.props.className.includes('min-w-0 shrink'));
    assert(text.props.className.includes('min-w-0 shrink'));
    assert(indicators[0].props.className.includes('shrink-0'));
  }
});

test('sort modal defaults are leftmost', () => {
  const sort = sortPicker({ priorityFirst: false, recordSort: 'DESC', allowCustom: true }).render();
  const choices = sort.content.filter((node) => node.type === 'PickerOption');
  assert.deepEqual(
    choices.map((node) => node.props.accessibilityLabel),
    ['현재 기록 긴 기록순', '현재 기록 짧은 기록순', '최신순', '과거순', '커스텀'],
  );
  assert.equal(choices[0].props.selected, true);
  assert.equal(choices[2].props.selected, true);
});

test('canceling the year picker leaves an all-year seasonal filter unchanged', () => {
  const ui = filterPicker();
  ui.press('연도 선택');
  ui.render()
    .content.find((node) => node.type === 'BottomSheetModal' && node.props.title === '연도 선택')
    .props.onClose();
  ui.press('봄');
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, ['spring'], []]]);
});

test('habit filter combines completed-only with multiple priorities and resets all drafts', () => {
  const ui = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completedOnly: false, priorities: [] },
  });
  const choices = ui.render().content.filter((node) => node.type === 'PickerOption');
  assert.deepEqual(
    choices.map((node) => node.props.accessibilityLabel),
    ['자유 기록', '별표 1개', '별표 2개', '별표 3개'],
  );
  assert(choices.every((node) => node.props.checkbox));
  ui.press('완료한 항목만 보기');
  ui.press('별표 1개');
  ui.press('별표 2개');
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(ui.applied, [[{ completedOnly: true, priorities: [1, 2] }]]);
  const reset = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completedOnly: true, priorities: [2] },
  });
  reset.press('선택 초기화');
  reset.press('적용하기');
  reset.finish();
  assert.deepEqual(reset.applied, [[{ completedOnly: false, priorities: [] }]]);
});

test('sober filters draft importance and one minimum period, with cancel and reset', () => {
  const ui = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: false, minimumDays: 0 },
  });
  assert(!ui.render().content.some((node) => node.type === 'PickerOption'));
  ui.press('중요한 항목만 보기');
  ui.press('최소 유지 기간 선택');
  ui.press('현재 기록 1주 이상');
  ui.press('최소 유지 기간 선택');
  ui.press('현재 기록 2주 이상');
  assert(!ui.render().content.some((node) => node.type === 'PickerOption'));
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

test('diary year list includes only recorded years plus all years and marks one selection', () => {
  const ui = filterPicker({ year: 2025 });
  ui.press('연도 선택');
  const choices = ui
    .render()
    .content.filter((node) => node.type === 'PickerOption' && !node.props.checkbox);
  assert.equal(choices.length, 4);
  assert.equal(choices[0].props.accessibilityLabel, '전체 연도');
  assert.equal(choices[1].props.accessibilityLabel, '2026년');
  assert.equal(choices.at(-1).props.accessibilityLabel, '1900년');
  assert.equal(choices.filter((node) => node.props.selected).length, 1);
  assert.equal(choices.find((node) => node.props.selected).props.accessibilityLabel, '2025년');
  ui.press('1900년');
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[1900, [], []]]);
});

test('future input years clear without dropping an independent season', () => {
  const ui = filterPicker({ year: 2027, seasons: ['winter'] });
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, ['winter'], []]]);
});

test('sober filter supports a three-month threshold through the shared footer', () => {
  const ui = picker('src/screens/sober/SoberFilterPicker.tsx', 'SoberFilterPicker', {
    filter: { priorityOnly: false, minimumDays: 0 },
  });
  ui.press('최소 유지 기간 선택');
  ui.press('현재 기록 3개월 이상');
  ui.press('적용하기');
  assert.equal(ui.applied.length, 0);
  ui.finish();
  assert.deepEqual(JSON.parse(JSON.stringify(ui.applied)), [
    [{ priorityOnly: false, minimumDays: 90 }],
  ]);
});

test('diary checkbox selections combine, toggle off independently and preserve canonical order', () => {
  const ui = filterPicker();
  const options = () =>
    ui.render().content.filter((node) => node.type === 'PickerOption' && node.props.checkbox);
  assert.equal(options().length, 7);
  assert(options().every((node) => !node.props.selected));
  assert(!ui.render().content.some((node) => node.props.accessibilityLabel === '전체'));
  chooseDiaryYear(ui, 2026);
  chooseDiaryYear(ui, null);
  ui.press('여름');
  ui.press('봄');
  ui.press('부정');
  ui.press('긍정');
  ui.press('중립');
  ui.press('부정');
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, ['spring', 'summer'], ['positive', 'neutral']]]);
  const reopened = filterPicker({
    year: 2026,
    seasons: ['spring', 'summer'],
    emotionGroups: ['positive', 'neutral'],
  });
  assert(
    reopened.render().content.find((node) => node.props.accessibilityLabel === '봄').props.selected,
  );
  chooseDiaryYear(reopened, null);
  for (const label of ['봄', '여름', '긍정', '중립']) reopened.press(label);
  reopened.press('일기 필터 적용');
  reopened.finish();
  assert.deepEqual(reopened.applied, [[null, [], []]]);
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

test('all checked diary categories summarize as all while retaining checked cards', () => {
  const ui = filterPicker();
  for (const label of ['봄', '여름', '가을', '겨울', '긍정', '중립', '부정']) ui.press(label);
  const view = ui.render();
  const text = view.content
    .filter((node) => node.type === 'Text')
    .map((node) => node.props.children);
  assert(text.includes('전체 계절'));
  assert(text.includes('전체 감정'));
  assert.equal(
    view.content.filter((node) => node.type === 'PickerOption' && node.props.selected).length,
    7,
  );
  ui.press('겨울');
  assert(
    ui
      .render()
      .content.some(
        (node) =>
          typeof node.props.children === 'string' && node.props.children === '봄 · 여름 · 가을',
      ),
  );
});

test('all checked habit priorities summarize as all and can be deselected individually', () => {
  const ui = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completedOnly: false, priorities: [] },
  });
  for (const label of ['자유 기록', '별표 1개', '별표 2개', '별표 3개']) ui.press(label);
  assert(
    ui.render().content.some((node) => node.type === 'Text' && node.props.children === '전체'),
  );
  ui.press('별표 2개');
  ui.press('적용하기');
  ui.finish();
  assert.deepEqual(ui.applied, [[{ completedOnly: false, priorities: [0, 1, 3] }]]);
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
  assert(options[1].props.className.includes('bg-theme-accent-light/50'));
  assert(options[0].props.className.includes('bg-transparent'));
  assert(options[0].props.className.includes('border-theme-border'));
  options[0].props.onPress();
  assert.equal(changed, 'basic');
});

function chooseDiaryYear(ui: ReturnType<typeof picker>, year: number | null) {
  ui.press('연도 선택');
  ui.press(year === null ? '전체 연도' : `${year}년`);
}

test('diary year picker retains all-years for empty, loading and failed queries', () => {
  for (const yearsQuery of [
    { data: [], isPending: false, isError: false, error: null, refetch: () => {} },
    { data: undefined, isPending: true, isError: false, error: null, refetch: () => {} },
    {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('실패'),
      refetch: () => {},
    },
  ]) {
    const ui = filterPicker({ yearsQuery });
    ui.press('연도 선택');
    const choices = ui
      .render()
      .content.filter((node) => node.type === 'PickerOption' && !node.props.checkbox);
    assert.equal(choices.length, 1);
    assert.equal(choices[0].props.accessibilityLabel, '전체 연도');
    assert.equal(
      ui.render().content.find((node) => node.type === 'QueryState').props.query,
      yearsQuery,
    );
    ui.press('전체 연도');
    ui.press('일기 필터 적용');
    ui.finish();
    assert.deepEqual(ui.applied, [[null, [], []]]);
  }
});

test('a removed diary year becomes all years on the next filter application without changing other filters', () => {
  const ui = filterPicker({
    year: 2025,
    seasons: ['summer'],
    emotionGroups: ['neutral'],
    yearsQuery: { data: [2024], isPending: false, isError: false, error: null, refetch: () => {} },
  });
  assert(
    ui
      .render()
      .content.some((node) => node.type === 'FormPickerRow' && node.props.label === '전체 연도'),
  );
  ui.press('일기 필터 적용');
  ui.finish();
  assert.deepEqual(ui.applied, [[null, ['summer'], ['neutral']]]);
});

test('habit priority picker has four choices in two rows and explains exclusion', () => {
  const ui = picker('src/screens/habit/HabitPriorityPicker.tsx', 'HabitPriorityPicker', {
    value: 1,
  });
  const view = ui.render();
  const options = view.content.filter((node) => node.type === 'PickerOption');
  assert.deepEqual(
    options.map((node) => node.props.accessibilityLabel),
    ['없음 · 자유 기록', '낮음 · 매일 기록', '보통 · 매일 기록', '높음 · 매일 기록'],
  );
  const gridRows = view.content.filter(
    (node) => node.type === 'View' && node.props.className === 'flex-row gap-3',
  );
  assert.equal(gridRows.length, 2);
  assert(gridRows.every((row) => row.props.children.length === 2));
  ui.press('없음 · 자유 기록');
  assert(
    ui
      .render()
      .content.some(
        (node) =>
          node.props.children === '자유 기록 항목은 완료율과 달성 개수 계산에 포함되지 않아요.',
      ),
  );
  ui.press('선택 완료');
  ui.finish();
  assert.deepEqual(ui.applied, [[0]]);
});

test('habit filter places exclusion and stars in a two-by-two grid', () => {
  const ui = picker('src/screens/habit/HabitFilterPicker.tsx', 'HabitFilterPicker', {
    filter: { completedOnly: false, priorities: [] },
  });
  const gridRows = ui
    .render()
    .content.filter((node) => node.type === 'View' && node.props.className === 'flex-row gap-3');
  assert.equal(gridRows.length, 2);
  assert(gridRows.every((row) => row.props.children.length === 2));
  ui.press('자유 기록');
  ui.press('별표 3개');
  ui.press('적용하기');
  ui.finish();
  assert.deepEqual(ui.applied, [[{ completedOnly: false, priorities: [0, 3] }]]);
});
