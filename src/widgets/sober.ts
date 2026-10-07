import { TurboModuleRegistry } from 'react-native';
import { SOBER_WIDGET_NAME } from './sober/model';

// Do not import the widget package on old APKs/Expo Go: its enforcing TurboModule
// would fail at import time. Widget failure must never fail a saved record.
export function refreshSoberWidgets() {
  if (!TurboModuleRegistry.get('AndroidWidget')) return;
  void Promise.resolve()
    .then(async () => {
      const { getWidgetInfo, requestWidgetUpdateById } =
        require('react-native-android-widget') as typeof import('react-native-android-widget');
      const { renderSoberWidget } = require('./sober/task') as typeof import('./sober/task');
      const widgets = await getWidgetInfo(SOBER_WIDGET_NAME);
      await Promise.all(
        widgets.map(({ widgetId }) =>
          requestWidgetUpdateById({
            widgetName: SOBER_WIDGET_NAME,
            widgetId,
            renderWidget: renderSoberWidget,
          }),
        ),
      );
    })
    .catch((error: unknown) => {
      if (__DEV__) console.warn('절제 타이머 위젯을 갱신하지 못했어요.', error);
    });
}
