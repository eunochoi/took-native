import { mockI18n } from './helpers/i18n';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, JsxEmit, ModuleKind } from 'typescript';
import { adjustColorBrightness } from '../src/theme/colors';
import { HABIT_ICON_COLORS, isHabitIconColor, resolveIconColor } from '../src/domain/constants';

function nodes(node: any): any[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  return [node, ...nodes(node.props?.children)];
}

test('color picker combines theme and eleven colors in equal-height four-column rows and defers apply until close', () => {
  let draft = 'theme';
  let deferred: (() => void) | undefined;
  const applied: string[] = [];
  const theme = { colors: { accent: '#123456' }, rem: 15 };
  const exports: any = {};
  const jsx = (type: any, props: any, key?: string) => ({ type, props, key });
  runInNewContext(
    transpileModule(
      readFileSync(new URL('../src/components/IconColorPicker.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS },
      },
    ).outputText,
    {
      exports,
      require(name: string) {
        if (name.endsWith('/i18n/react')) return mockI18n();
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useState: () => [
              draft,
              (value: string) => {
                draft = value;
              },
            ],
          };
        if (name === 'react-native') return { View: 'View' };
        if (name.endsWith('/theme/colors')) return { adjustColorBrightness };
        if (name.endsWith('/constants')) return { HABIT_ICON_COLORS };
        if (name.endsWith('/AppThemeProvider')) return { useAppTheme: () => theme };
        const component = name.split('/').at(-1)!;
        return { [component]: component };
      },
    },
  );
  const render = () => {
    const shell = exports.IconColorPicker({
      value: 'theme',
      onApply: (key: string) => applied.push(key),
      onClose() {},
    });
    const list = shell.props.renderScrollView({ ref() {}, onScroll: 'sheet-scroll' });
    list.props.children = list.props.data.map((item: string) => list.props.renderItem({ item }));
    return { ...shell, props: { ...shell.props, children: list } };
  };
  let tree = render();
  const options = () => nodes(tree).filter((node) => node.type === 'PickerOption');
  const grid = tree.props.children;
  assert.equal(grid.props.numColumns, 4);
  assert.equal(grid.props.data.length, 12);
  assert.equal(grid.props.columnWrapperClassName, 'gap-1');
  assert(grid.props.contentContainerClassName.includes('gap-1'));
  assert.equal(grid.props.onScroll, 'sheet-scroll');
  assert(grid.props.children.every((node: any) => node.props.className === 'flex-1 min-w-0'));
  assert(options().every((node) => node.props.className.includes('aspect-')));
  assert.equal(options().length, 12);
  assert.equal(options()[0].props.accessibilityLabel, '기본');
  assert.equal(options()[0].props.selected, true);
  assert(options().every((node) => node.props.className === options()[0].props.className));
  assert.equal(
    nodes(options()[0]).find((node) => node.props?.style?.backgroundColor)?.props.style
      .backgroundColor,
    theme.colors.accent,
  );
  options()
    .find((node) => node.props.accessibilityLabel === '모카')
    .props.onPress();
  tree = render();
  assert.equal(
    options().find((node) => node.props.accessibilityLabel === '모카').props.selected,
    true,
  );
  assert.deepEqual(applied, []);
  tree.props
    .footer((action: () => void) => {
      deferred = action;
    })
    .props.onPress();
  assert.deepEqual(applied, []);
  deferred?.();
  assert.deepEqual(applied, ['mocha']);
  assert(isHabitIconColor('mocha'));
  assert.equal(resolveIconColor('mocha', theme.colors.accent), '#B99E8C');
});
