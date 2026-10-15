import { Platform, Text as NativeText, View } from 'react-native';
import { themeColors } from '../theme/colors';

const defaultColors = themeColors('blue', 'light');

export function Wordmark({
  size = 36,
  color = defaultColors.text,
  accentColor = defaultColors.accent,
}: {
  size?: number;
  color?: string;
  accentColor?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel="to:ok"
      className="shrink-0 flex-row items-baseline gap-0.5"
    >
      <NativeText
        accessible={false}
        allowFontScaling={false}
        style={{
          fontFamily: 'FredokaWordmark',
          fontSize: size,
          lineHeight: size,
          includeFontPadding: false,
          color,
        }}
      >
        to:ok
      </NativeText>
      <View
        accessible={false}
        style={{
          width: size * 0.23,
          height: size * 0.23,
          borderRadius: (size * 0.23) / 2,
          borderCurve: Platform.OS === 'ios' ? 'continuous' : undefined,
          backgroundColor: accentColor,
        }}
      />
    </View>
  );
}
