import { AppIcon } from './AppIcon';
import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import type { ComponentProps, RefObject } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';

type BottomNavProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const items = [
  { name: 'index', label: '홈', icon: 'home' },
  { name: 'calendar', label: '월간 기록', icon: 'calendar' },
  { name: 'diary', label: '일기 목록', icon: 'diary' },
  { name: 'habit', label: '습관 만들기', icon: 'habit' },
  { name: 'sober', label: '절제', icon: 'sober' },
] as const;

export function BottomNav({
  state,
  navigation,
  blurTarget,
  blurTargetReady,
}: BottomNavProps & { blurTarget: RefObject<View | null>; blurTargetReady: boolean }) {
  const { iconSizes, rem: appRem, navigationHeight, navigationBottom } = useAppTheme();
  const settingRoute = state.routes.find((route) => route.name === 'setting');
  const settingSelected = state.routes[state.index].key === settingRoute?.key;
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 z-40 items-center"
      style={{ bottom: navigationBottom }}
    >
      <View
        pointerEvents="box-none"
        accessibilityRole="tablist"
        accessibilityLabel="주요 메뉴"
        className="self-center flex-row items-center gap-2"
      >
        <View className="rounded-full bg-theme-surface/40 shadow-lg">
          <View className="flex-row items-center gap-0 overflow-hidden rounded-full border border-theme-accent/15 px-1 py-1.5">
            {blurTargetReady && (
              <BlurView
                key={state.routes[state.index].key}
                pointerEvents="none"
                blurTarget={blurTarget}
                blurMethod="dimezisBlurViewSdk31Plus"
                intensity={50}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View pointerEvents="none" className="absolute inset-0 bg-theme-surface/40" />
            {items.map((item) => {
              const route = state.routes.find((entry) => entry.name === item.name);
              if (!route) return null;
              const selected = state.routes[state.index].key === route.key;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!selected && !event.defaultPrevented)
                      navigation.navigate(route.name, route.params);
                  }}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                  hitSlop={{ top: 4, bottom: 4 }}
                  className="h-11 w-12 items-center justify-center rounded-full"
                >
                  <View
                    className={`h-11 w-11 items-center justify-center overflow-hidden ${selected ? 'bg-theme-accent' : 'bg-transparent'}`}
                    style={{ borderRadius: (appRem * 2.75) / 2 }}
                  >
                    <AppIcon
                      name={item.icon}
                      size={iconSizes.md}
                      className={selected ? 'text-theme-text-on-accent' : 'text-theme-accent/80'}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        {settingRoute && (
          <View
            className="rounded-full bg-theme-surface/40 shadow-lg"
            style={{ width: navigationHeight, height: navigationHeight }}
          >
            <View className="h-full w-full overflow-hidden rounded-full border border-theme-accent/15">
              {blurTargetReady && (
                <BlurView
                  key={state.routes[state.index].key}
                  pointerEvents="none"
                  blurTarget={blurTarget}
                  blurMethod="dimezisBlurViewSdk31Plus"
                  intensity={50}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View pointerEvents="none" className="absolute inset-0 bg-theme-surface/40" />
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel="설정"
                accessibilityState={{ selected: settingSelected }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: settingRoute.key,
                    canPreventDefault: true,
                  });
                  if (!settingSelected && !event.defaultPrevented)
                    navigation.navigate(settingRoute.name, settingRoute.params);
                }}
                onLongPress={() =>
                  navigation.emit({ type: 'tabLongPress', target: settingRoute.key })
                }
                className={`h-full w-full items-center justify-center overflow-hidden ${settingSelected ? 'bg-theme-accent' : 'bg-transparent'}`}
                style={{ borderRadius: navigationHeight / 2 }}
              >
                <AppIcon
                  name="settings"
                  size={iconSizes.md}
                  className={settingSelected ? 'text-theme-text-on-accent' : 'text-theme-accent/80'}
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
