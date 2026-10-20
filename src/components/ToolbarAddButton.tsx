import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';

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
      className={`ml-auto w-10 shrink-0 flex-row items-center justify-end active:opacity-65 ${disabled ? 'opacity-50' : 'opacity-100'}`}
    >
      <AppIcon name="add" size={appRem * 1.2} className="text-theme-accent" />
    </GesturePressable>
  );
}
