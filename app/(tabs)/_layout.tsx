import { Tabs } from 'expo-router';
import { Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from '../../src/components/BottomNav';
import { useAppTheme } from '../../src/theme/AppThemeProvider';
import tokens from '../../src/theme/tokens.json';

export default function TabLayout() {
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
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="calendar" options={{ title: '월간 기록' }} />
      <Tabs.Screen name="diary" options={{ title: '일기 목록' }} />
      <Tabs.Screen name="habit" options={{ title: '습관 관리' }} />
      <Tabs.Screen name="sober" options={{ title: '거리두기' }} />
      <Tabs.Screen name="setting" options={{ title: '설정' }} />
    </Tabs>
  );
}
