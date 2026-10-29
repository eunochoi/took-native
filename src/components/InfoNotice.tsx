import type { ReactNode } from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function InfoNotice({
  children,
  className,
  textClassName,
  adjustsFontSizeToFit = true,
  numberOfLines = 1,
}: {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  adjustsFontSizeToFit?: boolean;
  numberOfLines?: number;
}) {
  const { colors, rem: appRem } = useAppTheme();
  return (
    <View className={twMerge('w-full flex-row items-start gap-2 px-2', className)}>
      <View className="h-5 w-4 shrink-0 items-center justify-center">
        <AppIcon name="info-outline" size={appRem} color={colors.accent} accessible={false} />
      </View>
      <Text
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        className={twMerge(
          'flex-1 text-sm leading-5 text-theme-accent-deep tracking-tighter',
          textClassName,
        )}
      >
        {children}
      </Text>
    </View>
  );
}
