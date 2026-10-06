import { useAppTheme } from '../theme/AppThemeProvider';
import { cssInterop } from 'nativewind';
import { Text as NativeText, type TextProps } from 'react-native';
export function Text({
  style,
  bold,
  size,
  ...props
}: TextProps & { bold?: boolean; size?: number }) {
  const { colors, rem: appRem } = useAppTheme();
  const resolvedSize = size ?? appRem;
  const textStyle = [
    {
      fontFamily: bold ? 'TmoneyBold' : 'Tmoney',
      color: colors.text,
      fontSize: resolvedSize,
      lineHeight: resolvedSize * 1.5,
    },
    style,
  ];
  return <NativeText {...props} style={textStyle} />;
}

cssInterop(Text, { className: 'style' });
