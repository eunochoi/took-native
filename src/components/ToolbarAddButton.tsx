import { View } from 'react-native';
import { useAppTheme } from '../theme/AppThemeProvider';
import {
  TOOLBAR_BUTTON_CLASS_NAME,
  TOOLBAR_BUTTON_TEXT_CLASS_NAME,
  TOOLBAR_BUTTON_COLOR_CLASS_NAME,
} from '../theme/classes';
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
    <View className="shrink-0">
      <GesturePressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        className={`${TOOLBAR_BUTTON_CLASS_NAME} ${disabled ? 'opacity-50' : 'opacity-100'}`}
      >
        <AppIcon name="add" size={appRem * 1.2} className={TOOLBAR_BUTTON_COLOR_CLASS_NAME} />
        <Text className={TOOLBAR_BUTTON_TEXT_CLASS_NAME}>{label}</Text>
      </GesturePressable>
    </View>
  );
}
