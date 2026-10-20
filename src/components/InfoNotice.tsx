import type { ReactNode } from 'react';
import { View } from 'react-native';
import { twMerge } from 'tailwind-merge';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { Text } from './Text';

export function InfoNotice({ children, className }: { children: ReactNode; className?: string }) {
  const { colors, rem: appRem } = useAppTheme();
  return (
    <View className={twMerge('w-full flex-row items-start gap-2 px-2', className)}>
      <View className="h-5 w-4 shrink-0 items-center justify-center">
        <AppIcon name="info-outline" size={appRem} color={colors.accent} accessible={false} />
      </View>
      <Text className="flex-1 text-sm leading-5 text-theme-accent">{children}</Text>
    </View>
  );
}
