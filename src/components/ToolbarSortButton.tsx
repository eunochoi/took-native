import { useAppTheme } from '../theme/AppThemeProvider';
import {
  TOOLBAR_BUTTON_CLASS_NAME,
  TOOLBAR_BUTTON_TEXT_CLASS_NAME,
  TOOLBAR_BUTTON_COLOR_CLASS_NAME,
} from '../theme/classes';
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
      className={TOOLBAR_BUTTON_CLASS_NAME}
    >
      <AppIcon name="sort" size={appRem * 1.2} className={TOOLBAR_BUTTON_COLOR_CLASS_NAME} />
      <Text numberOfLines={1} className={TOOLBAR_BUTTON_TEXT_CLASS_NAME}>
        {label}
      </Text>
      {showPriority && (
        <>
          <Text className={`text-sm ${TOOLBAR_BUTTON_COLOR_CLASS_NAME}`}>·</Text>
          <StarIcon size={appRem * 1.1} className={TOOLBAR_BUTTON_COLOR_CLASS_NAME} />
        </>
      )}
    </GesturePressable>
  );
}
