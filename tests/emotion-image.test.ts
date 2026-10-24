import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { EMOTIONS } from '../src/domain/constants';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function harness(preferredStyle: string) {
  const exports: Record<string, Function> = {};
  let settingsReads = 0;
  runInNewContext(
    ts.transpileModule(
      readFileSync(new URL('../src/components/EmotionImage.tsx', import.meta.url), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react') return { memo: (component: Function) => component };
        if (name === 'react/jsx-runtime')
          return { jsx: (type: unknown, props: any) => ({ type, props }) };
        if (name === 'react-native') return { Image: 'Image' };
        if (name.endsWith('/constants')) return { EMOTIONS };
        if (name.endsWith('/SettingsProvider'))
          return {
            useSettings: () => {
              settingsReads++;
              return { settings: { emotionStyle: preferredStyle } };
            },
          };
        if (name.endsWith('.png')) return name;
        throw new Error(`Unexpected dependency: ${name}`);
      },
    },
  );
  return {
    render(props: Record<string, unknown>) {
      let tree = exports.EmotionImage(props);
      while (typeof tree.type === 'function') tree = tree.type(tree.props);
      return tree;
    },
    get settingsReads() {
      return settingsReads;
    },
  };
}

test('emotion images follow each preferred style and retain their calendar scaling', () => {
  for (const style of ['basic', 'simple', 'emoji']) {
    const ui = harness(style);
    const image = ui.render({ emotion: 0, fill: true });
    assert.equal(image.type, 'Image');
    assert.equal(image.props.source, `../../assets/emotions/${style}/happy.png`);
    assert.equal(image.props.accessibilityLabel, EMOTIONS[0].name);
    assert.equal(image.props.className, 'w-full h-full');
    assert.equal(
      image.props.style.transform[0].scale,
      style === 'simple' ? 0.85 : style === 'emoji' ? 1.2 : 1,
    );
    assert.equal(image.props.fadeDuration, 0);
  }
});

test('real and unknown emotions retain artwork, labels and requested sizing', () => {
  const ui = harness('basic');
  for (const emotion of [0, 9, 99]) {
    const image = ui.render({ emotion, size: 30 });
    assert.equal(
      image.props.source,
      `../../assets/emotions/basic/${emotion === 0 ? 'happy' : 'unknown'}.png`,
    );
    assert.equal(image.props.tintColor, undefined);
    assert.equal(image.props.className, undefined);
    assert.equal(image.props.accessibilityLabel, EMOTIONS[emotion]?.name ?? EMOTIONS[9].name);
    assert.equal(image.props.style.width, 30);
    assert.equal(image.props.style.height, 30);
  }
});

test('explicit icon style overrides the preference without subscribing to settings', () => {
  const ui = harness('emoji');
  const image = ui.render({ emotion: 0, iconStyle: 'basic' });
  assert.equal(image.props.source, '../../assets/emotions/basic/happy.png');
  assert.equal(ui.settingsReads, 0);
});

test('all twelve emotions resolve their own artwork in every style with 256px transparent PNGs', () => {
  for (const style of ['basic', 'simple', 'emoji']) {
    const ui = harness(style);
    for (const [id, emotion] of EMOTIONS.entries()) {
      const image = ui.render({ emotion: id });
      assert.equal(image.props.source, `../../assets/emotions/${style}/${emotion.key}.png`);
      assert.equal(image.props.accessibilityLabel, emotion.name);
      const bytes = readFileSync(
        new URL(`../assets/emotions/${style}/${emotion.key}.png`, import.meta.url),
      );
      assert.equal(bytes.readUInt32BE(16), 256);
      assert.equal(bytes.readUInt32BE(20), 256);
      assert.equal(bytes[25], 6);
    }
  }
  assert.equal(EMOTIONS[9].name, '무덤덤');
  assert.equal(EMOTIONS[10].name, '피곤함');
  assert.equal(EMOTIONS[11].name, '싱숭생숭');
});
