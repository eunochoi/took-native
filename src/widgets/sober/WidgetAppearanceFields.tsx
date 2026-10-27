import { useI18n } from '../../i18n/react';
import { View } from 'react-native';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { SoberWidgetSettings } from './model';

export function WidgetAppearanceFields({
  settings: widgetSettings,
  disabled,
  onChange,
}: {
  settings: SoberWidgetSettings | null;
  disabled: boolean;
  onChange: (patch: Partial<SoberWidgetSettings>) => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <View className="gap-3">
        <Text className="text-xl font-semibold">{t('widget.background')}</Text>
        <View className="flex-row gap-3">
          {(['white', 'black', 'transparent'] as const).map((background) => (
            <View key={background} className="flex-1">
              <PickerOption
                compact
                selected={widgetSettings?.background === background}
                disabled={disabled}
                accessibilityLabel={t('widget.backgroundChoice', {
                  value: t(`widget.${background}`),
                })}
                onPress={() => onChange({ background })}
              >
                <Text
                  className={`text-base ${widgetSettings?.background === background ? 'text-theme-accent-deep' : ''}`}
                >
                  {t(`widget.${background}`)}
                </Text>
              </PickerOption>
            </View>
          ))}
        </View>
      </View>
      <View className="gap-3">
        <Text className="text-xl font-semibold">{t('widget.textColor')}</Text>
        <View className="flex-row gap-3">
          {(['black', 'white'] as const).map((textColor) => (
            <View key={textColor} className="flex-1">
              <PickerOption
                compact
                selected={widgetSettings?.textColor === textColor}
                disabled={disabled}
                accessibilityLabel={t('widget.textChoice', { value: t(`widget.${textColor}`) })}
                onPress={() => onChange({ textColor })}
              >
                <Text
                  className={`text-base ${widgetSettings?.textColor === textColor ? 'text-theme-accent-deep' : ''}`}
                >
                  {t(`widget.${textColor}`)}
                </Text>
              </PickerOption>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}
