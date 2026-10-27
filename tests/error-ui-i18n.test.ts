import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { mockI18n } from './helpers/i18n';
import { translateErrorMessage } from '../src/i18n/errors';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const jsx = (type: unknown, props: any) => ({ type, props });
function harness(path: string) {
  let language: 'ko' | 'en' = 'ko';
  let file = 'image.jpg';
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name.endsWith('/i18n/react')) return mockI18n(() => language);
        if (name.endsWith('/i18n/errors')) return { translateErrorMessage };
        if (name === 'react-native')
          return {
            View: 'View',
            Pressable: 'Pressable',
            Image: 'Image',
            useWindowDimensions: () => ({ height: 800 }),
          };
        if (name === 'expo-router') return { useLocalSearchParams: () => ({ file }) };
        if (name.endsWith('/media'))
          return {
            validFileName: (name: string) => name === 'image.jpg',
            mediaUri: (name: string) => `file://media/${name}`,
          };
        if (name === 'tailwind-merge') return require(name);
        if (name.endsWith('/Text') || name === './Text') return { Text: 'Text' };
        if (name.endsWith('/BottomSheetPage')) return { BottomSheetPage: 'Page' };
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return {
    exports,
    setLanguage: (value: 'ko' | 'en') => {
      language = value;
    },
    setFile: (value: string) => {
      file = value;
    },
  };
}

test('query errors translate the message and alert while preserving retries and caller labels', () => {
  const ui = harness('src/components/QueryError.tsx');
  let retries = 0;
  const props = { message: '날짜를 확인해주세요.', onRetry: () => retries++ };
  ui.setLanguage('en');
  const english = ui.exports.QueryError(props);
  assert.equal(english.props.children[0].props.children, 'Please check the date.');
  assert.equal(english.props.children[0].props.accessibilityRole, 'alert');
  assert.equal(english.props.children[1].props.accessibilityLabel, 'Try again');
  english.props.children[1].props.onPress();
  assert.equal(retries, 1);
  ui.setLanguage('ko');
  assert.equal(ui.exports.QueryError(props).props.children[0].props.children, props.message);
  assert.equal(
    ui.exports.QueryError({ ...props, retryAccessibilityLabel: 'Retry this query' }).props
      .children[1].props.accessibilityLabel,
    'Retry this query',
  );
});

test('photo viewer translates its title, attachment description and invalid-file state without changing image source', () => {
  const ui = harness('app/image.tsx');
  const korean = ui.exports.default();
  ui.setLanguage('en');
  const english = ui.exports.default();
  assert.equal(english.props.title, 'Photo');
  assert.equal(english.props.children.props.accessibilityLabel, 'Diary attachment photo');
  assert.equal(english.props.children.props.source.uri, korean.props.children.props.source.uri);
  assert.equal(english.props.children.props.style.height, 520);
  assert.equal(english.props.backRoute, '/');
  ui.setFile('../invalid.jpg');
  assert.equal(
    ui.exports.default().props.children.props.children,
    'Could not find the photo file.',
  );
  ui.setLanguage('ko');
  assert.equal(ui.exports.default().props.children.props.children, '사진 파일을 찾을 수 없습니다.');
});
