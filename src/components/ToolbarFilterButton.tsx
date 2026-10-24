import { Fragment, type ReactNode } from 'react';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarFilterButton({
  onPress,
  label,
  accessibilityLabel,
}: {
  onPress: () => void;
  label: string | ReactNode[];
  accessibilityLabel: string;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="min-w-0 shrink flex-row items-center justify-center gap-1.5 active:opacity-65"
    >
      <AppIcon name="filter-list" size={appRem * 1.2} className="shrink-0 text-theme-accent" />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className="min-w-0 shrink text-sm leading-snug text-theme-text-secondary"
      >
        {typeof label === 'string'
          ? label
          : label.map((part, index) => (
              <Fragment key={index}>
                {index > 0 && ' · '}
                {part}
              </Fragment>
            ))}
      </Text>
    </GesturePressable>
  );
}
