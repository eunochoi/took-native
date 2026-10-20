import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ArrowRightIcon } from 'phosphor-react-native/src/icons/ArrowRight';
import { ArrowSquareOutIcon } from 'phosphor-react-native/src/icons/ArrowSquareOut';
import { ArrowUUpLeftIcon } from 'phosphor-react-native/src/icons/ArrowUUpLeft';
import { ArrowsDownUpIcon } from 'phosphor-react-native/src/icons/ArrowsDownUp';
import { BookOpenIcon } from 'phosphor-react-native/src/icons/BookOpen';
import { CalendarBlankIcon } from 'phosphor-react-native/src/icons/CalendarBlank';
import { CalendarDotIcon } from 'phosphor-react-native/src/icons/CalendarDot';
import { CalendarDotsIcon } from 'phosphor-react-native/src/icons/CalendarDots';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { ChartBarIcon } from 'phosphor-react-native/src/icons/ChartBar';
import { ChartLineIcon } from 'phosphor-react-native/src/icons/ChartLine';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { DotsSixVerticalIcon } from 'phosphor-react-native/src/icons/DotsSixVertical';
import { DotsThreeVerticalIcon } from 'phosphor-react-native/src/icons/DotsThreeVertical';
import { DownloadSimpleIcon } from 'phosphor-react-native/src/icons/DownloadSimple';
import { FileTextIcon } from 'phosphor-react-native/src/icons/FileText';
import { FlagIcon } from 'phosphor-react-native/src/icons/Flag';
import { FunnelSimpleIcon } from 'phosphor-react-native/src/icons/FunnelSimple';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ImageIcon } from 'phosphor-react-native/src/icons/Image';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { ListNumbersIcon } from 'phosphor-react-native/src/icons/ListNumbers';
import { LockKeyIcon } from 'phosphor-react-native/src/icons/LockKey';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlayCircleIcon } from 'phosphor-react-native/src/icons/PlayCircle';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PercentIcon } from 'phosphor-react-native/src/icons/Percent';
import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SmileyIcon } from 'phosphor-react-native/src/icons/Smiley';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { TimerIcon } from 'phosphor-react-native/src/icons/Timer';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { TrophyIcon } from 'phosphor-react-native/src/icons/Trophy';
import { XIcon } from 'phosphor-react-native/src/icons/X';
import type { IconProps } from 'phosphor-react-native';
import type { SvgProps } from 'react-native-svg';
import { cssInterop } from 'nativewind';

// Screen code uses one name per intent; glyphs and rendering live here.
const APP_ICONS = {
  home: HouseIcon,
  diary: BookOpenIcon,
  add: PlusIcon,
  close: XIcon,
  'chevron-left': CaretLeftIcon,
  'chevron-right': CaretRightIcon,
  'chevron-up': CaretUpIcon,
  'chevron-down': CaretDownIcon,
  sort: ArrowsDownUpIcon,
  'delete-outline': TrashIcon,
  image: ImageIcon,
  calendar: CalendarDotsIcon,
  date: CalendarBlankIcon,
  today: CalendarDotIcon,
  habit: CheckIcon,
  settings: GearIcon,
  edit: PencilSimpleIcon,
  check: CheckIcon,
  statistics: ChartBarIcon,
  'habit-flow': ChartLineIcon,
  'habit-rate': PercentIcon,
  'arrow-forward': ArrowRightIcon,
  'open-in-new': ArrowSquareOutIcon,
  'drag-indicator': DotsSixVerticalIcon,
  'lock-outline': LockKeyIcon,
  'restart-alt': ArrowCounterClockwiseIcon,
  'info-outline': InfoIcon,
  info: InfoIcon,
  'privacy-tip': ShieldCheckIcon,
  'low-priority': ListNumbersIcon,
  'emoji-events': TrophyIcon,
  flag: FlagIcon,
  'play-circle-outline': PlayCircleIcon,
  description: FileTextIcon,
  'emoji-emotions': SmileyIcon,
  'filter-list': FunnelSimpleIcon,
  'more-vert': DotsThreeVerticalIcon,
  palette: PaletteIcon,
  'save-alt': DownloadSimpleIcon,
  share: ShareNetworkIcon,
  'auto-awesome': SparkleIcon,
  undo: ArrowUUpLeftIcon,
  sober: TimerIcon,
} as const;

type AppIconName = keyof typeof APP_ICONS;

export function AppIcon({
  name,
  ...props
}: Omit<SvgProps, 'name' | 'color' | 'style'> &
  IconProps & { name: AppIconName; className?: string }) {
  const Icon = APP_ICONS[name];
  const bold = [
    'habit',
    'check',
    'close',
    'habit-rate',
    'filter-list',
    'add',
    'more-vert',
    'low-priority',
    'chevron-left',
    'chevron-right',
    'today',
    'habit-flow',
  ].includes(name);
  return <Icon {...props} weight={bold ? 'bold' : 'fill'} />;
}

cssInterop(AppIcon, {
  className: { target: 'style', nativeStyleToProp: { color: true } },
});
