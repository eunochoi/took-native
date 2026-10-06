import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { StarIcon } from './StarIcon';
import { Text } from './Text';

export function ToolbarSortButton({
  sort,
  priorityFirst = false,
  ascendingLabel = '과거순',
  accessibilityLabel,
  onPress,
}: {
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  ascendingLabel?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const label = sort === 'CUSTOM' ? '커스텀' : sort === 'DESC' ? '최신순' : ascendingLabel;
  const showPriority = sort !== 'CUSTOM' && priorityFirst;
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${label}${showPriority ? ' · 중요도 우선' : ''}`}
      onPress={onPress}
      className="h-11 shrink-0 flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65"
    >
      <AppIcon name="sort" size={appRem * 1.2} className="text-theme-accent" />
      <Text numberOfLines={1} className="text-sm leading-snug text-theme-text-secondary">
        {label}
      </Text>
      {showPriority && (
        <>
          <Text className="text-sm text-theme-accent">·</Text>
          <StarIcon size={appRem * 1.1} className="text-theme-accent" />
        </>
      )}
    </GesturePressable>
  );
}
