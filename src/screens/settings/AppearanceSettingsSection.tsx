import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { ACCENT_KEYS as accents } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { EmotionIconStyleSelector } from './EmotionIconStyleSelector';

const modes = ['light', 'dark', 'system'] as const;
const sizes = ['small', 'normal', 'large'] as const;
const previewSizes = { small: 13, normal: 17, large: 23 };

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
  const { t } = useI18n();
  const modeLabels = {
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
    system: t('settings.themeSystem'),
  };
  const sizeLabels = {
    small: t('settings.small'),
    normal: t('settings.normal'),
    large: t('settings.large'),
  };
  const emotionStyleLabels = {
    basic: t('settings.basic'),
    simple: t('settings.simple'),
    emoji: t('settings.emoji'),
  };
  const accentLabels = {
    blue: t('settings.blue'),
    green: t('settings.green'),
    purple: t('settings.purple'),
    pink: t('settings.pink'),
    yellow: t('settings.yellow'),
    grey: t('settings.grey'),
  };
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        {t('settings.appearance')}
      </Text>
      <View className="gap-6 py-2 px-1">
        <View className="gap-3">
          <View className="w-full min-w-0 flex-row flex-wrap items-center justify-between gap-2">
            <Text className="min-w-0 text-base text-theme-text-secondary">
              {t('settings.accentColor')}
            </Text>
            <Text className="ml-auto text-base text-theme-accent">
              {accentLabels[settings.themeAccent]}
            </Text>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.accentColor')}
            className={`my-2 w-full flex-row items-start gap-3 py-2 ${dimmed ? 'opacity-40' : 'opacity-100'}`}
          >
            {accents.map((accent) => {
              const checked = settings.themeAccent === accent;
              return (
                <Pressable
                  key={accent}
                  accessibilityRole="radio"
                  accessibilityLabel={t('settings.accentChoice', { color: accentLabels[accent] })}
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
            <Text className="min-w-0 text-base text-theme-text-secondary">
              {t('settings.emotionIcons')}
            </Text>
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
            <Text className="min-w-0 text-base text-theme-text-secondary">
              {t('settings.background')}
            </Text>
            <Text className="ml-auto text-base text-theme-accent">
              {modeLabels[settings.themeMode]}
            </Text>
          </View>
          <View accessibilityLabel={t('settings.background')} className="my-2 flex-row gap-2">
            {modes.map((themeMode) => {
              const selected = settings.themeMode === themeMode;
              return (
                <PickerOption
                  key={themeMode}
                  selected={selected}
                  disabled={disabled}
                  accessibilityLabel={
                    themeMode === 'system'
                      ? t('settings.themeSystemChoice')
                      : t('settings.choice', {
                          setting: t('settings.background'),
                          value: modeLabels[themeMode],
                        })
                  }
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
            <Text className="min-w-0 text-base text-theme-text-secondary">
              {t('settings.fontSize')}
            </Text>
            <Text className="ml-auto text-base text-theme-accent">
              {sizeLabels[settings.fontSize]}
            </Text>
          </View>
          <View accessibilityLabel={t('settings.fontSize')} className="my-2 flex-row gap-2">
            {sizes.map((fontSize) => {
              const selected = settings.fontSize === fontSize;
              return (
                <PickerOption
                  key={fontSize}
                  selected={selected}
                  disabled={disabled}
                  accessibilityLabel={t('settings.choice', {
                    setting: t('settings.fontSize'),
                    value: sizeLabels[fontSize],
                  })}
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
                      {t('settings.fontPreview')}
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
