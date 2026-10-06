import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Svg, { Path } from 'react-native-svg';

// Screen code uses one name per intent; glyphs and rendering live here.
const APP_ICONS = {
  home: { family: 'material', name: 'home' },
  diary: { family: 'ionicons', name: 'journal' },
  add: { family: 'ionicons', name: 'add' },
  close: { family: 'ionicons', name: 'close' },
  'chevron-left': { family: 'ionicons', name: 'chevron-back' },
  'chevron-right': { family: 'ionicons', name: 'chevron-forward' },
  'chevron-up': { family: 'ionicons', name: 'chevron-up' },
  'chevron-down': { family: 'ionicons', name: 'chevron-down' },
  sort: { family: 'ionicons', name: 'swap-vertical' },
  'delete-outline': { family: 'ionicons', name: 'trash' },
  image: { family: 'ionicons', name: 'image' },
  calendar: { family: 'material', name: 'calendar-month' },
  date: { family: 'material', name: 'calendar-today' },
  habit: { family: 'material', name: 'check-box' },
  settings: { family: 'material', name: 'settings' },
  edit: { family: 'material', name: 'edit' },
  check: { family: 'material', name: 'check' },
  'arrow-forward': { family: 'material', name: 'arrow-forward' },
  'drag-indicator': { family: 'material', name: 'drag-indicator' },
  'lock-outline': { family: 'material', name: 'lock-outline' },
  'restart-alt': { family: 'material', name: 'restart-alt' },
  'info-outline': { family: 'material', name: 'info-outline' },
  'privacy-tip': { family: 'material', name: 'privacy-tip' },
  'low-priority': { family: 'material', name: 'low-priority' },
  'emoji-events': { family: 'material', name: 'emoji-events' },
  flag: { family: 'material', name: 'flag' },
  'play-circle-outline': { family: 'material', name: 'play-circle-outline' },
  description: { family: 'material', name: 'description' },
  'emoji-emotions': { family: 'material', name: 'emoji-emotions' },
  'filter-list': { family: 'material', name: 'filter-list' },
  'more-vert': { family: 'material', name: 'more-vert' },
  palette: { family: 'material', name: 'palette' },
  'save-alt': { family: 'material', name: 'save-alt' },
  share: { family: 'material', name: 'share' },
  'auto-awesome': { family: 'material', name: 'auto-awesome' },
  undo: { family: 'material', name: 'undo' },
  sober: { family: 'svg', name: 'timer-fill' },
} as const satisfies Record<
  string,
  | { family: 'ionicons'; name: ComponentProps<typeof Ionicons>['name'] }
  | { family: 'material'; name: ComponentProps<typeof MaterialIcons>['name'] }
  | { family: 'svg'; name: 'timer-fill' }
>;

type AppIconName = keyof typeof APP_ICONS;

export function AppIcon({
  name,
  ...props
}: Omit<ComponentProps<typeof MaterialIcons>, 'name' | 'style'> & {
  name: AppIconName;
  className?: string;
  style?: StyleProp<TextStyle & ViewStyle>;
}) {
  const icon = APP_ICONS[name];
  if (icon.family === 'svg') {
    // Phosphor timer-fill (MIT); see assets/icons/phosphor-LICENSE.txt.
    return (
      <Svg
        width={props.size ?? 24}
        height={props.size ?? 24}
        viewBox="0 0 256 256"
        style={props.style}
        accessible={props.accessible}
        accessibilityLabel={props.accessibilityLabel}
        testID={props.testID}
      >
        <Path
          d="M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm45.66,61.66-40,40a8,8,0,0,1-11.32-11.32l40-40a8,8,0,0,1,11.32,11.32ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z"
          fill={props.color ?? 'black'}
        />
      </Svg>
    );
  }
  return icon.family === 'ionicons' ? (
    <Ionicons {...props} name={icon.name} />
  ) : (
    <MaterialIcons {...props} name={icon.name} />
  );
}

cssInterop(AppIcon, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});
