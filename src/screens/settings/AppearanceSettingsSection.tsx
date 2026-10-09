import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { ACCENT_KEYS as accents, ACCENT_LABELS as accentLabels } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { AppearanceSettingsPicker } from './AppearanceSettingsPicker';

const modes = ['light', 'dark', 'system'] as const;
const sizes = ['small', 'normal', 'large'] as const;
const modeLabels = { light: '밝게', dark: '어둡게', system: '시스템' };
const sizeLabels = { small: '작게', normal: '보통', large: '크게' };

export function AppearanceSettingsSection({
  settings,
  disabled,
  onChange,
  onApply,
}: {
  settings: Settings;
  disabled: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onApply: (patch: Partial<Settings>) => Promise<void>;
}) {
  const [selected, setSelected] = useState<'themeMode' | 'fontSize' | null>(null);
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`배경 색상, ${modeLabels[settings.themeMode]}`}
              accessibilityState={{ disabled }}
              disabled={disabled}
              hitSlop={8}
              onPress={() => setSelected('themeMode')}
              className={`ml-auto h-8 justify-center px-2 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
            >
              <Text className="text-base text-theme-accent">{modeLabels[settings.themeMode]}</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <View className="gap-3">
        <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
          폰트
        </Text>
        <View className="p-2 w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
          <Text className="min-w-0 text-base text-theme-text-secondary">폰트 크기 선택</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`폰트 크기, ${sizeLabels[settings.fontSize]}`}
            accessibilityState={{ disabled }}
            disabled={disabled}
            hitSlop={8}
            onPress={() => setSelected('fontSize')}
            className={`ml-auto h-8 justify-center px-2 active:opacity-65 ${disabled ? 'opacity-40' : 'opacity-100'}`}
          >
            <Text className="text-base text-theme-accent">{sizeLabels[settings.fontSize]}</Text>
          </Pressable>
        </View>
      </View>
      {selected === 'themeMode' && (
        <AppearanceSettingsPicker
          title="배경 색상"
          value={settings.themeMode}
          values={modes}
          labels={modeLabels}
          onClose={() => setSelected(null)}
          onApply={(themeMode) => onApply({ themeMode })}
        />
      )}
      {selected === 'fontSize' && (
        <AppearanceSettingsPicker
          title="폰트 크기"
          value={settings.fontSize}
          values={sizes}
          labels={sizeLabels}
          onClose={() => setSelected(null)}
          onApply={(fontSize) => onApply({ fontSize })}
        />
      )}
    </View>
  );
}
