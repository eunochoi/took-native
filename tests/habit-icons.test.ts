import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { transpileModule, JsxEmit, ModuleKind } from 'typescript';
import * as constants from '../src/domain/constants';

const require = createRequire(import.meta.url);

test('habit options use distinct supported icons and meaningful labels', () => {
  const glyphs = {
    ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'),
  };
  assert.equal(constants.HABIT_ICON_OPTIONS.length, 25);
  const icons = constants.HABIT_ICON_OPTIONS.map(({ key, label }) => {
    assert(label.trim());
    const icon = constants.HABIT_ICONS[key];
    return `${icon.family}:${icon.name}`;
  });
  assert.equal(new Set(icons).size, icons.length);
  for (const icon of Object.values(constants.HABIT_ICONS))
    assert(icon.name in glyphs[icon.family], icon.name);
});

test('default habit icon follows theme changes while a fixed color stays fixed', () => {
  const code = transpileModule(
    readFileSync(new URL('../src/components/HabitIcon.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS } },
  ).outputText;
  let accent = '#8CADE2';
  const exports: Record<
    string,
    (props: Record<string, unknown>) => { type: string; props: { color: string; name: string } }
  > = {};
  runInNewContext(code, {
    exports,
    require: (name: string) => {
      if (name === 'react/jsx-runtime')
        return { jsx: (type: unknown, props: unknown) => ({ type, props }) };
      if (name.includes('AppThemeProvider'))
        return { useAppTheme: () => ({ colors: { accent }, rem: 15 }) };
      if (name.includes('domain/constants')) return constants;
      if (name.includes('Ionicons')) return { __esModule: true, default: 'Ionicons' };
      if (name.includes('MaterialCommunityIcons'))
        return { __esModule: true, default: 'MaterialCommunityIcons' };
      throw new Error(name);
    },
  });
  assert.equal(exports.HabitIcon({ name: 'walking' }).props.color, accent);
  for (const key of [
    'running',
    'nutrition',
    'supplements',
    'meditation',
    'cleaning',
    'plants',
  ] as const) {
    const rendered = exports.HabitIcon({ name: key });
    assert.equal(rendered.type, 'MaterialCommunityIcons');
    assert.equal(rendered.props.name, constants.HABIT_ICONS[key].name);
  }
  assert.equal(exports.HabitIcon({ name: 'walking' }).type, 'Ionicons');

  accent = '#83C6B6';
  assert.equal(exports.HabitIcon({ name: 'walking', colorKey: 'theme' }).props.color, accent);
  assert.equal(
    exports.HabitIcon({ name: 'walking', colorKey: 'pink' }).props.color,
    constants.HABIT_ICON_COLORS.pink.value,
  );
});
