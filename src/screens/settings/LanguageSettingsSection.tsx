import { View } from 'react-native';
import { PickerOption } from '../../components/PickerOption';
import { Text } from '../../components/Text';
import { useI18n } from '../../i18n/react';
import type { Settings } from '../../settings/model';

export function LanguageSettingsSection({
  value,
  disabled,
  onChange,
}: {
  value: Settings['language'];
  disabled: boolean;
  onChange: (language: Settings['language']) => void;
}) {
  const { t } = useI18n();
  const choices = [
    { value: 'system', label: t('language.system') },
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
  ] as const;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl py-2 font-semibold">
        {t('language.title')}
      </Text>
      <View accessibilityLabel={t('language.title')} className="flex-row gap-2 py-2 px-1">
        {choices.map((choice) => (
          <PickerOption
            key={choice.value}
            selected={value === choice.value}
            disabled={disabled}
            accessibilityLabel={choice.label}
            onPress={() => onChange(choice.value)}
            className="flex-1 min-w-0 items-center justify-center px-2 py-3"
          >
            <Text
              className={`text-center text-sm leading-5 font-medium ${value === choice.value ? 'text-theme-accent' : 'text-theme-text-primary'}`}
            >
              {choice.label}
            </Text>
          </PickerOption>
        ))}
      </View>
    </View>
  );
}
