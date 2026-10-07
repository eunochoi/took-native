import type { WidgetInfo, WidgetTaskHandlerProps } from 'react-native-android-widget';
import { SOBER_WIDGET_NAME } from './model';
import { loadWidgetRecord, loadWidgetSettings, removeWidgetSettings } from './storage';
import { SoberWidget } from './SoberWidget';

export async function renderSoberWidget(info: WidgetInfo) {
  const settings = await loadWidgetSettings(info.widgetId);
  const record = settings
    ? await loadWidgetRecord(settings.soberId)
    : { sober: null, restarts: [] };
  return <SoberWidget settings={settings} {...record} width={info.width} height={info.height} />;
}
export async function soberWidgetTask(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== SOBER_WIDGET_NAME) return;
  if (props.widgetAction === 'WIDGET_DELETED') {
    await removeWidgetSettings(props.widgetInfo.widgetId);
    return;
  }
  if (props.widgetAction === 'WIDGET_CLICK') return;
  // Read failure throws: retain previously rendered content instead of replacing it.
  props.renderWidget(await renderSoberWidget(props.widgetInfo));
}
