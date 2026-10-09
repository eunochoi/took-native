import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import test from 'node:test';
import * as soberDomain from '../src/domain/sober';
import type { Sober, SoberRestart } from '../src/db/types';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = ts.transpileModule(
  readFileSync(new URL('../src/screens/sober/SoberBox.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
const start = '2024-01-01T00:00:00Z';
const day = soberDomain.SOBER_DAY_MS;
const origin = Date.parse(start);
const sober: Sober = {
  id: 1,
  name: '절제',
  icon_key: 'favorite',
  icon_color: 'theme',
  is_priority: 0,
  description: null,
  initial_started_at: start,
  goal_mode: 'AUTO',
  goal_days: null,
  created_at: start,
  updated_at: start,
};
const restarts: SoberRestart[] = [7, 2].map((offset, index) => ({
  id: index + 1,
  sober_id: 1,
  restarted_at: new Date(origin + offset * day).toISOString(),
  memo: null,
  created_at: start,
  updated_at: start,
}));

for (const [label, record, events, elapsed] of [
  ['empty history', sober, [], 0],
  ['auto goal boundary', sober, [], 7 * day],
  ['out-of-order history', sober, restarts, 9 * day],
  ['manual goal', { ...sober, goal_mode: 'MANUAL', goal_days: 10 }, restarts, 30 * day],
] as const) {
  test(`Sober list preserves current values without sorting history: ${label}`, () => {
    const exports: Record<string, Function> = {};
    const nodes: any[] = [];
    const jsx = (type: unknown, props: any) => {
      const node = { type, props };
      nodes.push(node);
      return node;
    };
    runInNewContext(source, {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'date-fns') return require(name);
        if (name === 'expo-router') return { useRouter: () => ({ push: () => undefined }) };
        if (name.endsWith('AppThemeProvider'))
          return { useAppTheme: () => ({ colors: {}, iconSizes: {} }) };
        if (name.endsWith('domain/sober'))
          return {
            ...soberDomain,
            getSoberSummary: () => {
              throw new Error('list must not compute long records');
            },
            getCurrentSoberStart: (item: Sober, history: SoberRestart[]) => {
              const immutable = new Proxy(history, {
                get: (target, key) => {
                  if (key === 'sort') throw new Error('list must not sort history');
                  return Reflect.get(target, key);
                },
              });
              return soberDomain.getCurrentSoberStart(item, immutable);
            },
          };
        return {
          Pressable: 'Pressable',
          View: 'View',
          Text: 'Text',
          SoberIcon: 'SoberIcon',
          ProgressBar: 'ProgressBar',
          SoberMenu: 'SoberMenu',
        };
      },
    });
    const expected = soberDomain.getSoberSummary(record as Sober, [...events], origin + elapsed);
    exports.SoberBox({
      sober: record,
      restarts: [...events],
      now: origin + elapsed,
      isFirst: true,
      isLast: true,
    });
    const progress = nodes.find((node) => node.type === 'ProgressBar');
    assert.equal(progress.props.value, expected.progress);
    assert(nodes.some((node) => node.type === 'View' && node.props.className?.includes('pb-0')));
    assert(
      nodes.some(
        (node) =>
          node.type === 'Text' &&
          node.props.children === soberDomain.formatSoberDuration(expected.duration),
      ),
    );
    const link = nodes.find(
      (node) =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.includes(', 목표 '),
    );
    assert.equal(
      link.props.accessibilityLabel,
      `${record.name}, ${soberDomain.formatSoberDuration(expected.duration)}, 목표 ${soberDomain.formatSoberGoal(expected.goalDays)}`,
    );
    nodes.length = 0;
    exports.SoberBox({
      sober: record,
      restarts: [...events],
      now: origin + elapsed,
      isFirst: true,
      isLast: false,
    });
    assert(nodes.some((node) => node.type === 'View' && node.props.className?.includes('pb-5')));
  });
}
