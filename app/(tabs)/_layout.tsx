import { useI18n } from '../../src/i18n/react';
import { Tabs } from 'expo-router';
import { Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../../src/components/BottomNav';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import tokens from '../../src/theme/tokens.json';

export default function TabLayout() {
  const { t } = useI18n();
  const { colors, reducedMotion } = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenLayout={({ route, children }) => (
        <View
          className={`flex-1 ${route.name === 'index' ? 'bg-theme-accent-light' : 'bg-theme-surface'}`}
          style={{ paddingTop: insets.top }}
        >
          {children}
        </View>
      )}
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'shift',
        transitionSpec: {
          animation: 'timing',
          config: { duration: tokens.motion.tab, easing: Easing.out(Easing.ease) },
        },
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('navigation.index') }} />
      <Tabs.Screen name="calendar" options={{ title: t('navigation.calendar') }} />
      <Tabs.Screen name="diary" options={{ title: t('navigation.diary') }} />
      <Tabs.Screen name="habit" options={{ title: t('navigation.habit') }} />
      <Tabs.Screen name="sober" options={{ title: t('navigation.sober') }} />
      <Tabs.Screen name="setting" options={{ title: t('navigation.setting') }} />
    </Tabs>
  );
}
