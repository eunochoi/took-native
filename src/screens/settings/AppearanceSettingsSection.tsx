import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ACCENT_LABELS as accentLabels, ACCENT_KEYS as accents } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { EmotionIconStyleSelector } from './EmotionIconStyleSelector';

const modes = ['light', 'dark', 'system'] as const;
const sizes = ['small', 'normal', 'large'] as const;
const modeLabels = { light: '밝게', dark: '어둡게', system: '자동' };
const sizeLabels = { small: '작게', normal: '보통', large: '크게' };
const previewSizes = { small: 13, normal: 17, large: 23 };
const emotionStyleLabels = { basic: '기본형', simple: '단순형', emoji: '이모지' };

export function AppearanceSettingsSection({
  settings,
  disabled,
  dimmed = disabled,
  onChange,
}: {
  settings: Settings;
  disabled: boolean;
  dimmed?: boolean;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        화면 꾸미기
      </Text>
      <View className="gap-6 py-2 px-1">
        <View className="gap-3">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">강조 색상</Text>
            <Text className="ml-auto text-base text-theme-accent">
              {accentLabels[settings.themeAccent]}
            </Text>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="강조 색상"
            className={`my-2 w-full flex-row items-start gap-1.5 py-2 ${dimmed ? 'opacity-40' : 'opacity-100'}`}
          >
            {accents.map((accent) => {
              const checked = settings.themeAccent === accent;
              return (
                <Pressable
                  key={accent}
                  accessibilityRole="radio"
                  accessibilityLabel={`${accentLabels[accent]} 강조 색상`}
                  accessibilityState={{ checked, disabled }}
                  disabled={disabled}
                  onPress={() => onChange({ themeAccent: accent })}
                  className="aspect-square min-w-0 flex-1 items-center justify-center rounded-full border active:opacity-65"
                  style={{
                    backgroundColor: ACCENT_PALETTES[accent].accent,
                    borderColor: ACCENT_PALETTES[accent].accentDeep,
                  }}
                >
                  {checked && (
                    <AppIcon
                      name="check"
                      size={appRem * 1.5}
                      className="text-theme-text-on-accent"
                      accessible={false}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="gap-3">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">감정 아이콘</Text>
            <Text className="ml-auto text-base text-theme-accent">
              {emotionStyleLabels[settings.emotionStyle]}
            </Text>
          </View>
          <EmotionIconStyleSelector
            value={settings.emotionStyle}
            disabled={disabled}
            dimmed={dimmed}
            onChange={(emotionStyle) => onChange({ emotionStyle })}
          />
        </View>
        <View className="gap-3">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">배경 색상</Text>
            <Text className="ml-auto text-base text-theme-accent">
              {modeLabels[settings.themeMode]}
            </Text>
          </View>
          <View accessibilityLabel="배경 색상" className="my-2 flex-row gap-2">
            {modes.map((themeMode) => {
              const selected = settings.themeMode === themeMode;
              return (
                <PickerOption
                  key={themeMode}
                  selected={selected}
                  disabled={disabled}
                  accessibilityLabel={`배경 색상, ${modeLabels[themeMode]}${themeMode === 'system' ? ', 기기 설정 따르기' : ''}`}
                  onPress={() => onChange({ themeMode })}
                  className={`h-[5.666667rem] flex-1 min-w-0 gap-1 px-2 py-2 ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <View className="h-9 items-center justify-center">
                    <AppIcon
                      name={`theme-${themeMode}`}
                      size={appRem * 1.75}
                      className={selected ? 'text-theme-accent' : 'text-theme-text-primary'}
                    />
                  </View>
                  <Text
                    className={`text-center text-sm leading-5 font-medium ${selected ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {modeLabels[themeMode]}
                  </Text>
                </PickerOption>
              );
            })}
          </View>
        </View>
        <View className="gap-3">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">폰트 크기</Text>
            <Text className="ml-auto text-base text-theme-accent">
              {sizeLabels[settings.fontSize]}
            </Text>
          </View>
          <View accessibilityLabel="폰트 크기" className="my-2 flex-row gap-2">
            {sizes.map((fontSize) => {
              const selected = settings.fontSize === fontSize;
              return (
                <PickerOption
                  key={fontSize}
                  selected={selected}
                  disabled={disabled}
                  accessibilityLabel={`폰트 크기, ${sizeLabels[fontSize]}`}
                  onPress={() => onChange({ fontSize })}
                  className={`h-[5.666667rem] flex-1 min-w-0 gap-1 px-2 py-2 ${dimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <View className="h-9 w-full items-center justify-center" accessible={false}>
                    <Text
                      size={previewSizes[fontSize]}
                      style={{ lineHeight: previewSizes[fontSize] * 1.25 }}
                      allowFontScaling={false}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      className={`w-full text-center font-semibold ${selected ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                    >
                      가나다
                    </Text>
                  </View>
                  <Text
                    className={`text-center text-sm leading-5 font-medium ${selected ? 'text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {sizeLabels[fontSize]}
                  </Text>
                </PickerOption>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
