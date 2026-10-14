import { EMOTIONS } from '../domain/constants';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarFilterButton(
  props: {
    onPress: () => void;
  } & (
    | {
        year: number | null;
        currentYear: number;
        month: number;
        emotion: number | null;
      }
    | {
        label: string;
        accessibilityLabel: string;
      }
  ),
) {
  const { onPress } = props;
  const { year, currentYear, month, emotion } =
    'year' in props ? props : { year: null, currentYear: 0, month: 0, emotion: null };
  const { rem: appRem } = useAppTheme();
  const isDefault = year === null && emotion === null;
  const label =
    'label' in props
      ? props.label
      : [
          year === null
            ? null
            : year === currentYear
              ? month
                ? `${month}월`
                : '올해'
              : `${String(year % 100).padStart(2, '0')}년${month ? ` ${month}월` : ''}`,
          emotion === null ? null : EMOTIONS[emotion].name,
        ]
          .filter(Boolean)
          .join(' · ') || '필터';
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={
        'accessibilityLabel' in props
          ? props.accessibilityLabel
          : `일기 필터, ${isDefault ? '전체 기간 · 전체 감정' : [year === null ? null : `${year}년${month ? ` ${month}월` : ' 전체'}`, emotion === null ? null : EMOTIONS[emotion].name].filter(Boolean).join(' · ')}`
      }
      onPress={onPress}
      className="min-w-0 shrink flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65"
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
