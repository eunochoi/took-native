import { Pressable, type PressableProps } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import { AppIcon } from './AppIcon';

export function RecordMenuButton({
  muted = false,
  align = 'right',
  className,
  ...props
}: Omit<PressableProps, 'children'> & { muted?: boolean; align?: 'left' | 'right' }) {
  const { iconSizes } = useAppTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      className={`${className ?? ''} ${align === 'left' ? '-ml-2' : '-mr-2'}`}
    >
      <AppIcon
        name="more-vert"
        size={iconSizes.md}
        className={muted ? 'text-theme-text-tertiary' : 'text-theme-text-secondary'}
      />
    </Pressable>
  );
}
