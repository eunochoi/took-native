import { useI18n } from '../../i18n/react';
import { twMerge } from 'tailwind-merge';
import {
  SELECTION_BOX_CLASS_NAME,
  CHECKED_BOX_CLASS_NAME,
  UNCHECKED_BOX_CLASS_NAME,
} from '../../theme/classes';
import { useAppTheme } from '../../theme/AppThemeProvider';
import { Pressable, View } from 'react-native';
import { EmotionImage } from '../../components/EmotionImage';
import { Text } from '../../components/Text';
import type { Settings } from '../../settings/model';

export function EmotionIconStyleSelector({
  value,
  compact = false,
  disabled,
  dimmed = disabled,
  labelSize = 'sm',
  labelClassName,
  onChange,
}: {
  value: Settings['emotionStyle'];
  compact?: boolean;
  disabled: boolean;
  dimmed?: boolean;
  labelSize?: 'sm' | 'base';
  labelClassName?: string;
  onChange: (value: Settings['emotionStyle']) => void;
}) {
  const { rem: appRem } = useAppTheme();
  const { t } = useI18n();
  const labels = [t('settings.basic'), t('settings.simple'), t('settings.emoji')];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.emotionIconStyle')}
      className={`flex-row gap-2 ${compact ? '' : 'my-2'}`}
    >
      {(['basic', 'simple', 'emoji'] as const).map((style, index) => (
        <Pressable
          key={style}
          accessibilityRole="radio"
          accessibilityLabel={labels[index]}
          accessibilityState={{ checked: value === style, disabled }}
          disabled={disabled}
          onPress={() => onChange(style)}
          className={twMerge(
            SELECTION_BOX_CLASS_NAME,
            value === style ? CHECKED_BOX_CLASS_NAME : UNCHECKED_BOX_CLASS_NAME,
            'flex-1 px-2',
            compact ? 'gap-1 py-2' : 'h-[5.666667rem] min-w-0 gap-1 py-2',
            dimmed && 'opacity-40',
          )}
        >
          <View className={`flex-row items-center justify-center gap-1 ${compact ? '' : 'h-9'}`}>
            <EmotionImage emotion={0} iconStyle={style} size={appRem * 1.75} />
            <EmotionImage emotion={6} iconStyle={style} size={appRem * 1.75} />
          </View>
          <Text
            className={twMerge(
              `text-center ${labelSize === 'base' ? 'text-base' : 'text-sm'} font-medium ${compact ? '' : labelSize === 'base' ? 'leading-6' : 'leading-5'} ${value === style ? 'text-theme-accent-deep' : 'text-theme-text-primary'}`,
              labelClassName,
            )}
          >
            {labels[index]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
