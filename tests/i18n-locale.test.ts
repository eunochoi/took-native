import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { i18n, resolveLocale, t } from '../src/i18n/core';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function localeHarness(nativeAvailable = true, initialTag: string | null = 'ko-KR') {
  let tag = initialTag;
  let registrations = 0;
  let removals = 0;
  let stateChanged: (state: string) => void = () => {};
  let reads = 0;
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/i18n/locale.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      Intl,
      require: (name: string) => {
        if (name === './core') return { i18n, resolveLocale };
        if (name === 'expo')
          return { requireOptionalNativeModule: () => (nativeAvailable ? {} : null) };
        if (name === 'expo-localization') {
          assert(nativeAvailable, 'Older builds must not load the enforcing native module');
          return {
            getLocales: () => {
              reads++;
              return tag === null ? [] : [{ languageTag: tag }];
            },
          };
        }
        if (name === 'react-native')
          return {
            AppState: {
              addEventListener: (_name: string, fn: typeof stateChanged) => {
                registrations++;
                stateChanged = fn;
                return {
                  remove: () => {
                    removals++;
                  },
                };
              },
            },
          };
        throw new Error('Unexpected import: ' + name);
      },
    },
  );
  return {
    ...exports,
    setDevice: (value: string | null) => {
      tag = value;
    },
    foreground: () => stateChanged('active'),
    background: () => stateChanged('background'),
    registrations: () => registrations,
    removals: () => removals,
    reads: () => reads,
  };
}

test('system language uses Korean or English only, while manual choice takes priority', () => {
  for (const tag of ['ko', 'ko-KR', 'KO_kr'])
    assert.equal(resolveLocale('system', tag).language, 'ko');
  for (const tag of ['en', 'en-US', 'en-GB', 'ja-JP', 'fr-FR', 'de-DE', '', null, undefined]) {
    assert.equal(resolveLocale('system', tag).language, 'en');
  }
  assert.equal(resolveLocale('en', 'ko-KR').language, 'en');
  assert.equal(resolveLocale('ko', 'en-US').language, 'ko');
  assert.equal(resolveLocale('system', 'en-GB').formatLocale, 'en-GB');
  assert.equal(resolveLocale('system', 'fr-FR').formatLocale, 'en-US');
});

test('non-Korean scripts use English UI and date locale while explicit choices take priority', () => {
  for (const tag of [
    'zh-Hans-CN',
    'zh-Hant-TW',
    'ar-SA',
    'he-IL',
    'hi-IN',
    'th-TH',
    'ru-RU',
    'es-MX',
    'pt-BR',
    'vi-VN',
    'id-ID',
    'tr-TR',
    'kok-IN',
    'und',
    '',
    null,
  ]) {
    assert.deepEqual(resolveLocale('system', tag), { language: 'en', formatLocale: 'en-US' });
    const device = localeHarness(true, 'ko-KR');
    const stop = device.subscribeLocale(() => {});
    device.setDevice(tag);
    device.foreground();
    assert.deepEqual(device.getLocale(), { language: 'en', formatLocale: 'en-US' });
    assert.equal(t('common.save'), 'Save');
    device.setLanguagePreference('ko');
    assert.equal(t('common.save'), '저장');
    device.setLanguagePreference('system');
    assert.equal(t('common.save'), 'Save');
    stop();
    assert.equal(resolveLocale('ko', tag).language, 'ko');
    assert.equal(resolveLocale('en', tag).language, 'en');
  }
  for (const tag of ['ko-KR', 'ko-KP', 'ko-Kore-KR', 'KO_kr']) {
    assert.deepEqual(resolveLocale('system', tag), { language: 'ko', formatLocale: 'ko-KR' });
  }
});

test('legacy settings default to system and invalid manual language is rejected', () => {
  const { language: _oldLanguage, ...legacy } = DEFAULT_SETTINGS;
  assert.equal(parseSettings(legacy).language, 'system');
  for (const language of ['system', 'ko', 'en'])
    assert.equal(parseSettings({ ...legacy, language }).language, language);
  for (const language of ['ja', null, true, 'en-US'])
    assert.throws(() => parseSettings({ ...legacy, language }));
});

test('foreground locale updates notify once, preserve manual choice and clean up the shared listener', () => {
  const h = localeHarness();
  let updates = 0;
  const stop = h.subscribeLocale(() => {
    updates++;
  });
  const stopSecond = h.subscribeLocale(() => {});
  assert.equal(h.registrations(), 1);
  assert.equal(h.getLocale().language, 'ko');
  const original = h.getLocale();
  h.foreground();
  assert.equal(h.getLocale(), original);
  assert.equal(updates, 0);
  h.setDevice('en-GB');
  h.foreground();
  assert.equal(h.getLocale().language, 'en');
  assert.equal(h.getLocale().formatLocale, 'en-GB');
  assert.equal(t('common.save'), 'Save');
  assert.equal(updates, 1);
  h.setLanguagePreference('ko');
  assert.equal(t('common.save'), '저장');
  h.setDevice('fr-FR');
  h.foreground();
  assert.equal(h.getLocale().language, 'ko');
  assert.equal(updates, 2);
  h.setLanguagePreference('system');
  assert.equal(h.getLocale().language, 'en');
  assert.equal(updates, 3);
  stop();
  assert.equal(h.removals(), 0);
  stopSecond();
  assert.equal(h.removals(), 1);
});

test('older binaries can use manual language without loading a missing localization module', () => {
  const h = localeHarness(false);
  assert.equal(h.reads(), 0);
  h.setLanguagePreference('ko');
  assert.equal(h.getLocale().language, 'ko');
  h.setLanguagePreference('en');
  assert.equal(h.getLocale().language, 'en');
});

test('language choices keep native names and translate their heading immediately', () => {
  const exports: any = {};
  let language: 'ko' | 'en' = 'ko';
  const changes: string[] = [];
  const jsx = (type: unknown, props: any) => ({ type, props });
  runInNewContext(
    ts.transpileModule(
      readFileSync(
        new URL('../src/screens/settings/LanguageSettingsSection.tsx', import.meta.url),
        'utf8',
      ),
      {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      },
    ).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === 'react-native') return { View: 'View' };
        if (name.endsWith('/PickerOption')) return { PickerOption: 'Option' };
        if (name.endsWith('/Text')) return { Text: 'Text' };
        if (name.endsWith('/i18n/react'))
          return {
            useI18n: () => ({ t: (key: Parameters<typeof t>[0]) => t(key, { locale: language }) }),
          };
        throw new Error('Unexpected import: ' + name);
      },
    },
  );
  const render = (disabled = false) =>
    exports.LanguageSettingsSection({
      value: language,
      disabled,
      onChange: (value: string) => changes.push(value),
    });
  let tree = render();
  assert.equal(tree.props.children[0].props.children, '언어');
  const choices = tree.props.children[1].props.children;
  assert.deepEqual(
    Array.from(choices, (node: any) => node.props.accessibilityLabel),
    ['시스템', '한국어', 'English'],
  );
  assert.equal(choices[1].props.selected, true);
  choices[2].props.onPress();
  assert.deepEqual(changes, ['en']);
  language = 'en';
  tree = render(true);
  assert.equal(tree.props.children[0].props.children, 'Language');
  assert.equal(tree.props.children[1].props.children[0].props.accessibilityLabel, 'System');
  assert(tree.props.children[1].props.children.every((node: any) => node.props.disabled));
});

test('standalone initialization falls back to English before any React or settings provider runs', () => {
  for (const tag of ['ja-JP', 'fr-FR', null]) {
    const h = localeHarness(true, tag);
    assert.equal(h.getLocale().language, 'en');
    assert.equal(h.getLocale().formatLocale, 'en-US');
    assert.equal(t('common.save'), 'Save');
    assert.equal(h.registrations(), 0);
  }
  const legacy = localeHarness(false);
  assert.equal(
    legacy.getLocale().language,
    resolveLocale('system', Intl.DateTimeFormat().resolvedOptions().locale).language,
  );
  assert.equal(legacy.reads(), 0);
});

test('background changes wait until active and resubscribing catches changes while detached', () => {
  const h = localeHarness();
  let updates = 0;
  const stop = h.subscribeLocale(() => {
    updates++;
  });
  h.setDevice('fr-FR');
  h.background();
  assert.equal(h.getLocale().language, 'ko');
  assert.equal(updates, 0);
  h.foreground();
  assert.equal(h.getLocale().language, 'en');
  assert.equal(updates, 1);
  stop();
  h.setDevice('ko-KR');
  const stopAgain = h.subscribeLocale(() => {
    updates++;
  });
  assert.equal(h.getLocale().language, 'ko');
  assert.equal(h.registrations(), 2);
  assert.equal(updates, 2);
  stopAgain();
  assert.equal(h.removals(), 2);
});

test('switching English regions refreshes date locale without changing the selected language', () => {
  const h = localeHarness(true, 'en-US');
  let updates = 0;
  const stop = h.subscribeLocale(() => {
    updates++;
  });
  h.setLanguagePreference('en');
  const original = h.getLocale();
  h.setLanguagePreference('en');
  assert.equal(h.getLocale(), original);
  h.setDevice('en-GB');
  h.foreground();
  assert.equal(h.getLocale().language, 'en');
  assert.equal(h.getLocale().formatLocale, 'en-GB');
  assert.equal(updates, 1);
  h.setDevice('ja-JP');
  h.foreground();
  assert.equal(h.getLocale().formatLocale, 'en-US');
  assert.equal(updates, 2);
  stop();
});

test('React translation hook follows the shared locale store and pins each render to its snapshot', () => {
  const h = localeHarness();
  let updates = 0;
  let stop: (() => void) | undefined;
  const exports: any = {};
  runInNewContext(
    ts.transpileModule(readFileSync(new URL('../src/i18n/react.ts', import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      require: (name: string) => {
        if (name === './core') return { t };
        if (name === './locale') return h;
        assert.equal(name, 'react');
        return {
          useSyncExternalStore: (
            subscribe: typeof h.subscribeLocale,
            getSnapshot: typeof h.getLocale,
            getServerSnapshot: typeof h.getLocale,
          ) => {
            if (!stop)
              stop = subscribe(() => {
                updates++;
              });
            assert.equal(getServerSnapshot(), getSnapshot());
            return getSnapshot();
          },
        };
      },
    },
  );
  const korean = exports.useI18n();
  assert.equal(korean.t('common.save'), '저장');
  h.setLanguagePreference('en');
  const english = exports.useI18n();
  assert.equal(english.t('common.save'), 'Save');
  assert.equal(english.t('common.dayCount', { count: 2 }), '2 days');
  assert.equal(english.t('common.save', { locale: 'ko' }), 'Save');
  assert.equal(korean.t('common.save'), '저장');
  assert.equal(updates, 1);
  h.setLanguagePreference('system');
  assert.equal(exports.useI18n().t('common.save'), '저장');
  stop?.();
  assert.equal(h.removals(), 1);
});
