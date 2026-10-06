import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { ACCENT_PALETTES } from '../../theme/colors';
import { SettingStepSelector } from './SettingStepSelector';

const accents = ['blue', 'green', 'purple', 'pink', 'yellow', 'grey'] as const;
const accentLabels = {
  blue: '파랑',
  green: '초록',
  purple: '보라',
  pink: '분홍',
  yellow: '딥 청록',
  grey: '회색',
};
const modes = ['light', 'dark', 'system'] as const;
const sizes = ['small', 'normal', 'large'] as const;

export function AppearanceSettingsSection({
  settings,
  disabled,
  onChange,
}: {
  settings: Settings;
  disabled: boolean;
  onChange: (patch: Partial<Settings>) => void;
}) {
  return (
    <View className="gap-12">
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
          색상
        </Text>
        <View className="gap-6 p-2">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">강조 색상</Text>
            <View className="ml-auto flex-row items-center justify-between gap-2">
              {accents.map((accent) => {
                const selected = settings.themeAccent === accent;
                return (
                  <Pressable
                    key={accent}
                    accessibilityRole="radio"
                    accessibilityLabel={`${accentLabels[accent]} 강조 색상`}
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    hitSlop={3}
                    onPress={() => onChange({ themeAccent: accent })}
                    className="h-8 w-8 items-center justify-center rounded-full border-2 active:opacity-65"
                    style={{
                      borderColor: selected ? ACCENT_PALETTES[accent].accent : 'transparent',
                    }}
                  >
                    <View
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: ACCENT_PALETTES[accent].accent }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">배경 색상</Text>
            <View className="ml-auto">
              <SettingStepSelector
                label="배경 색상"
                value={settings.themeMode}
                values={modes}
                labels={{ light: '밝게', dark: '어둡게', system: '시스템' }}
                disabled={disabled}
                onChange={(themeMode) => onChange({ themeMode })}
              />
            </View>
          </View>
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
          폰트
        </Text>
        <View className="gap-6 p-2">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">폰트 크기 선택</Text>
            <View className="ml-auto">
              <SettingStepSelector
                label="폰트 크기"
                value={settings.fontSize}
                values={sizes}
                labels={{ small: '작게', normal: '보통', large: '크게' }}
                disabled={disabled}
                onChange={(fontSize) => onChange({ fontSize })}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
