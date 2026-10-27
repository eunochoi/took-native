import { useI18n } from '../../i18n/react';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { InfoNotice } from '../../components/InfoNotice';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';
import { ACCENT_KEYS } from '../../theme/accents';
import { ACCENT_PALETTES } from '../../theme/colors';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { EmotionIconStyleSelector } from '../settings/EmotionIconStyleSelector';

export function ThemePage({
  settings,
  busy,
  onChange,
}: {
  settings: Settings;
  busy: boolean;
  onChange: (patch: Partial<Settings>) => Promise<void>;
}) {
  const { t } = useI18n();
  const modes = {
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
    system: t('settings.themeSystem'),
  };
  const sizes = {
    small: t('settings.small'),
    normal: t('settings.normal'),
    large: t('settings.large'),
  };
  const { rem } = useAppTheme();
  return (
    <View className="w-full grow justify-between gap-6">
      <View className="gap-2">
        <Text
          accessibilityRole="header"
          className="text-center text-[21px] leading-[28px] font-semibold tracking-tight"
        >
          {t('onboarding.themeTitle')}
        </Text>
        <Text className="text-center text-[14px] leading-[21px] text-theme-text-secondary">
          {t('onboarding.themeDescription')}
        </Text>
      </View>
      <View className="gap-5">
        <View className="gap-3">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('settings.accentColor')}
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('settings.accentColor')}
            className={`w-full flex-row items-start gap-3 ${busy ? 'opacity-40' : 'opacity-100'}`}
          >
            {ACCENT_KEYS.map((accent) => (
              <Pressable
                key={accent}
                accessibilityRole="radio"
                accessibilityLabel={t('settings.accentChoice', { color: t(`settings.${accent}`) })}
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
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('settings.emotionIcons')}
          </Text>
          <EmotionIconStyleSelector
            compact
            labelSize="base"
            labelClassName="text-[14px] leading-[21px]"
            value={settings.emotionStyle}
            disabled={busy}
            onChange={(emotionStyle) => void onChange({ emotionStyle })}
          />
        </View>
        <View className="gap-3">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('settings.background')}
          </Text>
          <View className="flex-row gap-2">
            {Object.entries(modes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selected={settings.themeMode === value}
                  disabled={busy}
                  accessibilityLabel={t('onboarding.backgroundChoice', { value: label })}
                  onPress={() => void onChange({ themeMode: value as Settings['themeMode'] })}
                >
                  <Text
                    className={`text-center text-[14px] leading-[21px] ${settings.themeMode === value ? 'font-semibold text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-3">
          <Text className="text-center text-[15.75px] leading-[24.5px] font-semibold">
            {t('settings.fontSize')}
          </Text>
          <View className="flex-row gap-2">
            {Object.entries(sizes).map(([value, label]) => (
              <View key={value} className="flex-1">
                <PickerOption
                  compact
                  dense
                  selected={settings.fontSize === value}
                  disabled={busy}
                  accessibilityLabel={t('onboarding.fontChoice', { value: label })}
                  onPress={() => void onChange({ fontSize: value as Settings['fontSize'] })}
                >
                  <Text
                    className={`text-center text-[14px] leading-[21px] ${settings.fontSize === value ? 'font-semibold text-theme-accent' : 'text-theme-text-primary'}`}
                  >
                    {label}
                  </Text>
                </PickerOption>
              </View>
            ))}
          </View>
        </View>
      </View>
      <InfoNotice textClassName="text-[10.5px] leading-[17.5px]" adjustsFontSizeToFit={false}>
        {t('onboarding.themeNotice')}
      </InfoNotice>
    </View>
  );
}
