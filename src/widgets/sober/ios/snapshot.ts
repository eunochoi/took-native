import Ionicons from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';
import MaterialCommunityIcons from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';
import type { Sober, SoberRestart } from '../../../db/types';
import { getCurrentSoberStart, SOBER_GOALS, SOBER_ICONS } from '../../../domain/sober';
import { ACCENT_PALETTES } from '../../../theme/colors';
import { isHabitIconColor, resolveIconColor } from '../../../domain/constants';
import type { Settings } from '../../../settings/model';

export function buildIosSoberWidgetSnapshot(
  sobers: Sober[],
  restarts: SoberRestart[],
  themeAccent: Settings['themeAccent'] = 'blue',
) {
  return {
    version: 1,
    goals: SOBER_GOALS,
    accents: Object.fromEntries(
      Object.entries(ACCENT_PALETTES).map(([key, palette]) => [key, palette.accent]),
    ),
    records: sobers.map((sober) => {
      const icon = SOBER_ICONS[sober.icon_key];
      const glyphs = icon.family === 'ionicons' ? Ionicons : MaterialCommunityIcons;
      return {
        id: sober.id,
        name: sober.name,
        startedAt:
          Date.parse(
            getCurrentSoberStart(
              sober,
              restarts.filter((item) => item.sober_id === sober.id),
            ),
          ) / 1000,
        goalMode: sober.goal_mode,
        goalDays: sober.goal_days,
        iconKey: sober.icon_key,
        iconColor: resolveIconColor(
          isHabitIconColor(sober.icon_color) ? sober.icon_color : 'theme',
          (ACCENT_PALETTES[themeAccent] ?? ACCENT_PALETTES.blue).accent,
        ),
        // Older installed widget binaries still read these fields.
        iconGlyph:
          icon.family === 'badge'
            ? '19'
            : String.fromCodePoint((glyphs as Record<string, number>)[icon.name]),
        iconFont:
          icon.family === 'badge'
            ? 'TmoneyRoundWind-ExtraBold'
            : icon.family === 'ionicons'
              ? 'Ionicons'
              : 'MaterialDesignIcons',
      };
    }),
  };
}
