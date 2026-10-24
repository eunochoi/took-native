export const SOBER_WIDGET_NAME = 'Sober';
export interface SoberWidgetSettings {
  soberId: number;
  background: 'white' | 'black' | 'transparent';
  textColor: 'black' | 'white';
}
export const defaultWidgetSettings = (soberId: number): SoberWidgetSettings => ({
  soberId,
  background: 'white',
  textColor: 'black',
});
export function parseWidgetSettings(raw: unknown): SoberWidgetSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('위젯 설정을 확인해주세요.');
  const value = raw as SoberWidgetSettings;
  if (
    !Number.isSafeInteger(value.soberId) ||
    value.soberId <= 0 ||
    !['white', 'black', 'transparent'].includes(value.background) ||
    !['black', 'white'].includes(value.textColor)
  )
    throw new Error('위젯 설정을 확인해주세요.');
  return {
    soberId: value.soberId,
    background: value.background,
    textColor: value.textColor,
  };
}
