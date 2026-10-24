import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarSortButton({
  sort,
  priorityFirst = false,
  recordSort,
  sortLabel = '생성일',
  accessibilityLabel,
  onPress,
}: {
  sort: 'ASC' | 'DESC' | 'CUSTOM';
  priorityFirst?: boolean;
  recordSort?: 'ASC' | 'DESC';
  sortLabel?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const showPriority = sort !== 'CUSTOM' && priorityFirst;
  const displayLabel =
    sort === 'CUSTOM'
      ? '커스텀'
      : [
          showPriority ? '중요' : null,
          recordSort === 'ASC' ? '짧은 기록' : null,
          sort === 'ASC' ? '과거' : null,
        ]
          .filter(Boolean)
          .join(' · ') || '정렬';
  const label =
    sort === 'CUSTOM'
      ? '커스텀'
      : `${recordSort ? `현재 기록 ${recordSort === 'DESC' ? '긴 기록순' : '짧은 기록순'} · ` : ''}${sortLabel} ${sort === 'DESC' ? '최신순' : '과거순'}`;
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${showPriority ? '중요한 항목 먼저 · ' : ''}${label}`}
      onPress={onPress}
      className="min-w-0 shrink flex-row items-center justify-center gap-1.5 active:opacity-65"
    >
      <AppIcon name="sort" size={appRem * 1.2} className="shrink-0 text-theme-accent" />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className="min-w-0 shrink text-sm leading-snug text-theme-text-secondary"
      >
        {displayLabel}
      </Text>
    </GesturePressable>
  );
}
