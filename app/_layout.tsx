// @refresh reset
import { themeColors } from '../src/theme/colors';
import { AppThemeProvider, useAppTheme } from '../src/theme/AppThemeProvider';
import '../global.css';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, Text as NativeText, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SQLiteProvider, type SQLiteDatabase, type SQLiteOpenOptions } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { migrateDatabase } from '../src/db/migrations';
import { SettingsProvider } from '../src/settings/SettingsProvider';
import { initializeMedia } from '../src/media';
import { AppLoadingScreen } from '../src/components/AppLoadingScreen';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, networkMode: 'always' },
    mutations: { networkMode: 'always', retry: false },
  },
});
export const unstable_settings = { initialRouteName: '(tabs)' };

// Fast Refresh can overlap the old connection's cleanup with the new setup.
const databaseOptions: SQLiteOpenOptions = { useNewConnection: __DEV__ };
async function initializeDatabase(db: SQLiteDatabase) {
  await migrateDatabase(db);
  await initializeMedia(db);
}

function Navigation({ onReady }: { onReady: () => void }) {
  const { colors, mode, reducedMotion } = useAppTheme();
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
      <View className="flex-1 bg-theme-surface" onLayout={onReady}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'slide_from_right',
            contentStyle: { backgroundColor: colors.surface },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
export default function RootLayout() {
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [navigationReady, setNavigationReady] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const onNavigationReady = useCallback(() => setNavigationReady(true), []);
  const onImagesReady = useCallback(() => setImagesReady(true), []);
  useEffect(() => {
    if (imagesReady) void SplashScreen.hideAsync().catch(() => undefined);
  }, [imagesReady]);
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
              <NativeText style={{ fontSize: 20 }}>앱을 준비하지 못했어요</NativeText>
              <NativeText>{error.message}</NativeText>
              <NativeText>기존 기록은 삭제하지 않았습니다. 다시 시도해주세요.</NativeText>
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
                }}
              >
                <NativeText>다시 시도</NativeText>
              </Pressable>
            </SafeAreaView>
          ) : (
            <SQLiteProvider
              key={attempt}
              databaseName="took.db"
              options={databaseOptions}
              onInit={initializeDatabase}
              onError={onError}
            >
              <SettingsProvider onError={onError}>
                <AppThemeProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <Navigation onReady={onNavigationReady} />
                  </GestureHandlerRootView>
                </AppThemeProvider>
              </SettingsProvider>
            </SQLiteProvider>
          )}
          {!error && (!navigationReady || !imagesReady) && (
            <AppLoadingScreen onReady={onImagesReady} />
          )}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
