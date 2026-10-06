import { Image, View, type ViewProps } from 'react-native';
import { Text } from './Text';
import { useAppTheme } from '../theme/AppThemeProvider';

export function OrganicBadge({
  tone,
  children,
  className = '',
  style,
}: {
  tone: 'home' | 'calendar' | 'restart';
  children?: number | string;
  className?: string;
  style?: ViewProps['style'];
}) {
  const { colors } = useAppTheme();
  return (
    <View
      className={`items-center justify-center ${tone === 'home' ? 'h-7 w-8' : 'h-6 w-6'} ${className}`}
      style={style}
    >
      <Image
        accessible={false}
        source={
          tone === 'home'
            ? require('../../assets/ui/badge-home.png')
            : require('../../assets/ui/badge-calendar.png')
        }
        className="absolute inset-0 h-full w-full"
        resizeMode="stretch"
        style={{
          tintColor:
            tone === 'restart'
              ? colors.soberRestart
              : tone === 'calendar'
                ? colors.accentDeep
                : colors.accent,
        }}
      />
      {children !== undefined && (
        <Text
          className={`text-xs font-semibold text-theme-text-on-accent ${tone === 'home' ? 'w-full text-center leading-tight' : ''}`}
          style={
            tone === 'home' ? { includeFontPadding: false, textAlignVertical: 'center' } : undefined
          }
        >
          {children}
        </Text>
      )}
    </View>
  );
}
