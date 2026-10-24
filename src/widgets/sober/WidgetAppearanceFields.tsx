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
  return (
    <>
      <View className="gap-3">
        <Text className="text-xl font-semibold">배경</Text>
        <View className="flex-row gap-3">
          {(['white', 'black', 'transparent'] as const).map((background) => (
            <View key={background} className="flex-1">
              <PickerOption
                compact
                selected={widgetSettings?.background === background}
                disabled={disabled}
                accessibilityLabel={`${background === 'white' ? '흰색' : background === 'black' ? '검정' : '투명'} 배경`}
                onPress={() => onChange({ background })}
              >
                <Text
                  className={`text-base ${widgetSettings?.background === background ? 'text-theme-accent-deep' : ''}`}
                >
                  {background === 'white' ? '흰색' : background === 'black' ? '검정' : '투명'}
                </Text>
              </PickerOption>
            </View>
          ))}
        </View>
      </View>
      <View className="gap-3">
        <Text className="text-xl font-semibold">글씨 색상</Text>
        <View className="flex-row gap-3">
          {(['black', 'white'] as const).map((textColor) => (
            <View key={textColor} className="flex-1">
              <PickerOption
                compact
                selected={widgetSettings?.textColor === textColor}
                disabled={disabled}
                accessibilityLabel={textColor === 'black' ? '검정 글씨' : '흰색 글씨'}
                onPress={() => onChange({ textColor })}
              >
                <Text
                  className={`text-base ${widgetSettings?.textColor === textColor ? 'text-theme-accent-deep' : ''}`}
                >
                  {textColor === 'black' ? '검정' : '흰색'}
                </Text>
              </PickerOption>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}
