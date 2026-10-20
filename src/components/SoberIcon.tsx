import { SOBER_RECORD_ICONS } from './recordIcons';
import { useId } from 'react';
import Svg, { Circle, Defs, Mask, Text as SvgText } from 'react-native-svg';
import type { SoberIconKey } from '../domain/sober';
import {
  resolveIconColor,
  DEFAULT_HABIT_ICON_COLOR,
  type HabitIconColorKey,
} from '../domain/constants';
import { useAppTheme } from '../theme/AppThemeProvider';

export function SoberIcon({
  name,
  colorKey = DEFAULT_HABIT_ICON_COLOR,
  size,
}: {
  name: SoberIconKey;
  colorKey?: HabitIconColorKey;
  size?: number;
}) {
  const { colors, rem: appRem } = useAppTheme();
  const maskId = useId();
  const color = resolveIconColor(colorKey, colors.accent);
  const iconSize = size ?? appRem * 1.75;
  if (name === 'age19')
    return (
      <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100" accessible={false}>
        <Defs>
          <Mask id={maskId} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
            <Circle cx="50" cy="50" r="50" fill="white" />
            <SvgText x="50" y="67" textAnchor="middle" fontSize="48" fontWeight="bold" fill="black">
              19
            </SvgText>
          </Mask>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={color} mask={`url(#${maskId})`} />
      </Svg>
    );
  const Icon = SOBER_RECORD_ICONS[name];
  return <Icon color={color} size={iconSize} weight="fill" />;
}
