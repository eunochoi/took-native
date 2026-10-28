import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { getScrollFadeState } from '../src/hooks/scrollFade';

test('sheet fades leave the last content unobstructed while page fades retain toolbar coverage', () => {
  const require = createRequire(import.meta.url);
  const ts = require('typescript');
  const exports: any = {};
  const jsx = (type: any, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/ScrollEdgeFade.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native') return { View: 'View', StyleSheet: { absoluteFill: {} } };
        if (name === 'react-native-reanimated')
          return { __esModule: true, default: { View: 'AnimatedView' } };
        if (name === './ColorTransition')
          return { ColorView: 'View', SurfaceGradient: 'LinearGradient' };
        if (name === 'react-native-safe-area-context')
          return { useSafeAreaInsets: () => ({ bottom: 30 }) };
        if (name.endsWith('AppThemeProvider'))
          return {
            useAppTheme: () => ({ colors: { surface: '#FFFFFF' }, rem: 15, reducedMotion: false }),
          };
        if (name.endsWith('tokens.json'))
          return { __esModule: true, default: { motion: { scrollFade: 150 } } };
        throw new Error(`Unexpected import: ${name}`);
      },
    },
  );
  for (const visible of [false, true]) {
    const sheet = exports.ScrollEdgeFade({
      edge: 'bottom',
      visible,
      includeBottomInset: false,
      includeToolbar: false,
    });
    assert.equal(sheet.props.style.height, 30);
    assert.equal(sheet.props.children[0].props.style.opacity, visible ? 1 : 0);
    assert.equal(sheet.props.children[1], false);
  }
  const page = exports.ScrollEdgeFade({ edge: 'bottom', visible: false });
  assert.equal(page.props.style.height, 108);
  assert.equal(page.props.children[1].props.style.height, 78);
});

test('short content and unmeasured viewport never display edge fades', () => {
  for (const [offset, viewport, content] of [
    [0, 0, 900],
    [20, 800, 200],
    [0, 800, 800],
    [100, 800, 804],
  ]) {
    assert.deepEqual(getScrollFadeState(offset, viewport, content), {
      topVisible: false,
      bottomVisible: false,
    });
  }
});
test('top, middle and bottom use the threshold independently', () => {
  assert.deepEqual(getScrollFadeState(0, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(6, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(7, 800, 1600), {
    topVisible: true,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(794, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
  assert.deepEqual(getScrollFadeState(800, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
});
test('overscroll and content shrink cannot leave false boundaries visible', () => {
  assert.deepEqual(getScrollFadeState(-50, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
  assert.deepEqual(getScrollFadeState(900, 800, 1600), {
    topVisible: true,
    bottomVisible: false,
  });
  assert.deepEqual(getScrollFadeState(700, 800, 300), {
    topVisible: false,
    bottomVisible: false,
  });
});

test('top fade starts before the title leaves the viewport', () => {
  for (const offset of [7, 30, 99, 100, 101]) {
    assert.equal(getScrollFadeState(offset, 800, 1600).topVisible, true);
  }
  assert.deepEqual(getScrollFadeState(0, 800, 1600), {
    topVisible: false,
    bottomVisible: true,
  });
});
