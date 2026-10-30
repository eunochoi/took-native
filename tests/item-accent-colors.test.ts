import assert from 'node:assert/strict';
import test from 'node:test';
import { HABIT_ICON_COLORS } from '../src/domain/constants';
import { itemAccentColors } from '../src/theme/colors';

const luminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
for (const mode of ['light', 'dark'] as const) {
  test(`all icon palettes keep readable text in ${mode} detail surfaces`, () => {
    const surface = mode === 'light' ? '#ffffff' : '#181818';
    for (const color of [
      ...Object.values(HABIT_ICON_COLORS).map((item) => item.value),
      '#ffffff',
      '#000000',
    ]) {
      const palette = itemAccentColors(color, surface, mode);
      assert.equal(palette.color, color);
      for (const background of [surface, palette.background]) {
        const a = luminance(palette.text);
        const b = luminance(background);
        assert.ok(
          (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5,
          `${color} on ${background}`,
        );
      }
    }
  });
}
