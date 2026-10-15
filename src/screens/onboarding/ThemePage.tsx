import { View } from 'react-native';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { ACCENT_KEYS, ACCENT_LABELS } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { EmotionIconStyleSelector } from '../settings/EmotionIconStyleSelector';

const modes = { system: '시스템', light: '밝게', dark: '어둡게' } as const;
const sizes = { small: '작게', normal: '보통', large: '크게' } as const;

export function ThemePage({
  settings,
  busy,
  onChange,
}: {
  settings: Settings;
  busy: boolean;
  onChange: (patch: Partial<Settings>) => Promise<void>;
}) {
  return (
    <View className="w-full gap-8">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          나에게 맞게 설정해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          취향에 맞게 고르고, 언제든 다시 바꿔요.
        </Text>
      </View>
      <View className="gap-6 ios:curve-continuous rounded-2xl bg-theme-surface-muted p-4">
        <View className="gap-1">
          <Text className="text-center text-sm font-semibold">감정 아이콘</Text>
          <EmotionIconStyleSelector
            compact
            value={settings.emotionStyle}
            disabled={busy}
            onChange={(emotionStyle) => void onChange({ emotionStyle })}
          />
        </View>
        <View className="gap-1">
          <Text className="text-center text-sm font-semibold">강조 색상</Text>
          <View className="flex-row gap-1">
            {ACCENT_KEYS.map((accent) => (
              <View key={accent} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selectionOnly
                  selected={settings.themeAccent === accent}
                  disabled={busy}
                  accessibilityLabel={`${ACCENT_LABELS[accent]} 강조 색상`}
                  onPress={() => void onChange({ themeAccent: accent })}
                >
                  <View
                    className="h-6 w-6 ios:curve-continuous rounded-full"
                    style={{ backgroundColor: ACCENT_PALETTES[accent].accent }}
                  />
                  <Text
                    className={`text-center text-xs ${settings.themeAccent === accent ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {accent === 'yellow' ? '청록' : ACCENT_LABELS[accent]}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-1">
          <Text className="text-center text-sm font-semibold">배경 색상</Text>
          <View className="flex-row gap-2">
            {Object.entries(modes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selectionOnly
                  selected={settings.themeMode === value}
                  disabled={busy}
                  accessibilityLabel={`${label} 배경`}
                  onPress={() => void onChange({ themeMode: value as Settings['themeMode'] })}
                >
                  <Text
                    className={`text-center text-sm ${settings.themeMode === value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-1">
          <Text className="text-center text-sm font-semibold">글자 크기</Text>
          <View className="flex-row gap-2">
            {Object.entries(sizes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selectionOnly
                  selected={settings.fontSize === value}
                  disabled={busy}
                  accessibilityLabel={`${label} 글자 크기`}
                  onPress={() => void onChange({ fontSize: value as Settings['fontSize'] })}
                >
                  <Text
                    className={`text-center text-sm ${settings.fontSize === value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
