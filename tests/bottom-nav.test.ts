import { mockI18n } from './helpers/i18n';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import tokens from '../src/theme/tokens.json';
import { themeColors } from '../src/theme/colors';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const icons = [
  'HouseIcon',
  'CalendarDotsIcon',
  'BookOpenIcon',
  'CheckSquareIcon',
  'TimerIcon',
  'GearIcon',
];
const routes = ['index', 'calendar', 'diary', 'habit', 'sober', 'setting'].map((name) => ({
  name,
  key: `${name}-key`,
  params: { source: name },
}));
function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function loadAppIcon() {
  const exports: any = {};
  let interop: any;
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/AppIcon.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/i18n/react')) return mockI18n();
        if (name === 'react/jsx-runtime')
          return {
            jsx: (type: unknown, props: any) => ({ type, props }),
          };
        if (name === 'nativewind')
          return {
            cssInterop: (_component: unknown, options: any) => {
              interop = options;
            },
          };
        if (name.startsWith('phosphor-react-native/src/icons/')) {
          const icon = name.split('/').at(-1) + 'Icon';
          return { [icon]: icon };
        }
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return { AppIcon: exports.AppIcon, interop };
}
function render(os: 'ios' | 'android', index: number, rem = 15) {
  const colors = themeColors('blue', 'light');
  const height = os === 'ios' ? 64 : 58;
  const events: any[] = [];
  const navigations: any[] = [];
  let prevent = false;
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/BottomNav.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('/i18n/react')) return mockI18n();
        if (name === 'react/jsx-runtime') {
          const jsx = (type: any, props: any) =>
            typeof type === 'function' ? type(props) : { type, props };
          return { jsx, jsxs: jsx };
        }
        if (name === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            Platform: { OS: os, select: (options: any) => options[os] },
          };
        if (name === './AppIcon') return loadAppIcon();
        if (name.endsWith('/AppThemeProvider'))
          return {
            useAppTheme: () => ({ colors, rem, navigationHeight: height, navigationBottom: 25 }),
          };
        if (name.endsWith('/tokens.json')) return tokens;
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  const tree = exports.BottomNav({
    state: { index, routes },
    navigation: {
      emit: (event: any) => {
        events.push(event);
        return { defaultPrevented: prevent };
      },
      navigate: (...args: any[]) => navigations.push(args),
    },
  });
  return {
    tree,
    colors,
    height,
    events,
    navigations,
    prevent: () => {
      prevent = true;
    },
  };
}

for (const os of ['ios', 'android'] as const) {
  test(`${os} bottom navigation preserves press, cancellation, reselect and long-press behavior`, () => {
    for (const index of [0, 5]) {
      const ui = render(os, index);
      const tabs = nodes(ui.tree).filter((node) => node.type === 'Pressable');
      assert.equal(tabs.length, 6);
      tabs[index].props.onPress();
      assert.equal(ui.navigations.length, 0);
      assert.equal(ui.events[0].type, 'tabPress');
      const target = index === 0 ? 5 : 0;
      tabs[target].props.onPress();
      assert.deepEqual(ui.navigations[0], [routes[target].name, routes[target].params]);
      ui.prevent();
      tabs[target].props.onPress();
      assert.equal(ui.navigations.length, 1);
      tabs[target].props.onLongPress();
      assert.equal(ui.events.at(-1).type, 'tabLongPress');
      assert.equal(ui.events.at(-1).target, routes[target].key);
    }
  });

  test(`${os} navigation and settings share one surface and retain geometry across tabs and font sizes`, () => {
    for (const index of [0, 1, 5])
      for (const rem of [14, 15, 16]) {
        const ui = render(os, index, rem);
        const all = nodes(ui.tree);
        const surfaces = all.filter((node) =>
          /(?:^|\s)bg-theme-surface(?:\s|$)/.test(node.props.className ?? ''),
        );
        assert.equal(surfaces.length, 2);
        assert.equal(surfaces[0].props.className, surfaces[1].props.className);
        assert.doesNotMatch(surfaces[0].props.className, /overflow-hidden/);
        assert.match(surfaces[0].props.className, /(?:^|\s)bg-theme-surface(?:\s|$)/);
        assert.equal(ui.tree.props.style.bottom, 25);
        assert.deepEqual(surfaces[0].props.style, surfaces[1].props.style[0]);
        assert.equal(surfaces[1].props.style[1].width, ui.height);
        assert.equal(surfaces[1].props.style[1].height, ui.height);
        const borders = all.filter((node) =>
          /(?:^|\s)border(?:\s|$)/.test(node.props.className ?? ''),
        );
        assert.equal(borders.length, 2);
        assert.equal(
          borders[0].props.className.match(/border-theme-\S+/)?.[0],
          borders[1].props.className.match(/border-theme-\S+/)?.[0],
        );
        assert.equal(borders[0].props.children.props.style.height, ui.height);
        const tabs = all.filter((node) => node.type === 'Pressable');
        assert.equal(
          tabs[0].props.style.width,
          (tokens.metrics.navigation.itemWidth * ui.height) / 64,
        );
        const renderedIcons = all.filter((node) => icons.includes(node.type));
        assert.deepEqual(
          renderedIcons.map((node) => node.type),
          icons,
        );
        renderedIcons.forEach((node, position) => {
          assert(node.props.size >= 22 && node.props.size <= 24);
          assert.equal(node.props.size, renderedIcons[0].props.size);
          assert.equal(node.props.weight, 'fill');
          assert.equal(
            node.props.color,
            position === index ? ui.colors.textOnAccent : `${ui.colors.accent}CC`,
          );
          assert.equal(tabs[position].props.accessibilityState.selected, position === index);
        });
        if (os === 'ios') assert.equal(surfaces[0].props.style.shadowOpacity, 0.1);
        else assert.equal(surfaces[0].props.style.elevation, 3);
      }
  });
}

test('shared navigation icons preserve screen size, color, style and accessibility props', () => {
  const { AppIcon, interop } = loadAppIcon();
  const names = ['home', 'calendar', 'diary', 'habit', 'sober', 'settings'];
  for (const [index, name] of names.entries())
    for (const size of [13.125, 18.75, 33.75]) {
      const style = { opacity: 0.6, marginTop: 2 };
      const tree = AppIcon({
        name,
        size,
        color: '#83C6B6',
        style,
        accessibilityLabel: '기록',
        testID: 'record-icon',
      });
      assert.equal(tree.type, icons[index]);
      assert.equal(tree.props.size, size);
      assert.equal(tree.props.color, '#83C6B6');
      assert.equal(tree.props.weight, 'fill');
      assert.equal(tree.props.style, style);
      assert.equal(tree.props.accessibilityLabel, '기록');
      assert.equal(tree.props.testID, 'record-icon');
    }
  assert.equal(interop.className.target, 'style');
  assert.equal(interop.className.nativeStyleToProp.color, true);
});

test('line icons use bold while filled icons retain their weights', () => {
  const { AppIcon } = loadAppIcon();
  for (const [name, type, weight] of [
    ['habit', 'CheckSquareIcon', 'fill'],
    ['check', 'CheckIcon', 'bold'],
    ['close', 'XIcon', 'bold'],
    ['habit-flow', 'ChartLineIcon', 'bold'],
    ['habit-rate', 'PercentIcon', 'bold'],
    ['chevron-left', 'CaretLeftIcon', 'bold'],
    ['chevron-right', 'CaretRightIcon', 'bold'],
    ['today', 'CalendarDotIcon', 'bold'],
    ['add', 'PlusIcon', 'bold'],
    ['filter-list', 'FunnelSimpleIcon', 'bold'],
    ['more-vert', 'DotsThreeVerticalIcon', 'bold'],
    ['low-priority', 'ListNumbersIcon', 'bold'],
    ['edit', 'PencilSimpleIcon', 'fill'],
    ['delete-outline', 'TrashIcon', 'fill'],
    ['auto-awesome', 'SparkleIcon', 'fill'],
  ]) {
    const icon = AppIcon({ name, size: 18, color: '#8CADE2' });
    assert.equal(icon.type, type);
    assert.equal(icon.props.weight, weight);
    assert.equal(icon.props.size, 18);
    assert.equal(icon.props.color, '#8CADE2');
  }
});
