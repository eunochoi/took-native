import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { URL } from 'node:url';
import { runInNewContext } from 'node:vm';
import tokens from '../src/theme/tokens.json';
const metrics = { rem: tokens.metrics.fontSizes.normal, radius: tokens.metrics.radius };

const require = createRequire(import.meta.url);
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const { cssToReactNativeRuntime } = require('react-native-css-interop/dist/css-to-rn');
const config = require('../tailwind.config.js');

test('web 14/15/16px runtime root scales typography, spacing and dimensions consistently', async () => {
  const globalCss = readFileSync(new URL('../global.css', import.meta.url), 'utf8');
  assert.equal(metrics.rem, 15);

  const expected = {
    'text-xs': { fontSize: 11.25, lineHeight: 15 },
    'text-sm': { fontSize: 13.125, lineHeight: 18.75 },
    'text-base': { fontSize: 15, lineHeight: 22.5 },
    'text-app': { fontSize: 15 },
    'text-lg': { fontSize: 16.875, lineHeight: 26.25 },
    'text-xl': { fontSize: 18.75, lineHeight: 26.25 },
    'text-2xl': { fontSize: 22.5, lineHeight: 30 },
    'text-4xl': { fontSize: 33.75, lineHeight: 37.5 },
    'gap-4': { rowGap: 15, columnGap: 15 },
    'p-2': { padding: 7.5 },
    'h-12': { height: 45 },
    'mt-8': { marginTop: 30 },
    'rounded-lg': { borderRadius: 7.5 },
    'rounded-theme': { borderRadius: 16 },
    'font-medium': { fontFamily: 'Tmoney', fontWeight: 'normal' },
    'font-semibold': { fontFamily: 'TmoneyBold', fontWeight: 'normal' },
    'font-bold': { fontFamily: 'TmoneyBold', fontWeight: 'normal' },
  };
  const result = await postcss([
    tailwind({ ...config, content: [{ raw: Object.keys(expected).join(' '), extension: 'html' }] }),
  ]).process(globalCss, { from: undefined });
  assert.match(result.css, new RegExp(`font-size: ${tokens.metrics.fontSizes.normal}px`));
  const native = cssToReactNativeRuntime(result.css, { inlineRem: false });
  for (const [className, properties] of Object.entries(expected)) {
    const rule = native.rules[className];
    assert(rule, `${className} is missing`);
    assert(!rule.warnings?.length, `${className} is unsupported on native`);
    for (const root of [14, 15, 16]) {
      const actual: Record<string, unknown> = {};
      for (const declaration of rule.n.flatMap((item: { d: unknown[][] }) => item.d)) {
        if (declaration.length === 1) Object.assign(actual, declaration[0]);
        else {
          const [value, property] = declaration;
          assert(
            Array.isArray(value) && value[1] === 'rem',
            `${className} must retain runtime rem`,
          );
          actual[String(property)] = value[2][0] * root;
        }
      }
      for (const [property, value] of Object.entries(properties)) {
        const expectedValue =
          typeof value === 'number' && className !== 'rounded-theme' ? (value / 15) * root : value;
        assert.equal(actual[property], expectedValue, `${className}.${property} at ${root}px`);
      }
    }
  }
});

test('theme utilities retain runtime variables and bottom spacing tracks runtime rem', async () => {
  const classes = [
    'bg-theme-surface',
    'bg-theme-accent/10',
    'text-theme-text-primary',
    'pb-screen-content-bottom',
  ];
  const result = await postcss([
    tailwind({ ...config, content: [{ raw: classes.join(' '), extension: 'html' }] }),
  ]).process(readFileSync(new URL('../global.css', import.meta.url), 'utf8'), { from: undefined });
  const native = cssToReactNativeRuntime(result.css, { inlineRem: false });
  for (const name of classes) {
    const rule = native.rules[name];
    assert(rule && !rule.warnings?.length, `${name} must compile without warnings`);
    const declarations = rule.n.flatMap((item: { d: unknown[][] }) => item.d);
    assert(declarations.length, `${name} must not silently lose its style`);
    assert.match(JSON.stringify(declarations), /--(?:theme-|screen-content-bottom)/);
  }
  assert.match(
    readFileSync(new URL('../metro.config.js', import.meta.url), 'utf8'),
    /inlineRem:\s*false/,
  );
});

test('tab footer clears the floating navigation for every font size and bottom safe area', () => {
  const ts = require('typescript');
  const providerSource = readFileSync(
    new URL('../src/theme/AppThemeProvider.tsx', import.meta.url),
    'utf8',
  );
  for (const fontSize of ['small', 'normal', 'large'] as const) {
    for (const bottom of [0, 24, 48]) {
      const exports: Record<string, Function> = {};
      const jsx = (type: unknown, props: any) => ({ type, props });
      runInNewContext(
        ts.transpileModule(providerSource, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
        }).outputText,
        {
          exports,
          require: (name: string) => {
            if (name === 'react')
              return {
                createContext: () => ({ Provider: 'Provider' }),
                useMemo: (build: () => unknown) => build(),
                useLayoutEffect: () => undefined,
              };
            if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
            if (name === 'react-native') return { View: 'View', useColorScheme: () => 'light' };
            if (name === 'nativewind')
              return { vars: (values: unknown) => values, rem: { set: () => undefined } };
            if (name === 'react-native-safe-area-context')
              return { useSafeAreaInsets: () => ({ bottom }) };
            if (name.endsWith('/SettingsProvider'))
              return { useSettings: () => ({ settings: { fontSize } }) };
            if (name.endsWith('/tokens.json')) return { __esModule: true, default: tokens };
            if (name.endsWith('/useReducedMotion')) return { useReducedMotion: () => false };
            if (name === './colors')
              return { resolveThemeMode: () => 'light', themeColors: () => ({}) };
            throw new Error(`Unexpected provider dependency: ${name}`);
          },
        },
      );
      const shell = exports.AppThemeProvider({ children: null });
      const height = shell.props.value.tabContentBottom;
      const rootSize = tokens.metrics.fontSizes[fontSize];
      // Actual nav geometry: h-11 buttons, two py-1.5 paddings, two 1px borders;
      // the Settings circle now shares this height.
      const navHeight = rootSize * 3.5 + 2;
      const navTopFromBottom = bottom + rootSize * tokens.metrics.navigationBottomRem + navHeight;
      assert(
        height - navTopFromBottom >= rootSize * tokens.metrics.contentBottomRem,
        `last content must clear the nav with a full gap: ${fontSize}, inset ${bottom}`,
      );
      assert(Number.isFinite(height));
      const spacerModule: Record<string, Function> = {};
      runInNewContext(
        ts.transpileModule(
          readFileSync(new URL('../src/components/TabBottomSpacer.tsx', import.meta.url), 'utf8'),
          { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
        ).outputText,
        {
          exports: spacerModule,
          require: (name: string) => {
            if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
            if (name === 'react-native') return { View: 'View' };
            if (name.endsWith('/AppThemeProvider')) return { useAppTheme: () => shell.props.value };
            throw new Error(`Unexpected spacer dependency: ${name}`);
          },
        },
      );
      const spacer = spacerModule.TabBottomSpacer();
      assert.equal(spacer.props.style.height, height, 'the footer supplies a native layout height');
      assert.equal(spacer.props.pointerEvents, 'none');
    }
  }
  for (const route of ['diary', 'habit', 'sober', 'setting']) {
    const screen = readFileSync(new URL(`../app/(tabs)/${route}.tsx`, import.meta.url), 'utf8');
    assert.equal((screen.match(/<TabBottomSpacer\s*\/>/g) ?? []).length, 1, `${route}: one footer`);
    assert(!screen.includes('pb-tab-content-bottom'), `${route}: no duplicate bottom padding`);
  }
});
