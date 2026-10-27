import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { translateErrorMessage } from '../src/i18n/errors';
import { errorsKo } from '../src/i18n/locales/ko/errors';
import { t, i18n } from '../src/i18n/core';
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('all known service errors translate without changing the original error or global locale', () => {
  const locale = i18n.locale;
  for (const [key, template] of Object.entries(errorsKo)) {
    const values = { count: 12, value: '1, 3, 5' };
    const message = template.replace(/%\{(count|value)\}/g, (_, name: 'count' | 'value') =>
      String(values[name]),
    );
    const error = new Error(message);
    const stack = error.stack;
    assert.equal(translateErrorMessage(message, 'ko'), message);
    const english = translateErrorMessage(message, 'en');
    assert.equal(
      english,
      t(`errors.${key as keyof typeof errorsKo}`, { ...values, locale: 'en' }),
      key,
    );
    assert(!/[가-힣]|%\{/.test(english), key);
    assert.equal(error.message, message);
    assert.equal(error.stack, stack);
  }
  assert.equal(i18n.locale, locale);
});

test('storage amounts, split-file indices and validation limits are preserved; unrelated text is untouched', () => {
  assert.equal(
    translateErrorMessage(
      '백업할 기기 저장 공간이 부족합니다. 약 247MB의 여유 공간이 필요합니다.',
      'en',
    ),
    'Not enough storage for the backup. About 247 MB of free space is needed.',
  );
  assert.equal(
    translateErrorMessage(
      '백업 파일이 빠졌습니다. 1, 3, 8번 파일을 함께 선택해주세요. (전체 12개)',
      'en',
    ),
    'Backup files are missing. Also select files 1, 3, 8. (12 files in total)',
  );
  assert.equal(
    translateErrorMessage('사진은 한 장당 12.5MB까지 선택할 수 있습니다.', 'en'),
    'Each photo must be 12.5 MB or smaller.',
  );
  for (const message of [
    '',
    'Unknown native error',
    '내가 작성한 메모',
    'prefix: 날짜를 확인해주세요.',
    '날짜를 확인해주세요. suffix',
    '습관은 최대 잘못된 값개까지 만들 수 있습니다.',
    '습관은 최대 개까지 만들 수 있습니다.',
  ]) {
    assert.equal(translateErrorMessage(message, 'en'), message);
  }
});

test('current backup, database, domain, media and settings error literals are covered by display translations', () => {
  let checked = 0;
  for (const directory of [
    'backup',
    'db',
    'domain',
    'media',
    'settings',
    'notifications',
    'widgets/sober',
  ]) {
    for (const file of readdirSync(new URL(`../src/${directory}/`, import.meta.url))) {
      if (!/\.tsx?$/.test(file)) continue;
      const source = ts.createSourceFile(
        file,
        readFileSync(new URL(`../src/${directory}/${file}`, import.meta.url), 'utf8'),
        ts.ScriptTarget.Latest,
        true,
      );
      const visit = (node: any) => {
        if (
          ts.isNewExpression(node) &&
          node.expression.getText(source) === 'Error' &&
          node.arguments?.length
        ) {
          const argument = node.arguments[0];
          let message = '';
          if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
            message = argument.text;
          else if (ts.isTemplateExpression(argument))
            message =
              argument.head.text +
              argument.templateSpans.map((span: any) => '12' + span.literal.text).join('');
          if (/[가-힣]/.test(message)) {
            checked++;
            assert(
              !/[가-힣]/.test(translateErrorMessage(message, 'en')),
              `${directory}/${file}: ${message}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  assert(checked > 100);
});
