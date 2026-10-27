import { useI18n } from '../i18n/react';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';
import { GesturePressable } from './GesturePressable';

export function ToolbarAddButton({
  disabled = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  label?: string;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const { rem: appRem } = useAppTheme();
  return (
    <GesturePressable
      accessibilityRole="button"
      accessibilityLabel={label ?? t('ui.add')}
      disabled={disabled}
      onPress={onPress}
      className={`ml-auto w-10 shrink-0 flex-row items-center justify-end active:opacity-65 ${disabled ? 'opacity-50' : 'opacity-100'}`}
    >
      <AppIcon name="add" size={appRem * 1.2} className="text-theme-accent" />
    </GesturePressable>
  );
}
