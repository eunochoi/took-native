import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { dateTimeDraft, parseDateTime } from '../src/domain/date';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function render(mode: 'start' | 'restart', memo?: string) {
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/DateTimePicker.tsx', import.meta.url), 'utf8'),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name.endsWith('theme/classes')) return require('../src/theme/classes');
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react')
          return {
            useState: (value: any) => [typeof value === 'function' ? value() : value, () => {}],
          };
        if (name === 'react-native') return { View: 'View', TextInput: 'TextInput' };
        if (name === 'date-fns') return require('date-fns');
        if (name.includes('domain/date')) return { dateTimeDraft, parseDateTime };
        if (name.includes('useCurrentMinute')) return { useCurrentMinute: () => Date.now() };
        if (name.includes('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: {} }) };
        if (name.includes('limits')) return { SOBER_MEMO_MAX_LENGTH: 200 };
        return {
          BottomSheetModal: 'BottomSheetModal',
          FormPickerRow: 'FormPickerRow',
          Text: 'Text',
          Button: 'Button',
          DatePickerCalendar: 'DatePickerCalendar',
        };
      },
    },
  );
  const modal = exports.DateTimePicker({
    mode,
    memo,
    title: '날짜',
    value: '2024-01-01T00:00:00.000Z',
    onClose: () => {},
    onApply: () => {},
  });
  const tree = modal.props.children(() => {});
  const nodes: any[] = [];
  function visit(node: any) {
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    [node.props?.children].flat().forEach(visit);
  }
  visit(tree);
  return nodes;
}

test('restart mode shows memo and collapsed date selector even when memo data is absent', () => {
  const nodes = render('restart');
  assert.ok(nodes.find((node) => node.props.accessibilityLabel === '다시 시작 메모'));
  assert.ok(nodes.find((node) => node.props.accessibilityLabel === '다시 시작 시간 선택'));
  assert.equal(
    nodes.some((node) => node.type === 'DatePickerCalendar'),
    false,
  );
  assert.ok(nodes.find((node) => node.type === 'Button' && node.props.label === '기록 저장하기'));
});

test('start mode shows calendar and no memo UI even if memo data is present', () => {
  const nodes = render('start', 'ignored');
  assert.ok(nodes.find((node) => node.type === 'DatePickerCalendar'));
  assert.equal(
    nodes.some((node) => node.props.accessibilityLabel === '다시 시작 메모'),
    false,
  );
  assert.ok(nodes.find((node) => node.type === 'Button' && node.props.label === '선택 완료'));
});
