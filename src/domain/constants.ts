import tokens from '../theme/tokens.json';
export {
  DIARY_TEXT_MAX_LENGTH,
  DIARY_IMAGE_MAX_COUNT,
  MAX_HABIT_COUNT,
  HABIT_NAME_MAX_LENGTH,
  PAGE_SIZE,
} from './limits';
export const HABIT_ICONS = {
  goal: { family: 'ionicons', name: 'flag' },
  walking: { family: 'ionicons', name: 'walk' },
  running: { family: 'material-community', name: 'run' },
  strength: { family: 'ionicons', name: 'barbell' },
  stretching: { family: 'ionicons', name: 'body' },
  cycling: { family: 'ionicons', name: 'bicycle' },
  water: { family: 'ionicons', name: 'water' },
  nutrition: { family: 'material-community', name: 'silverware-fork-knife' },
  supplements: { family: 'material-community', name: 'pill' },
  sleep: { family: 'ionicons', name: 'moon' },
  brushing: { family: 'ionicons', name: 'brush' },
  reading: { family: 'ionicons', name: 'book' },
  studying: { family: 'ionicons', name: 'school' },
  language: { family: 'ionicons', name: 'language' },
  writing: { family: 'ionicons', name: 'pencil' },
  coding: { family: 'ionicons', name: 'code-slash' },
  meditation: { family: 'material-community', name: 'meditation' },
  breathing: { family: 'ionicons', name: 'leaf' },
  gratitude: { family: 'ionicons', name: 'heart' },
  journaling: { family: 'ionicons', name: 'journal' },
  rest: { family: 'ionicons', name: 'cafe' },
  waking: { family: 'ionicons', name: 'alarm' },
  cleaning: { family: 'material-community', name: 'broom' },
  organizing: { family: 'ionicons', name: 'file-tray' },
  cooking: { family: 'ionicons', name: 'restaurant' },
  plants: { family: 'material-community', name: 'sprout' },
  saving: { family: 'ionicons', name: 'wallet' },
  music: { family: 'ionicons', name: 'musical-notes' },
  drawing: { family: 'ionicons', name: 'color-palette' },
  photography: { family: 'ionicons', name: 'camera' },
} as const;
// Common daily habits; other keys remain renderable for records already on this device.
export const HABIT_ICON_OPTIONS = [
  { key: 'goal', label: '기본' },
  { key: 'walking', label: '걷기' },
  { key: 'running', label: '유산소' },
  { key: 'strength', label: '근력 운동' },
  { key: 'stretching', label: '스트레칭' },
  { key: 'cycling', label: '자전거' },
  { key: 'water', label: '물 마시기' },
  { key: 'nutrition', label: '건강 식사' },
  { key: 'supplements', label: '영양제' },
  { key: 'sleep', label: '수면' },
  { key: 'reading', label: '독서' },
  { key: 'studying', label: '공부' },
  { key: 'writing', label: '글쓰기' },
  { key: 'meditation', label: '명상' },
  { key: 'gratitude', label: '감사 기록' },
  { key: 'journaling', label: '일기' },
  { key: 'rest', label: '휴식' },
  { key: 'waking', label: '기상' },
  { key: 'cleaning', label: '청소' },
  { key: 'organizing', label: '정리' },
  { key: 'cooking', label: '요리' },
  { key: 'plants', label: '식물 돌보기' },
  { key: 'saving', label: '저축' },
  { key: 'music', label: '악기 연습' },
  { key: 'drawing', label: '그림' },
] as const satisfies readonly { key: keyof typeof HABIT_ICONS; label: string }[];
export type HabitIconKey = keyof typeof HABIT_ICONS;
export const isHabitIcon = (value: unknown): value is HabitIconKey =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(HABIT_ICONS, value);
export const EMOTIONS = [
  { name: '행복', key: 'happy', color: '#f4b3b9', emoji: '🙂' },
  { name: '기쁨', key: 'joyful', color: '#fbc833', emoji: '😄' },
  { name: '사랑', key: 'love', color: '#fb748e', emoji: '😍' },
  { name: '평온', key: 'calm', color: '#92d4c7', emoji: '😌' },
  { name: '놀람', key: 'surprised', color: '#ffb988', emoji: '😮' },
  { name: '불안', key: 'anxious', color: '#a4aabd', emoji: '😰' },
  { name: '슬픔', key: 'sad', color: '#8fbffb', emoji: '😢' },
  { name: '화남', key: 'angry', color: '#ff6b66', emoji: '😠' },
  { name: '혼란', key: 'confused', color: '#ceb1ef', emoji: '😕' },
  { name: '무심', key: 'unknown', color: '#d9dded', emoji: '😐' },
] as const;

export const HABIT_ICON_COLORS = tokens.habitIconColors;
export type HabitIconColorKey = 'theme' | keyof typeof HABIT_ICON_COLORS;
export const DEFAULT_HABIT_ICON_COLOR: HabitIconColorKey = 'theme';
export const isHabitIconColor = (value: unknown): value is HabitIconColorKey =>
  value === 'theme' ||
  (typeof value === 'string' && Object.prototype.hasOwnProperty.call(HABIT_ICON_COLORS, value));

export function resolveIconColor(colorKey: HabitIconColorKey, accent: string) {
  return colorKey === 'theme' ? accent : HABIT_ICON_COLORS[colorKey].value;
}
