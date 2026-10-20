import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { transpileModule, JsxEmit, ModuleKind } from 'typescript';
import * as constants from '../src/domain/constants';
import { SOBER_ICONS } from '../src/domain/sober';

const require = createRequire(import.meta.url);

test('habit options use distinct supported icons and meaningful labels', () => {
  const glyphs = {
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
  };
  assert.equal(constants.HABIT_ICON_OPTIONS.length, 50);
  assert.deepEqual(
    constants.HABIT_ICON_OPTIONS.map(({ key }) => key),
    Object.keys(constants.HABIT_ICONS),
  );
  const icons = constants.HABIT_ICON_OPTIONS.map(({ key, label }) => {
    assert(label.trim());
    const icon = constants.HABIT_ICONS[key];
    return `${icon.family}:${icon.name}`;
  });
  assert.equal(new Set(icons).size, icons.length);
  for (const icon of Object.values(constants.HABIT_ICONS))
    assert(icon.name in glyphs[icon.family], icon.name);
});

function loadIcon(path: string, modules: Record<string, any> = {}) {
  const exports: any = {};
  runInNewContext(
    transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name in modules) return modules[name];
        if (name === 'react/jsx-runtime') {
          const jsx = (type: unknown, props: any) => ({ type, props });
          return { jsx, jsxs: jsx };
        }
        if (name.startsWith('phosphor-react-native/src/icons/')) {
          const icon = name.split('/').at(-1) + 'Icon';
          return { [icon]: icon };
        }
        if (name === '@expo/vector-icons')
          return { MaterialCommunityIcons: 'MaterialCommunityIcons' };
        if (name === 'react') return { useId: () => 'mask' };
        if (name === 'react-native-svg')
          return {
            __esModule: true,
            default: 'Svg',
            Circle: 'Circle',
            Defs: 'Defs',
            Mask: 'Mask',
            Text: 'SvgText',
          };
        if (name === 'nativewind') return { cssInterop() {} };
        if (name.endsWith('/recordIcons')) return loadIcon('src/components/recordIcons.ts');
        if (name.endsWith('/constants')) return constants;
        throw new Error(name);
      },
    },
  );
  return exports;
}

test('habit and sober Phosphor mappings exclude the dedicated meditation and 19 icons', () => {
  const { HABIT_RECORD_ICONS, SOBER_RECORD_ICONS } = loadIcon('src/components/recordIcons.ts');
  assert.deepEqual(
    Object.keys(HABIT_RECORD_ICONS),
    constants.HABIT_ICON_OPTIONS.map(({ key }) => key).filter((key) => key !== 'meditation'),
  );
  assert.equal(new Set(Object.values(HABIT_RECORD_ICONS)).size, 49);
  assert.deepEqual(
    Object.keys(SOBER_RECORD_ICONS),
    Object.keys(SOBER_ICONS).filter((key) => key !== 'age19'),
  );
  assert.equal(Object.keys(SOBER_RECORD_ICONS).length, 49);
  assert.equal(new Set(Object.values(SOBER_RECORD_ICONS)).size, 49);
  assert(!('age19' in SOBER_RECORD_ICONS));
});

test('record icons preserve theme color, fixed colors and rem-based sizes with Phosphor filled weights', () => {
  let accent = '#8CADE2';
  const modules = {
    '../theme/AppThemeProvider': { useAppTheme: () => ({ colors: { accent }, rem: 15 }) },
  };
  const { HabitIcon } = loadIcon('src/components/HabitIcon.tsx', modules);
  const { SoberIcon } = loadIcon('src/components/SoberIcon.tsx', modules);
  assert.equal(HabitIcon({ name: 'walking' }).type, 'PersonSimpleWalkIcon');
  assert.equal(HabitIcon({ name: 'language' }).props.weight, 'fill');
  assert.equal(HabitIcon({ name: 'coding' }).props.weight, 'fill');
  assert.equal(HabitIcon({ name: 'cleaning' }).type, 'SprayBottleIcon');
  assert.equal(HabitIcon({ name: 'cleaning' }).props.weight, 'fill');
  assert.equal(HabitIcon({ name: 'meditation' }).props.name, 'meditation');
  assert.equal(SoberIcon({ name: 'skinPicking' }).type, 'HandGrabbingIcon');
  assert.equal(SoberIcon({ name: 'skinPicking' }).props.weight, 'regular');
  assert.equal(SoberIcon({ name: 'coffee' }).type, 'CoffeeIcon');
  for (const [render, name] of [
    [HabitIcon, 'walking'],
    [SoberIcon, 'coffee'],
  ] as const) {
    assert.equal(render({ name }).props.color, accent);
    assert.equal(render({ name }).props.size, 26.25);
    assert.equal(render({ name }).props.weight, 'fill');
    accent = '#83C6B6';
    assert.equal(render({ name, colorKey: 'theme' }).props.color, accent);
    assert.equal(
      render({ name, colorKey: 'pink', size: 18 }).props.color,
      constants.HABIT_ICON_COLORS.pink.value,
    );
    assert.equal(render({ name, size: 18 }).props.size, 18);
  }
  const badge = SoberIcon({ name: 'age19', size: 30 });
  assert.equal(badge.type, 'Svg');
  assert.equal(badge.props.width, 30);
  assert(JSON.stringify(badge).includes('19'));
});

test('Phosphor star retains filled and outline importance states', () => {
  const { StarIcon } = loadIcon('src/components/StarIcon.tsx');
  for (const filled of [false, true]) {
    const icon = StarIcon({ size: 18, color: '#8CADE2', filled });
    assert.equal(icon.type, 'StarIcon');
    assert.equal(icon.props.weight, filled ? 'fill' : 'regular');
    assert.equal(icon.props.color, '#8CADE2');
    assert.equal(icon.props.size, 18);
  }
});
