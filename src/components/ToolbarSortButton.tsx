import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { StarIcon } from './StarIcon';
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
  ascendingLabel?: string;
  sortLabel?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const isDefault = sort === 'DESC' && !priorityFirst && (!recordSort || recordSort === 'DESC');
  const showPriority = sort !== 'CUSTOM' && priorityFirst;
  const displayLabel =
    sort === 'CUSTOM'
      ? '커스텀'
      : recordSort
        ? recordSort === 'DESC'
          ? '긴 기록순'
          : '짧은 기록순'
        : sort === 'DESC'
          ? '최신순'
          : '오래된순';
  const label =
    sort === 'CUSTOM'
      ? '커스텀'
      : `${recordSort ? `기록 ${recordSort === 'DESC' ? '내림차순' : '오름차순'} · ` : ''}${sortLabel} ${sort === 'DESC' ? '내림차순' : '오름차순'}`;
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${showPriority ? '중요도 우선 · ' : ''}${label}`}
      onPress={onPress}
      className="shrink-0 flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65"
    >
      {isDefault ? (
        <>
          <AppIcon name="sort" size={appRem * 1.2} className="text-theme-accent" />
          <Text className="text-sm leading-snug text-theme-text-secondary">정렬</Text>
        </>
      ) : (
        <>
          {showPriority && <StarIcon size={appRem * 1.1} className="text-theme-accent" />}
          <Text numberOfLines={1} className="text-sm leading-snug text-theme-text-secondary">
            {displayLabel}
          </Text>
        </>
      )}
    </GesturePressable>
  );
}
