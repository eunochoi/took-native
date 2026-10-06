import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { View, useColorScheme } from 'react-native';
import { rem, vars } from 'nativewind';
import { useSettings } from '../settings/SettingsProvider';
import tokens from './tokens.json';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { resolveThemeMode, themeColors } from './colors';

interface AppTheme {
  colors: ReturnType<typeof themeColors>;
  rem: number;
  navigationHeight: number;
  navigationBottom: number;
  tabContentBottom: number;
  mode: 'light' | 'dark';
  reducedMotion: boolean;
  iconSizes: { sm: number; md: number; lg: number };
}
const ThemeContext = createContext<AppTheme | null>(null);
export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const system = useColorScheme();
  const mode = resolveThemeMode(settings.themeMode, system);
  const rootSize = tokens.metrics.fontSizes[settings.fontSize];
  const reducedMotion = useReducedMotion();
  const colors = useMemo(
    () => themeColors(settings.themeAccent, mode),
    [settings.themeAccent, mode],
  );
  // h-11 + py-1.5 on both sides + the two border edges.
  const navigationHeight = rootSize * 3.5 + 2;
  const navigationBottom = insets.bottom + rootSize * tokens.metrics.navigationBottomRem;
  const theme = useMemo(
    () => ({
      colors,
      rem: rootSize,
      navigationHeight,
      navigationBottom,
      tabContentBottom:
        navigationBottom + navigationHeight + rootSize * tokens.metrics.contentBottomRem,
      mode,
      reducedMotion,
      iconSizes: {
        sm: rootSize * tokens.metrics.iconSizes.sm,
        md: rootSize * tokens.metrics.iconSizes.md,
        lg: rootSize * tokens.metrics.iconSizes.lg,
      },
    }),
    [colors, rootSize, mode, reducedMotion, navigationHeight, navigationBottom],
  );
  const variables = useMemo(
    () =>
      vars({
        '--screen-content-bottom': rootSize * tokens.metrics.screenContentBottomRem + insets.bottom,
        ...Object.fromEntries(
          Object.entries(theme.colors).map(([name, value]) => [
            '--theme-' + name.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase()),
            [1, 3, 5].map((start) => parseInt(value.slice(start, start + 2), 16)).join(' '),
          ]),
        ),
      }),
    [theme.colors, rootSize, insets.bottom],
  );
  useLayoutEffect(() => {
    rem.set(rootSize);
  }, [rootSize]);
  return (
    <ThemeContext.Provider value={theme}>
      <View className="flex-1" style={variables}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('AppThemeProvider가 필요합니다.');
  return value;
}
