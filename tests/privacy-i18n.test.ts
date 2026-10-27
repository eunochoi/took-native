import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { PRIVACY_SECTIONS } from '../src/privacy/content';
import { mockI18n } from './helpers/i18n';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any, key?: unknown) => ({ type, props, key });

test('privacy policy switches all ten sections without remounting and preserves the settings return route', () => {
  let language: 'ko' | 'en' = 'ko';
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../app/privacy.tsx', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native') return { View: 'View' };
        if (name.endsWith('/i18n/react')) return mockI18n(() => language);
        if (name.endsWith('/privacy/content')) return { PRIVACY_SECTIONS };
        if (name.endsWith('/BottomSheetPage')) return { BottomSheetPage: 'Page' };
        if (name.endsWith('/Text')) return { Text: 'Text' };
        if (name.endsWith('/theme/classes')) return {};
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  const render = () => exports.default();
  const sections = (tree: any) => tree.props.children.props.children;
  const korean = render();
  assert.equal(korean.props.title, '개인정보처리방침');
  assert.equal(sections(korean).length, 10);
  assert.equal(sections(korean)[0].props.children[0].props.children, '기기에 저장되는 정보');
  language = 'en';
  const english = render();
  assert.equal(english.props.title, 'Privacy policy');
  assert.equal(english.props.backRoute, '/setting');
  assert.equal(sections(english).length, 10);
  assert.deepEqual(
    sections(english).map((section: any) => section.key),
    [...PRIVACY_SECTIONS],
  );
  const content = sections(english)
    .map((section: any) => {
      assert.equal(section.props.children[0].props.accessibilityRole, 'header');
      return section.props.children.map((node: any) => node.props.children).join(' ');
    })
    .join('\n');
  assert(!/[가-힣]/.test(content));
  for (const statement of [
    'local SQLite database',
    'does not create user accounts',
    'does not use external SDKs',
    'without deleting the original photo',
    'does not automatically upload',
    'all files belong to the same set',
    'current records are not replaced',
    'not separately encrypted',
    'no separate button to delete all data',
    'Android automatic cloud backup is disabled',
    'eooooostudio@gmail.com',
    'October 4, 2026',
  ])
    assert(content.includes(statement), statement);
  language = 'ko';
  assert.deepEqual(render(), korean);
});
