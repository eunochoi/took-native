import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports: Record<string, Function> = {};
const jsx = (type: unknown, props: any) => ({ type, props });
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/components/ProgressBar.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText,
  {
    exports,
    require: (name: string) => {
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-native') return { View: 'View' };
      throw new Error(`Unexpected import: ${name}`);
    },
  },
);

test('progress width and accessible value agree within the 0–100 range', () => {
  for (const [value, expected] of [
    [-10, 0], [0, 0], [37.5, 37.5], [100, 100], [125, 100], [NaN, 0], [Infinity, 0],
  ]) {
    const tree = exports.ProgressBar({ value });
    assert.equal(tree.props.accessibilityRole, 'progressbar');
    assert.equal(tree.props.accessibilityValue.min, 0);
    assert.equal(tree.props.accessibilityValue.max, 100);
    assert.equal(tree.props.accessibilityValue.now, expected);
    assert.equal(tree.props.children.props.style.width, `${expected}%`);
  }
});

test('progress preserves the caller label and completion text', () => {
  const tree = exports.ProgressBar({
    value: 50,
    accessibilityLabel: '오늘의 습관',
    accessibilityValueText: '2/4 완료',
  });
  assert.equal(tree.props.accessibilityLabel, '오늘의 습관');
  assert.equal(tree.props.accessibilityValue.text, '2/4 완료');
});
