import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import type { NavigationProp, ParamListBase } from 'expo-router/react-navigation';
import { useModalTransition } from './ModalNavigationProvider';

// The sober tab must be focused before a widget can open its detail sheet.
export function useWidgetDetail() {
  const { widgetSoberId, widgetRequest } = useLocalSearchParams<{
    widgetSoberId?: string;
    widgetRequest?: string;
  }>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { openModal } = useModalTransition();
  const handled = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      const id =
        typeof widgetSoberId === 'string' && /^\d+$/.test(widgetSoberId)
          ? Number(widgetSoberId)
          : NaN;
      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        typeof widgetRequest !== 'string' ||
        handled.current === widgetRequest
      )
        return;
      let frame: number | undefined;
      const open = () => {
        if (AppState.currentState !== 'active' || frame !== undefined) return;
        frame = requestAnimationFrame(() => {
          frame = undefined;
          if (
            !navigation.isFocused() ||
            AppState.currentState !== 'active' ||
            handled.current === widgetRequest
          )
            return;
          if (openModal({ pathname: '/sober/[id]', params: { id: String(id) } })) {
            handled.current = widgetRequest;
            navigation.setParams({ widgetSoberId: undefined, widgetRequest: undefined });
          }
        });
      };
      open();
      const subscription = AppState.addEventListener('change', open);
      return () => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        subscription.remove();
      };
    }, [navigation, openModal, widgetSoberId, widgetRequest]),
  );
}
