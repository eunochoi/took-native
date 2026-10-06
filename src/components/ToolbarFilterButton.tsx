import { EMOTIONS } from '../domain/constants';
import { useAppTheme } from '../theme/AppThemeProvider';
import {
  TOOLBAR_BUTTON_CLASS_NAME,
  TOOLBAR_BUTTON_COLOR_CLASS_NAME,
  TOOLBAR_BUTTON_TEXT_CLASS_NAME,
} from '../theme/classes';
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
  const isShortYear = (!!month || !!emotion);
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
      className={`${TOOLBAR_BUTTON_CLASS_NAME} min-w-0 shrink`}
    >
      <AppIcon name="filter-list" size={appRem * 1.2} className={TOOLBAR_BUTTON_COLOR_CLASS_NAME} />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className={`${TOOLBAR_BUTTON_TEXT_CLASS_NAME} min-w-0 shrink`}
      >
        {label}
      </Text>
    </GesturePressable>
  );
}
