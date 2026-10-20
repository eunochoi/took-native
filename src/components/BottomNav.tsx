import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import tokens from '../theme/tokens.json';
import { AppIcon } from './AppIcon';

const navigationMetrics = tokens.metrics.navigation;
const surfaceClassName =
  'ios:curve-continuous rounded-full bg-theme-surface border border-theme-accent/25';

type BottomNavProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
const items = [
  { name: 'index', label: '홈', icon: 'home' },
  { name: 'calendar', label: '월간 기록', icon: 'calendar' },
  { name: 'diary', label: '일기 목록', icon: 'diary' },
  { name: 'habit', label: '습관 관리', icon: 'habit' },
  { name: 'sober', label: '거리두기', icon: 'sober' },
] as const;

export function BottomNav({ state, navigation }: BottomNavProps) {
  const { colors, rem, navigationHeight, navigationBottom } = useAppTheme();
  const navigationScale = navigationHeight / navigationMetrics.height;
  const iconSize = Math.min(24, Math.max(22, rem * 1.5));
  const shadowStyle = Platform.select({
    ios: {
      shadowColor: colors.accentText,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { shadowColor: `${colors.accentText}CC`, elevation: 3 },
  });
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
        <View className={surfaceClassName} style={shadowStyle}>
          <View
            className="flex-row items-center"
            style={{
              height: navigationHeight,
              gap: Platform.OS === 'android' ? 0 : navigationMetrics.itemGap * navigationScale,
              paddingHorizontal: navigationMetrics.horizontalPadding * navigationScale,
            }}
          >
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
                      size={iconSize}
                      color={selected ? colors.textOnAccent : `${colors.accent}CC`}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        {settingRoute && (
          <View
            className={surfaceClassName}
            style={[shadowStyle, { width: navigationHeight, height: navigationHeight }]}
          >
            <View className="h-full w-full">
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
                  size={iconSize}
                  color={settingSelected ? colors.textOnAccent : `${colors.accent}CC`}
                />
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
