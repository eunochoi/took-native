import { useAppTheme } from '../theme/AppThemeProvider';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  HABIT_ICONS,
  resolveIconColor,
  DEFAULT_HABIT_ICON_COLOR,
  type HabitIconKey,
  type HabitIconColorKey,
} from '../domain/constants';

export function HabitIcon({
  name,
  colorKey = DEFAULT_HABIT_ICON_COLOR,
  size,
}: {
  name: HabitIconKey;
  colorKey?: HabitIconColorKey;
  size?: number;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const icon = HABIT_ICONS[name];
  const color = resolveIconColor(colorKey, colors.accent);
  const resolvedSize = size ?? appRem * 1.75;
  return icon.family === 'material-community' ? (
    <MaterialCommunityIcons name={icon.name} color={color} size={resolvedSize} />
  ) : (
    <Ionicons name={icon.name} color={color} size={resolvedSize} />
  );
}
