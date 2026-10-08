import { View } from 'react-native';
import { AppIcon } from '../../components/AppIcon';
import { Text } from '../../components/Text';
import { useAppTheme } from '../../theme/AppThemeProvider';

export function CalendarDiaryCount({ count }: { count: number }) {
  const { iconSizes } = useAppTheme();
  return (
    <View className="h-11 min-w-0 shrink flex-row items-center gap-1.5 px-3.5">
      <View className="h-5 shrink-0 items-center justify-center">
        <AppIcon
          name="diary"
          size={iconSizes.md}
          className="text-theme-accent -mb-0.5"
          style={{ includeFontPadding: false, lineHeight: iconSizes.sm }}
        />
      </View>
      <Text
        numberOfLines={1}
        className="shrink text-sm leading-5 text-theme-text-secondary"
        style={{ includeFontPadding: false }}
      >
        일기{' '}
        <Text
          className="text-sm leading-5 font-semibold text-theme-accent-deep"
          style={{ includeFontPadding: false }}
        >
          {count}
        </Text>
        개
      </Text>
    </View>
  );
}
