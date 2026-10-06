import { View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';

export function TabBottomSpacer() {
  const { tabContentBottom } = useAppTheme();
  return (
    <View
      accessible={false}
      pointerEvents="none"
      className="shrink-0"
      style={{ height: tabContentBottom }}
    />
  );
}
