import { useCallback } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useRoute, type NavigationProp, type ParamListBase } from 'expo-router/react-navigation';
import { useModalTransition } from '../src/navigation/ModalNavigationProvider';
import { useAppTheme } from '../src/theme/AppThemeProvider';

export default function WidgetEntry() {
  const { soberId } = useLocalSearchParams<{ soberId?: string }>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { key } = useRoute();
  const { resetTransitions } = useModalTransition();
  const { colors } = useAppTheme();
  useFocusEffect(
    useCallback(() => {
      let frame: number | undefined;
      let entered = false;
      const enter = () => {
        if (entered || AppState.currentState !== 'active' || frame !== undefined) return;
        frame = requestAnimationFrame(() => {
          frame = undefined;
          if (!navigation.isFocused() || AppState.currentState !== 'active') return;
          const id = typeof soberId === 'string' && /^\d+$/.test(soberId) ? Number(soberId) : NaN;
          const detail = Number.isSafeInteger(id) && id > 0;
          entered = true;
          // Only mount the tab here. Its focused screen owns the later modal push.
          resetTransitions();
          const tabs = navigation.getState().routes.find((route) => route.name === '(tabs)');
          navigation.reset({
            index: 0,
            routes: [
              {
                name: '(tabs)',
                ...(tabs ? { key: tabs.key } : {}),
                state: {
                  index: 0,
                  routes: [
                    {
                      name: 'sober',
                      params: detail ? { widgetSoberId: String(id), widgetRequest: key } : {},
                    },
                  ],
                },
              },
            ],
          });
        });
      };
      enter();
      const subscription = AppState.addEventListener('change', enter);
      return () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        subscription.remove();
      };
    }, [navigation, soberId, key, resetTransitions]),
  );
  return (
    <View className="flex-1 items-center justify-center bg-theme-surface">
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
