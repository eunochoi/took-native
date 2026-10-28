import { ColorView } from '../src/components/ColorTransition';
// @refresh reset
import { useI18n } from '../src/i18n/react';
import { translateErrorMessage } from '../src/i18n/errors';
import { themeColors } from '../src/theme/colors';
import { AppThemeProvider, useAppTheme } from '../src/theme/AppThemeProvider';
import '../global.css';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, Text as NativeText, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, type SQLiteDatabase, type SQLiteOpenOptions } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeDatabase } from '../src/db/schema';
import { SettingsProvider } from '../src/settings/SettingsProvider';
import { initializeMedia } from '../src/media';
import { AppLoadingScreen } from '../src/components/AppLoadingScreen';
import { refreshSoberWidgets } from '../src/widgets/sober';
import { NotificationController } from '../src/notifications/NotificationController';
import { ModalNavigationProvider } from '../src/navigation/ModalNavigationProvider';
import { NoticeProvider } from '../src/components/NoticeProvider';
import { FirstRunOnboarding } from '../src/screens/onboarding/OnboardingSheet';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const MIN_SPLASH_DURATION_MS = 1_500;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, networkMode: 'always' },
    mutations: { networkMode: 'always', retry: false },
  },
});
export const unstable_settings = { initialRouteName: '(tabs)' };
const sheetRoutes = [
  'home/[year]/stats',
  'calendar/[date]',
  'diary/new',
  'diary/[id]/index',
  'diary/[id]/edit',
  'habit/new',
  'habit/[id]/index',
  'habit/[id]/edit',
  'habit/order',
  'sober/new',
  'sober/[id]/index',
  'sober/[id]/edit',
  'sober/[id]/memos',
  'sober/[id]/day/[date]',
  'sober/[id]/restart/new',
  'sober/[id]/restart/[restartId]/edit',
  'privacy',
  'image',
];

// Database users must not share native handles, including in release builds.
const databaseOptions: SQLiteOpenOptions = { useNewConnection: true };
async function initializeAppDatabase(db: SQLiteDatabase) {
  await initializeDatabase(db);
  await initializeMedia(db);
}

// SQLiteProvider intentionally ignores children in its memo comparison. Context keeps
// readiness updates flowing to descendants without reopening the records database.
const AppReadyContext = createContext(false);

function Navigation({ onReady }: { onReady: () => void }) {
  const ready = useContext(AppReadyContext);
  const { colors, mode, reducedMotion } = useAppTheme();
  useEffect(() => {
    refreshSoberWidgets();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshSoberWidgets();
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.surface);
  }, [colors.surface]);
  return (
    <ThemeProvider
      value={{
        ...(mode === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
          background: colors.surface,
          card: colors.surface,
          text: colors.text,
          primary: colors.accent,
          border: colors.border,
        },
      }}
    >
      <ModalNavigationProvider>
        <ColorView background="surface" className="flex-1 bg-theme-surface" onLayout={onReady}>
          <NotificationController />
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reducedMotion ? 'none' : 'slide_from_right',
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="widget" options={{ animation: 'none' }} />
            {sheetRoutes.map((name) => (
              <Stack.Screen
                key={name}
                name={name}
                options={{
                  presentation: 'transparentModal',
                  animation: 'none',
                  gestureEnabled: false,
                  contentStyle: { backgroundColor: 'transparent' },
                }}
              />
            ))}
          </Stack>
          <FirstRunOnboarding ready={ready} />
        </ColorView>
      </ModalNavigationProvider>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  const { t, language } = useI18n();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [navigationReady, setNavigationReady] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [minimumSplashElapsed, setMinimumSplashElapsed] = useState(false);
  const appReady = navigationReady && imagesReady && minimumSplashElapsed;
  const onNavigationReady = useCallback(() => setNavigationReady(true), []);
  const onImagesReady = useCallback(() => setImagesReady(true), []);
  useEffect(() => {
    const timeout = setTimeout(() => setMinimumSplashElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);
  useEffect(() => {
    if (appReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [appReady]);
  const onError = useCallback((value: Error) => setError(value), []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View className="flex-1 bg-white">
          {error ? (
            <SafeAreaView
              style={{
                flex: 1,
                padding: 28,
                justifyContent: 'center',
                gap: 18,
                backgroundColor: themeColors('blue', 'light').accentLight,
              }}
              onLayout={() => {
                void SplashScreen.hideAsync();
              }}
            >
              <NativeText style={{ fontSize: 20 }}>{t('ui.startupFailed')}</NativeText>
              <NativeText>{translateErrorMessage(error.message, language)}</NativeText>
              <NativeText>{t('ui.recordsPreserved')}</NativeText>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setNavigationReady(false);
                  setImagesReady(false);
                  setError(null);
                  setAttempt((value) => value + 1);
                }}
                style={{
                  padding: 16,
                  backgroundColor: themeColors('blue', 'light').accent,
                  borderRadius: 16,
                  borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
                }}
              >
                <NativeText>{t('common.retry')}</NativeText>
              </Pressable>
            </SafeAreaView>
          ) : (
            <AppReadyContext.Provider value={appReady}>
              <SQLiteProvider
                key={attempt}
                databaseName="took.db"
                options={databaseOptions}
                onInit={initializeAppDatabase}
                onError={onError}
              >
                <SettingsProvider onError={onError}>
                  <AppThemeProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <NoticeProvider>
                        <Navigation onReady={onNavigationReady} />
                      </NoticeProvider>
                    </GestureHandlerRootView>
                  </AppThemeProvider>
                </SettingsProvider>
              </SQLiteProvider>
            </AppReadyContext.Provider>
          )}
          {!error && !appReady && <AppLoadingScreen onReady={onImagesReady} onError={onError} />}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
