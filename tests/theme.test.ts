import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings/model';
import { ACCENT_PALETTES, resolveThemeMode, themeColors } from '../src/theme/colors';

test('old local preferences gain theme defaults; new preferences persist through parsing', () => {
  assert.deepEqual(
    parseSettings({ emotionStyle: 'emoji', habitSort: 'CUSTOM', habitOrder: [3, 1] }),
    { ...DEFAULT_SETTINGS, emotionStyle: 'emoji', habitSort: 'CUSTOM', habitOrder: [3, 1] },
  );
  const settings = {
    ...DEFAULT_SETTINGS,
    themeMode: 'system',
    themeAccent: 'pink',
    fontSize: 'large',
  };
  assert.deepEqual(parseSettings(JSON.parse(JSON.stringify(settings))), settings);
  assert.equal(parseSettings({ ...DEFAULT_SETTINGS, themeAccent: 'yellow' }).themeAccent, 'yellow');
  for (const patch of [{ themeMode: 'auto' }, { themeAccent: 'red' }, { fontSize: 'huge' }])
    assert.throws(() => parseSettings({ ...DEFAULT_SETTINGS, ...patch }));
});

test('system follows OS changes; explicit light and dark override OS preference', () => {
  assert.equal(resolveThemeMode('system', 'light'), 'light');
  assert.equal(resolveThemeMode('system', 'dark'), 'dark');
  assert.equal(resolveThemeMode('system', null), 'light');
  assert.equal(resolveThemeMode('light', 'dark'), 'light');
  assert.equal(resolveThemeMode('dark', 'light'), 'dark');
});

test('all six accents resolve their shared tokens and preserve dark surfaces', () => {
  for (const accent of Object.keys(ACCENT_PALETTES) as (keyof typeof ACCENT_PALETTES)[]) {
    const light = themeColors(accent, 'light');
    const dark = themeColors(accent, 'dark');
    assert.equal(light.accent, ACCENT_PALETTES[accent].accent);
    assert.equal(light.accentLight, ACCENT_PALETTES[accent].accentLight);
    assert.equal(light.surface, '#FFFFFF');
    assert.equal(dark.accent, light.accent);
    assert.equal(dark.accentLight, '#262626');
    assert.equal(dark.surface, '#3C3C3C');
    assert.equal(dark.textPrimary, '#FFFFFF');
    assert.equal(dark.text, dark.textPrimary);
    assert.notEqual(dark.accentText, light.accentText);
  }
});

test('calendar empty color stays neutral and visible across accents and modes', () => {
  for (const accent of Object.keys(ACCENT_PALETTES) as (keyof typeof ACCENT_PALETTES)[]) {
    for (const mode of ['light', 'dark'] as const) {
      const colors = themeColors(accent, mode);
      assert.equal(colors.calendarEmpty, colors.border);
      assert.notEqual(colors.calendarEmpty, colors.surface);
    }
  }
});
