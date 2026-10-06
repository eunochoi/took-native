import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';
import { Text } from './Text';

export function ToolbarAddButton({
  disabled = false,
  label = '추가',
  onPress,
}: {
  disabled?: boolean;
  label?: string;
  onPress: () => void;
}) {
  const { rem: appRem } = useAppTheme();
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`h-11 shrink-0 flex-row items-center justify-center gap-1.5 px-3.5 active:opacity-65 ${disabled ? 'opacity-50' : 'opacity-100'}`}
    >
      <AppIcon name="add" size={appRem * 1.2} className="text-theme-accent" />
      <Text className="text-sm leading-snug text-theme-text-secondary">{label}</Text>
    </GesturePressable>
  );
}
