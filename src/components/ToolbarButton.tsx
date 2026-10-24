import { Fragment, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: 'sort' | 'filter-list';
  label: string | ReactNode[];
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  const [leadingWidth, setLeadingWidth] = useState(0);
  const [first, ...remaining] = typeof label === 'string' ? label.split(' · ') : label;
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={leadingWidth ? { minWidth: leadingWidth } : undefined}
      className="min-w-0 shrink flex-row items-center justify-center active:opacity-65"
    >
      <View
        onLayout={(event) => setLeadingWidth(event.nativeEvent.layout.width)}
        className="shrink-0 flex-row items-center gap-1.5"
      >
        <AppIcon name={icon} size={appRem * 1.2} className="shrink-0 text-theme-accent" />
        <Text numberOfLines={1} className="shrink-0 text-sm leading-snug text-theme-text-secondary">
          {first}
        </Text>
      </View>
      {remaining.length > 0 && (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className="min-w-0 shrink text-sm leading-snug text-theme-text-secondary"
        >
          {remaining.map((part, index) => (
            <Fragment key={index}> · {part}</Fragment>
          ))}
        </Text>
      )}
    </GesturePressable>
  );
}
