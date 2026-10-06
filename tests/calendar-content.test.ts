import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function evaluate(source: string, globals: Record<string, any> = {}) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      ...globals,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'date-fns') return require('date-fns');
        if (name === 'react-native') return { Pressable: 'Pressable', View: 'View' };
        return { Text: 'Text' };
      },
    },
  );
  return exports;
}
// Execute the real inline render callback, including JSX, without mounting the detail screen's DB hooks.
function dayRenderer(file: string, globals: Record<string, any>) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression: any;
  function visit(node: any) {
    if (ts.isJsxAttribute(node) && node.name.text === 'renderDay')
      expression = node.initializer.expression;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(expression);
  return evaluate(`exports.render = ${expression.getText(ast)};`, {
    CalendarDay: 'CalendarDay',
    View: 'View',
    Text: 'Text',
    SoberIcon: 'SoberIcon',
    EmotionImage: 'EmotionImage',
    OrganicBadge: 'OrganicBadge',
    ...globals,
  }).render;
}
function nodes(tree: any): any[] {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...[tree.props?.children].flat().flatMap(nodes)];
}
const day = {
  date: '2026-10-05',
  outside: false,
  selected: false,
  today: true,
  disabled: false,
  onSelect: () => {},
};

test('common date cell renders supplied content, preserving accessibility, disabled state and today marker', () => {
  const { CalendarDay } = evaluate(
    readFileSync(new URL('../src/screens/calendar/CalendarDay.tsx', import.meta.url), 'utf8'),
  );
  const children = jsx('CustomDay', {});
  const tree = CalendarDay({
    ...day,
    children,
    label: `${day.date}, 다시 시작 2회`,
    disabled: true,
    selected: true,
    showSelectedIndicator: false,
  });
  assert.equal(tree.props.children[0], children);
  assert.equal(tree.props.disabled, true);
  assert.equal(tree.props.onPress, day.onSelect);
  assert.equal(tree.props.accessibilityState.selected, true);
  assert.equal(tree.props.accessibilityLabel, `${day.date}, 다시 시작 2회, 오늘`);
  assert.equal(nodes(tree).filter((node) => node.props.className?.includes('h-1.5 w-4')).length, 1);
  assert.equal(
    nodes(tree).filter((node) => node.props.className?.includes('h-1.5 w-1.5')).length,
    0,
  );
  const plain = CalendarDay(day);
  assert.equal(plain.props.children[0].type, 'Text');
  assert.equal(plain.props.children[0].props.children, 5);
});

test('Sober calendar shows only a centered restart-count badge on restart dates', () => {
  const render = dayRenderer('../app/sober/[id]/index.tsx', {
    sober: { icon_key: 'favorite', icon_color: 'lavender' },
    grouped: new Map([[day.date, [{ id: 1 }, { id: 2 }]]]),
  });
  const tree = render(day);
  const content = nodes(tree);
  assert(!content.some((node) => node.type === 'SoberIcon'));
  const badge = content.find((node) => node.props.className?.includes('bg-theme-accent'));
  assert.equal(badge.props.children.type, 'Text');
  assert.equal(badge.props.children.props.children, 2);
  assert.equal(tree.props.children, badge);
  assert.equal(tree.props.label, `${day.date}, 다시 시작 2회`);
  assert.equal(tree.props.showSelectedIndicator, false);
  assert.equal(render({ ...day, date: '2026-10-04' }).props.children, undefined);
  assert.equal(render({ ...day, outside: true }).props.children, undefined);
  assert.equal(render({ ...day, disabled: true }).props.disabled, true);
});

test('monthly diary calendar retains emotion + habit badge, badge-only styling and plain date fallback', () => {
  const render = dayRenderer('../src/screens/calendar/DiaryHabitMonthCalendar.tsx', {
    diaryByDate: new Map([[day.date, { emotion: 0, created_at: '2026-10-05T00:00:00Z' }]]),
    counts: new Map([
      [day.date, 3],
      ['2026-10-04', 1],
    ]),
    EMOTIONS: [{ name: '행복' }],
  });
  const tree = render(day);
  const content = nodes(tree);
  const emotion = content.find((node) => node.type === 'EmotionImage');
  assert.equal(emotion.props.emotion, 0);
  assert.equal(emotion.props.fill, true);
  assert.equal(emotion.props.size, undefined);
  const badge = content.find((node) => node.type === 'OrganicBadge');
  assert.equal(badge.props.children, 3);
  assert.equal(badge.props.className, 'absolute -top-1 -right-2');
  assert.equal(badge.props.tone, 'calendar');
  assert.match(tree.props.label, /일기 있음, 행복/);
  const badgeOnly = render({ ...day, date: '2026-10-04' });
  assert.match(badgeOnly.props.children.props.className, /scale-\[1.2\]/);
  assert.equal(nodes(badgeOnly).find((node) => node.type === 'OrganicBadge').props.className, '');
  assert.equal(render({ ...day, date: '2026-10-03' }).props.children, undefined);
  assert.equal(render({ ...day, outside: true }).props.children, undefined);
});
