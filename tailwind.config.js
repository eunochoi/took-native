const plugin = require('tailwindcss/plugin');
const tokens = require('./src/theme/tokens.json');
const metrics = tokens.metrics;
const colorNames = [
  ...Object.keys(tokens.colors.light),
  ...Object.keys(tokens.colors.dark),
  'accent',
  'accentLight',
  'accentDeep',
  'accentText',
];
const themeColors = Object.fromEntries(
  [...new Set(colorNames)].map((name) => {
    const cssName = name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
    return [cssName, `rgb(var(--theme-${cssName}) / <alpha-value>)`];
  }),
);
themeColors.bg = themeColors.background;

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      spacing: {
        'screen-content-bottom': 'var(--screen-content-bottom)',
      },
      borderRadius: { theme: `${metrics.radius}px` },
      fontSize: { app: '1rem' },
      colors: { theme: themeColors },
      fontFamily: {
        tmoney: ['Tmoney'],
        'tmoney-bold': ['TmoneyBold'],
      },
    },
  },
  corePlugins: {
    fontWeight: false,
    transitionProperty: false,
    transitionDuration: false,
    transitionTimingFunction: false,
    transitionDelay: false,
    animation: false,
  },
  plugins: [
    plugin(({ addBase, addUtilities }) => {
      addBase({ ':root': { fontSize: `${metrics.fontSizes.normal}px` } });
      // Tmoney has Regular (400) and ExtraBold (800); match web font-face selection.
      const weights = [
        'thin',
        'extralight',
        'light',
        'normal',
        'medium',
        'semibold',
        'bold',
        'extrabold',
        'black',
      ];
      addUtilities(
        Object.fromEntries(
          weights.map((weight, index) => [
            '.font-' + weight,
            { fontFamily: index >= 5 ? 'TmoneyBold' : 'Tmoney', fontWeight: 'normal' },
          ]),
        ),
      );
    }),
  ],
};
