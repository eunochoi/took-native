import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { ACCENT_KEYS, ACCENT_LABELS } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { EmotionIconStyleSelector } from '../settings/EmotionIconStyleSelector';

const modes = { light: '밝게', dark: '어둡게', system: '자동' } as const;
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
  const { rem } = useAppTheme();
  return (
    <View className="w-full gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-2xl font-semibold tracking-tight"
        >
          나에게 맞게 설정해요
        </Text>
        <Text className="text-center text-sm text-theme-text-secondary">
          지금 고른 모습이 앱에 바로 적용돼요.
        </Text>
      </View>
      <View className="gap-5">
        <View className="gap-3">
          <Text className="text-center text-base font-semibold">강조 색상</Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="강조 색상"
            className={`w-full flex-row items-start gap-3 ${busy ? 'opacity-40' : 'opacity-100'}`}
          >
            {ACCENT_KEYS.map((accent) => (
              <Pressable
                key={accent}
                accessibilityRole="radio"
                accessibilityLabel={`${ACCENT_LABELS[accent]} 강조 색상`}
                accessibilityState={{ checked: settings.themeAccent === accent, disabled: busy }}
                disabled={busy}
                onPress={() => void onChange({ themeAccent: accent })}
                className="aspect-square min-w-0 flex-1 items-center justify-center rounded-full border active:opacity-65"
                style={{
                  backgroundColor: ACCENT_PALETTES[accent].accent,
                  borderColor: ACCENT_PALETTES[accent].accentDeep,
                }}
              >
                {settings.themeAccent === accent && (
                  <AppIcon
                    name="check"
                    size={rem * 1.5}
                    className="text-theme-text-on-accent"
                    accessible={false}
                  />
                )}
              </Pressable>
            ))}
          </View>
        </View>
        <View className="gap-3">
          <Text className="text-center text-base font-semibold">감정 아이콘</Text>
          <EmotionIconStyleSelector
            compact
            value={settings.emotionStyle}
            disabled={busy}
            onChange={(emotionStyle) => void onChange({ emotionStyle })}
          />
        </View>
        <View className="gap-3">
          <Text className="text-center text-base font-semibold">배경 색상</Text>
          <View className="flex-row gap-2">
            {Object.entries(modes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selected={settings.themeMode === value}
                  disabled={busy}
                  accessibilityLabel={`${label} 배경`}
                  onPress={() => void onChange({ themeMode: value as Settings['themeMode'] })}
                >
                  <Text
                    className={`text-center text-sm ${settings.themeMode === value ? 'font-semibold text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-3">
          <Text className="text-center text-base font-semibold">폰트 크기</Text>
          <View className="flex-row gap-2">
            {Object.entries(sizes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selected={settings.fontSize === value}
                  disabled={busy}
                  accessibilityLabel={`${label} 글자 크기`}
                  onPress={() => void onChange({ fontSize: value as Settings['fontSize'] })}
                >
                  <Text
                    className={`text-center text-sm ${settings.fontSize === value ? 'font-semibold text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
      </View>
      <InfoNotice>설정에서 언제든 다시 바꿀 수 있어요.</InfoNotice>
    </View>
  );
}
