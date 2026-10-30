import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { mockI18n } from './helpers/i18n';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = ts.transpileModule(
  readFileSync(new URL('../src/screens/sober/SoberInfoCarousel.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
function harness() {
  const exports: Record<string, Function> = {};
  const state: any[] = [];
  let cursor = 0;
  let nodes: any[] = [];
  const moves: any[] = [];
  const jsx = (type: unknown, props: any) => {
    const node = { type, props };
    nodes.push(node);
    return node;
  };
  runInNewContext(source, {
    exports,
    require: (name: string) => {
      if (name === 'react')
        return {
          useState: (initial: any) => {
            const index = cursor++;
            if (!(index in state)) state[index] = initial;
            return [
              state[index],
              (value: any) => {
                state[index] = typeof value === 'function' ? value(state[index]) : value;
              },
            ];
          },
          useRef: () => ({ current: { scrollTo: (value: any) => moves.push(value) } }),
          useEffect: () => {},
        };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === 'react-native')
        return { View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView' };
      if (name.endsWith('/Text')) return { Text: 'Text' };
      if (name.endsWith('/i18n/react')) return mockI18n();
      throw new Error(name);
    },
  });
  return {
    moves,
    render: () => {
      cursor = 0;
      nodes = [];
      exports.SoberInfoCarousel({
        pages: ['current streak', 'summary'],
        color: '#abcdef',
      });
      return nodes;
    },
  };
}
test('current streak opens first and indicators and swipes synchronize the selected page', () => {
  const h = harness();
  let nodes = h.render();
  let dots = nodes.filter((node) => node.type === 'Pressable');
  assert.equal(dots[0].props.accessibilityState.selected, true);
  const layout = nodes.find(
    (node) => node.props.onLayout && !node.props.className?.includes('py-'),
  );
  layout.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
  nodes = h.render();
  dots = nodes.filter((node) => node.type === 'Pressable');
  dots[1].props.onPress();
  assert.equal(h.moves.at(-1).x, 320);
  nodes = h.render();
  assert.equal(
    nodes.filter((node) => node.type === 'Pressable')[1].props.accessibilityState.selected,
    true,
  );
  nodes
    .find((node) => node.type === 'ScrollView')
    .props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 0 } } });
  assert.equal(
    h.render().filter((node) => node.type === 'Pressable')[0].props.accessibilityState.selected,
    true,
  );
});
