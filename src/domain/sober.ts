import type { Sober, SoberRestart } from '../db/types';
import { isHabitIconColor, type HabitIconColorKey } from './constants';
import { assertDateTime } from './date';
import {
  SOBER_DESCRIPTION_MAX_LENGTH,
  SOBER_MAX_GOAL_DAYS,
  SOBER_MEMO_MAX_LENGTH,
  SOBER_NAME_MAX_LENGTH,
} from './limits';

export const SOBER_ICONS = {
  favorite: { family: 'ionicons', name: 'heart', label: '기본' },
  moon: { family: 'ionicons', name: 'moon', label: '야식' },
  food: { family: 'ionicons', name: 'fast-food', label: '간식' },
  coffee: { family: 'ionicons', name: 'cafe', label: '커피' },
  soda: { family: 'material-community', name: 'cup-water', label: '음료' },
  dessert: { family: 'ionicons', name: 'ice-cream', label: '디저트' },
  smoking: { family: 'material-community', name: 'smoking', label: '흡연' },
  alcohol: { family: 'ionicons', name: 'wine', label: '음주' },
  shopping: { family: 'ionicons', name: 'bag-handle', label: '쇼핑' },
  delivery: { family: 'material-community', name: 'moped', label: '배달' },
  phone: { family: 'ionicons', name: 'phone-portrait', label: '휴대폰' },
  social: { family: 'ionicons', name: 'chatbubbles', label: 'SNS' },
  video: { family: 'ionicons', name: 'play-circle', label: '영상' },
  game: { family: 'ionicons', name: 'game-controller', label: '게임' },
  gambling: { family: 'material-community', name: 'dice-multiple', label: '도박' },
  oversleep: { family: 'ionicons', name: 'bed', label: '과수면' },
  lateSleep: { family: 'ionicons', name: 'alarm', label: '늦은 취침' },
  procrastination: { family: 'ionicons', name: 'timer', label: '미루기' },
  anger: { family: 'material-community', name: 'emoticon-angry', label: '화내기' },
  age19: { family: 'badge', name: '19', label: '19' },
} as const;
export type SoberIconKey = keyof typeof SOBER_ICONS;
export const SOBER_GOALS = [3, 7, 14, 30, 90, 180, 365, 730, 1095] as const;
export const SOBER_DAY_MS = 86400000;
export interface SoberInput {
  id?: number;
  name: string;
  description: string | null;
  icon_key: SoberIconKey;
  icon_color: HabitIconColorKey;
  is_priority: 0 | 1;
  initial_started_at: string;
  goal_mode: 'AUTO' | 'MANUAL';
  goal_days: number | null;
}
export interface SoberRestartInput {
  id?: number;
  sober_id: number;
  restarted_at: string;
  memo: string | null;
}
export interface SoberStreak {
  start: string;
  end: string;
  duration: number;
  current: boolean;
}
const isSoberIcon = (value: unknown): value is SoberIconKey =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(SOBER_ICONS, value);
export function validateSober(input: SoberInput, now: number) {
  if (
    typeof input.name !== 'string' ||
    !input.name.trim() ||
    input.name.trim().length > SOBER_NAME_MAX_LENGTH
  )
    throw new Error(`이름은 1~${SOBER_NAME_MAX_LENGTH}자로 입력해주세요.`);
  if (
    input.description !== null &&
    (typeof input.description !== 'string' ||
      input.description.length > SOBER_DESCRIPTION_MAX_LENGTH)
  )
    throw new Error(`설명은 ${SOBER_DESCRIPTION_MAX_LENGTH}자까지 입력할 수 있어요.`);
  if (
    !isSoberIcon(input.icon_key) ||
    !isHabitIconColor(input.icon_color) ||
    ![0, 1].includes(input.is_priority) ||
    !['AUTO', 'MANUAL'].includes(input.goal_mode)
  )
    throw new Error('거리두기 설정을 확인해주세요.');
  if (
    input.goal_mode === 'MANUAL'
      ? !Number.isSafeInteger(input.goal_days) ||
      input.goal_days! <= 0 ||
      input.goal_days! > SOBER_MAX_GOAL_DAYS
      : input.goal_days !== null
  )
    throw new Error(`직접 목표는 1~${SOBER_MAX_GOAL_DAYS}일로 입력해주세요.`);
  assertDateTime(input.initial_started_at, now);
}
export function validateSoberRestart(
  input: SoberRestartInput,
  initialStartedAt: string,
  now: number,
) {
  if (!Number.isSafeInteger(input.sober_id) || input.sober_id <= 0)
    throw new Error('거리두기 항목을 확인해주세요.');
  assertDateTime(input.restarted_at, now);
  if (Date.parse(input.restarted_at) < Date.parse(initialStartedAt))
    throw new Error('시작 시각 이후에 기록해주세요.');
  if (
    input.memo !== null &&
    (typeof input.memo !== 'string' || input.memo.length > SOBER_MEMO_MAX_LENGTH)
  )
    throw new Error(`메모는 ${SOBER_MEMO_MAX_LENGTH}자까지 입력할 수 있어요.`);
}
export function getCurrentSoberStart(
  sober: Pick<Sober, 'initial_started_at'>,
  restarts: SoberRestart[],
) {
  return restarts.reduce(
    (latest, item) =>
      Date.parse(item.restarted_at) > Date.parse(latest) ? item.restarted_at : latest,
    sober.initial_started_at,
  );
}
export function getSoberStreaks(
  sober: Pick<Sober, 'initial_started_at'>,
  restarts: SoberRestart[],
  now: number,
): SoberStreak[] {
  const starts = [
    sober.initial_started_at,
    ...[...restarts]
      .sort((a, b) => Date.parse(a.restarted_at) - Date.parse(b.restarted_at) || a.id - b.id)
      .map((item) => item.restarted_at),
  ];
  return starts.map((start, index) => {
    const current = index === starts.length - 1;
    const end = current ? new Date(now).toISOString() : starts[index + 1];
    return { start, end, current, duration: Math.max(0, Date.parse(end) - Date.parse(start)) };
  });
}
export function getLongestSoberStreak(streaks: SoberStreak[]) {
  return streaks.reduce((longest, item) => Math.max(longest, item.duration), 0);
}
export function getLongSoberStreaks(streaks: SoberStreak[]) {
  return streaks
    .slice()
    .sort((a, b) => b.duration - a.duration || Date.parse(a.start) - Date.parse(b.start));
}
export function getAutoSoberGoal(duration: number) {
  return SOBER_GOALS.find((days) => duration < days * SOBER_DAY_MS) ?? 1095;
}
export function getSoberProgress(duration: number, goalDays: number) {
  return Math.min(100, Math.max(0, (duration / (goalDays * SOBER_DAY_MS)) * 100));
}
export function formatSoberDuration(duration: number) {
  const minutes = Math.max(0, Math.floor(duration / 60000));
  const days = Math.floor(minutes / 1440);
  if (days >= 365) {
    const remainingDays = days % 365;
    return `${Math.floor(days / 365)}년 ${remainingDays ? `${remainingDays}일 ` : ''}${Math.floor((minutes % 1440) / 60)}시간`;
  }
  return `${Math.floor(minutes / 1440)}일 ${Math.floor((minutes % 1440) / 60)}시간 ${minutes % 60}분`;
}
export function formatSoberGoal(days: number) {
  return (
    (
      {
        14: '2주',
        30: '1개월',
        90: '3개월',
        180: '6개월',
        365: '1년',
        730: '2년',
        1095: '3년',
      } as Record<number, string>
    )[days] ?? `${days}일`
  );
}
export function getSoberSummary(sober: Sober, restarts: SoberRestart[], now: number) {
  const start = getCurrentSoberStart(sober, restarts);
  const duration = Math.max(0, now - Date.parse(start));
  const goalDays = sober.goal_mode === 'AUTO' ? getAutoSoberGoal(duration) : sober.goal_days!;
  const streaks = getSoberStreaks(sober, restarts, now);
  return {
    start,
    duration,
    goalDays,
    progress: getSoberProgress(duration, goalDays),
    longest: getLongestSoberStreak(streaks),
    longRecords: getLongSoberStreaks(streaks),
  };
}
