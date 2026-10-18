import { BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import type { ComponentProps, RefObject } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import tokens from '../theme/tokens.json';
import { AppIcon } from './AppIcon';

const navigationMetrics = tokens.metrics.navigation;

type BottomNavProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const items = [
  { name: 'index', label: '홈', icon: 'home' },
  { name: 'calendar', label: '월간 기록', icon: 'calendar' },
  { name: 'diary', label: '일기 목록', icon: 'diary' },
  { name: 'habit', label: '습관 관리', icon: 'habit' },
  { name: 'sober', label: '거리두기', icon: 'sober' },
] as const;

export function BottomNav({
  state,
  navigation,
  blurTarget,
  blurTargetReady,
}: BottomNavProps & { blurTarget: RefObject<View | null>; blurTargetReady: boolean }) {
  const { navigationHeight, navigationBottom } = useAppTheme();
  const navigationScale = navigationHeight / navigationMetrics.height;
  const backgroundClassName =
    state.routes[state.index].name === 'index' ? 'bg-theme-surface/60' : 'bg-theme-accent-light/20';
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
        className="self-center flex-row items-center"
        style={{ gap: navigationMetrics.groupGap * navigationScale }}
      >
        <View
          className={`ios:curve-continuous rounded-full ${backgroundClassName} shadow-lg ios:shadow-theme-overlay/20`}
        >
          <View
            className="flex-row items-center overflow-hidden ios:curve-continuous rounded-full border border-theme-accent/15"
            style={{
              height: navigationHeight,
              gap: Platform.OS === 'android' ? 0 : navigationMetrics.itemGap * navigationScale,
              paddingHorizontal: navigationMetrics.horizontalPadding * navigationScale,
            }}
          >
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
            <View pointerEvents="none" className={`absolute inset-0 ${backgroundClassName}`} />
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
                  className="items-center justify-center ios:curve-continuous rounded-full"
                  style={{
                    height: navigationMetrics.buttonSize * navigationScale,
                    width: navigationMetrics.itemWidth * navigationScale,
                  }}
                >
                  <View
                    className={`items-center justify-center overflow-hidden ${selected ? 'bg-theme-accent' : 'bg-transparent'}`}
                    style={{
                      height: navigationMetrics.buttonSize * navigationScale,
                      width: navigationMetrics.buttonSize * navigationScale,
                      borderRadius: (navigationMetrics.buttonSize * navigationScale) / 2,
                      borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
                    }}
                  >
                    <AppIcon
                      name={item.icon}
                      size={navigationMetrics.iconSize * navigationScale}
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
            className={`ios:curve-continuous rounded-full ${backgroundClassName} shadow-lg ios:shadow-theme-overlay/20`}
            style={{ width: navigationHeight, height: navigationHeight }}
          >
            <View className="h-full w-full overflow-hidden ios:curve-continuous rounded-full border border-theme-accent/15">
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
              <View pointerEvents="none" className={`absolute inset-0 ${backgroundClassName}`} />
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
                style={{
                  borderRadius: navigationHeight / 2,
                  borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
                }}
              >
                <AppIcon
                  name="settings"
                  size={navigationMetrics.iconSize * navigationScale}
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
