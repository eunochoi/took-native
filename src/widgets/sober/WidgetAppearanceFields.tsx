import { Pressable, View } from 'react-native';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { ACCENT_KEYS, ACCENT_LABELS } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
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
        <Text className="text-xl font-semibold">강조 색상</Text>
        <View className="flex-row items-center justify-between gap-2 px-2">
          {ACCENT_KEYS.map((accent) => (
            <Pressable
              key={accent}
              accessibilityRole="radio"
              accessibilityLabel={ACCENT_LABELS[accent]}
              accessibilityState={{ selected: widgetSettings?.accent === accent, disabled }}
              disabled={disabled}
              onPress={() => onChange({ accent })}
              className={`h-10 w-10 items-center justify-center rounded-full border-2 active:opacity-65 ${disabled ? 'opacity-40' : ''}`}
              style={{
                borderColor:
                  widgetSettings?.accent === accent ? ACCENT_PALETTES[accent].accent : 'transparent',
              }}
            >
              <View
                className="h-8 w-8 rounded-full"
                style={{ backgroundColor: ACCENT_PALETTES[accent].accent }}
              />
            </Pressable>
          ))}
        </View>
      </View>
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
                  className={`text-base ${widgetSettings?.background === background ? 'text-theme-accent' : ''}`}
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
                  className={`text-base ${widgetSettings?.textColor === textColor ? 'text-theme-accent' : ''}`}
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
