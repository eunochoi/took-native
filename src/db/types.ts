import type { SoberIconKey } from '../domain/sober';
import type { HabitIconKey, HabitIconColorKey } from '../domain/constants';

export interface Diary {
  id: number;
  date: string;
  emotion: number;
  text: string;
  created_at: string;
  updated_at: string;
}
export interface DiaryImage {
  id: number;
  diary_id: number;
  file_name: string;
  position: number;
}
export interface DiaryDetail extends Diary {
  images: DiaryImage[];
  completedHabits: Habit[];
}
export interface Habit {
  id: number;
  name: string;
  priority: number;
  icon_key: HabitIconKey;
  icon_color: HabitIconColorKey;
  initial_started_at: string;
  created_at: string;
  updated_at: string;
}
export interface Completion {
  habit_id: number;
  date: string;
  created_at: string;
}
export interface DiaryFilters {
  year: number | null;
  month: number;
  emotion: number | null;
  sort: 'ASC' | 'DESC';
}

export interface Sober {
  id: number;
  name: string;
  description: string | null;
  icon_key: SoberIconKey;
  icon_color: HabitIconColorKey;
  is_priority: 0 | 1;
  initial_started_at: string;
  goal_mode: 'AUTO' | 'MANUAL';
  goal_days: number | null;
  created_at: string;
  updated_at: string;
}
export interface SoberRestart {
  id: number;
  sober_id: number;
  restarted_at: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}
