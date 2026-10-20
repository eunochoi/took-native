import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/AppThemeProvider';
import { HABIT_RECORD_ICONS } from './recordIcons';
import {
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
  const color = resolveIconColor(colorKey, colors.accent);
  const resolvedSize = size ?? appRem * 1.75;
  if (name === 'meditation')
    return <MaterialCommunityIcons name="meditation" color={color} size={resolvedSize} />;
  const Icon = HABIT_RECORD_ICONS[name];
  return (
    <Icon
      color={color}
      size={resolvedSize}
      weight={name === 'language' || name === 'coding' ? 'bold' : 'fill'}
    />
  );
}
