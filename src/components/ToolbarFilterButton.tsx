import { EMOTIONS } from '../domain/constants';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarFilterButton({
  year,
  month,
  emotion,
  onPress,
}: {
  year: number | null;
  month: number;
  emotion: number | null;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const isShortYear = !!month || !!emotion;
  const label =
    [
      year === null ? null : `${isShortYear ? year % 100 : year}년${month ? ` ${month}월` : ''}`,
      emotion === null ? null : EMOTIONS[emotion].name,
    ]
      .filter(Boolean)
      .join(' · ') || '전체';
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={`일기 필터, ${label}`}
      onPress={onPress}
      className="h-11 min-w-0 shrink flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65"
    >
      <AppIcon name="filter-list" size={appRem * 1.2} className="text-theme-accent" />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className="min-w-0 shrink text-sm leading-snug text-theme-text-secondary"
      >
        {label}
      </Text>
    </GesturePressable>
  );
}
