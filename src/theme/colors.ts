import tokens from './tokens.json';

type ThemeColorName =
  | keyof typeof tokens.colors.light
  | keyof typeof tokens.colors.dark
  | keyof typeof tokens.colors.aliases
  | 'accent'
  | 'accentLight'
  | 'accentDeep'
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
  { accent: string; accentLight: string; accentDeep: string }
>;

export function resolveThemeMode(mode: 'light' | 'dark' | 'system', system: string | null) {
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

export function themeColors(accent: keyof typeof ACCENT_PALETTES, mode: 'light' | 'dark') {
  const colors = {
    ...palette(tokens.colors.light),
    ...ACCENT_PALETTES[accent],
    ...(mode === 'dark' ? palette(tokens.colors.dark) : {}),
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
