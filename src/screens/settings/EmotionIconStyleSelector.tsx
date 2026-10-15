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
  onChange,
}: {
  value: Settings['emotionStyle'];
  compact?: boolean;
  disabled: boolean;
  dimmed?: boolean;
  onChange: (value: Settings['emotionStyle']) => void;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="감정 아이콘 스타일"
      className="flex-row gap-2"
    >
      {(['basic', 'simple', 'emoji'] as const).map((style, index) => (
        <Pressable
          key={style}
          accessibilityRole="radio"
          accessibilityLabel={['기본형', '단순형', '이모지'][index]}
          accessibilityState={{ checked: value === style, disabled }}
          disabled={disabled}
          onPress={() => onChange(style)}
          className={`flex-1 items-center px-2 ios:curve-continuous rounded-theme ${compact ? 'gap-1 py-2' : 'gap-3 py-6'} ${dimmed ? 'opacity-40' : ''} ${value === style ? `border border-theme-accent ${compact ? 'bg-transparent' : 'bg-theme-accent/10'}` : 'border border-transparent'}`}
        >
          <View className="flex-row items-center gap-1">
            <EmotionImage emotion={0} iconStyle={style} size={appRem * 1.75} />
            <EmotionImage emotion={6} iconStyle={style} size={appRem * 1.75} />
          </View>
          <Text
            className={`text-center text-sm font-medium ${compact && value === style ? 'text-theme-accent' : 'text-theme-text-primary'}`}
          >
            {['기본형', '단순형', '이모지'][index]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
