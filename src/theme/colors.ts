import tokens from './tokens.json';

type ThemeColorName =
  | keyof typeof tokens.colors.light
  | keyof typeof tokens.colors.dark
  | keyof typeof tokens.colors.aliases
  | 'accent'
  | 'accentLight'
  | 'accentDeep'
  | 'accentSoft'
  | 'accentBorder'
  | 'accentText';
type ThemeColors = Record<ThemeColorName, string>;

const values = tokens.colorValues as Record<string, string>;
const palette = (references: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(references).map(([name, reference]) => [name, values[reference]]),
  );
export const ACCENT_PALETTES = Object.fromEntries(
  Object.entries(tokens.colors.accents).map(([name, references]) => [name, palette(references)]),
) as Record<
  keyof typeof tokens.colors.accents,
  {
    accent: string;
    accentLight: string;
    accentDeep: string;
    accentSoft: string;
    accentBorder: string;
  }
>;

export function resolveThemeMode(mode: 'light' | 'dark' | 'system', system: string | null) {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

export function themeColors(accent: keyof typeof ACCENT_PALETTES, mode: 'light' | 'dark') {
  const colors = {
    ...palette(tokens.colors.light),
    ...ACCENT_PALETTES[accent],
    ...(mode === 'dark'
      ? { ...palette(tokens.colors.dark), ...palette(tokens.colors.accentsDark[accent]) }
      : {}),
  } as ThemeColors;
  const fraction = mode === 'dark' ? 0.7 : 0.6;
  const white = parseInt(values.white.slice(1, 3), 16);
  colors.accentText =
    '#' +
    [1, 3, 5]
      .map((start) =>
        Math.round(
          parseInt(colors.accent.slice(start, start + 2), 16) * fraction +
            (mode === 'dark' ? white * (1 - fraction) : 0),
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  for (const [alias, name] of Object.entries(tokens.colors.aliases))
    colors[alias as keyof typeof tokens.colors.aliases] = colors[name as ThemeColorName];
  return colors;
}

// Positive amounts blend toward white; negative amounts blend toward black.
export function adjustColorBrightness(color: string, amount: number) {
  const fraction = Math.min(1, Math.abs(amount));
  const target = amount >= 0 ? 255 : 0;
  return (
    '#' +
    [1, 3, 5]
      .map((start) => {
        const channel = parseInt(color.slice(start, start + 2), 16);
        return Math.round(channel * (1 - fraction) + target * fraction)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

// Keep item accents readable on the current surface, including pale custom icon colors.
export function itemAccentColors(color: string, surface: string, mode: 'light' | 'dark') {
  const blend = (foreground: string, background: string, amount: number) =>
    '#' +
    [1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(foreground.slice(offset, offset + 2), 16) * amount +
            parseInt(background.slice(offset, offset + 2), 16) * (1 - amount),
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('');
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((offset) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const background = blend(color, surface, mode === 'dark' ? 0.16 : 0.08);
  let text = color;
  for (let step = 0; step <= 20; step += 1) {
    const amount = step / 20;
    text = blend(mode === 'dark' ? '#ffffff' : '#000000', color, amount);
    const foreground = luminance(text);
    if (
      [surface, background].every((base) => {
        const backdrop = luminance(base);
        return (
          (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05) >= 4.5
        );
      })
    )
      break;
  }
  return { color, background, border: blend(color, surface, 0.3), text };
}
