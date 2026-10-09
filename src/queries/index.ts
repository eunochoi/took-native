import {
  getSoberList,
  getSoberById,
  getSoberRestarts,
  getSoberMemoPage,
  type SoberMemoCursor,
} from '../db/sober';
import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';
import { withReadLock } from '../db';
import { AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { getDiaryByDate, getDiaryById, getDiaryList } from '../db/diary';
import { getCompletions, getCompletionsByHabit, getHabitById, getHabitList } from '../db/habit';
import { getAvailableYears, getDiaryStats, getHabitStats } from '../db/stats';
import type { Diary, DiaryFilters } from '../db/types';
import { PAGE_SIZE } from '../domain/constants';
import { todayString } from '../domain/date';
import { refreshSoberWidgets } from '../widgets/sober';

export const diaryQueries = {
  list: (db: SQLiteDatabase, filters: DiaryFilters) =>
    infiniteQueryOptions({
      queryKey: ['diary', 'list', filters],
      queryFn: ({ pageParam }) => withReadLock(() => getDiaryList(db, filters, pageParam)),
      initialPageParam: 0,
      getNextPageParam: (last, pages) => (last.length < PAGE_SIZE ? undefined : pages.length),
    }),
  byId: (db: SQLiteDatabase, id: number) =>
    queryOptions({
      queryKey: ['diary', 'id', id],
      queryFn: () => withReadLock(() => getDiaryById(db, id)),
    }),
  byDate: (db: SQLiteDatabase, date: string) =>
    queryOptions({
      queryKey: ['diary', 'date', date],
      queryFn: () => withReadLock(() => getDiaryByDate(db, date)),
    }),
  detailByDate: (db: SQLiteDatabase, date: string) =>
    queryOptions({
      queryKey: ['diary', 'detail-date', date],
      queryFn: () =>
        withReadLock(async () => {
          const diary = await getDiaryByDate(db, date);
          return diary ? getDiaryById(db, diary.id) : null;
        }),
    }),
  month: (db: SQLiteDatabase, month: string) =>
    queryOptions({
      queryKey: ['diary', 'month', month],
      queryFn: () =>
        withReadLock(() =>
          db.getAllAsync<Diary>(
            'SELECT * FROM diaries WHERE date LIKE ? ORDER BY date',
            `${month}%`,
          ),
        ),
    }),
};
export const habitQueries = {
  list: (db: SQLiteDatabase) =>
    queryOptions({
      queryKey: ['habit', 'list'],
      queryFn: () => withReadLock(() => getHabitList(db)),
    }),
  byId: (db: SQLiteDatabase, id: number) =>
    queryOptions({
      queryKey: ['habit', 'id', id],
      queryFn: () => withReadLock(() => getHabitById(db, id)),
    }),
  completionsByHabit: (db: SQLiteDatabase, id: number) =>
    queryOptions({
      queryKey: ['habit', 'completions-by-habit', id],
      queryFn: () => withReadLock(() => getCompletionsByHabit(db, id)),
    }),
  completions: (db: SQLiteDatabase, from: string, to: string) =>
    queryOptions({
      queryKey: ['habit', 'completions', from, to],
      queryFn: () => withReadLock(() => getCompletions(db, from, to)),
    }),
};
export const soberQueries = {
  memos: (db: SQLiteDatabase, id: number, sort: 'ASC' | 'DESC') =>
    infiniteQueryOptions({
      queryKey: ['sober', 'memos', id, sort],
      queryFn: ({ pageParam }) => withReadLock(() => getSoberMemoPage(db, id, sort, pageParam)),
      initialPageParam: null as SoberMemoCursor | null,
      getNextPageParam: (last) => last.nextCursor,
    }),
  list: (db: SQLiteDatabase) =>
    queryOptions({
      queryKey: ['sober', 'list'],
      queryFn: () => withReadLock(() => getSoberList(db)),
    }),
  byId: (db: SQLiteDatabase, id: number) =>
    queryOptions({
      queryKey: ['sober', 'id', id],
      queryFn: () => withReadLock(() => getSoberById(db, id)),
    }),
  restarts: (db: SQLiteDatabase, id?: number) =>
    queryOptions({
      queryKey: ['sober', 'restarts', id ?? 'all'],
      queryFn: () => withReadLock(() => getSoberRestarts(db, id)),
    }),
};
export const statsQueries = {
  years: (db: SQLiteDatabase) =>
    queryOptions({
      queryKey: ['stats', 'years', todayString().slice(0, 4)],
      queryFn: () => withReadLock(() => getAvailableYears(db)),
    }),
  diary: (db: SQLiteDatabase, year: number) =>
    queryOptions({
      queryKey: ['stats', 'diary', year, todayString()],
      queryFn: () => withReadLock(() => getDiaryStats(db, year)),
    }),
  habit: (db: SQLiteDatabase, year: number) =>
    queryOptions({
      queryKey: ['stats', 'habit', year],
      queryFn: () => withReadLock(() => getHabitStats(db, year)),
    }),
};
// Diary list/detail queries include completed habit data, so habit changes refresh them too.
const recordMutationKeys = {
  diary: [['diary'], ['stats', 'diary'], ['stats', 'years']],
  habit: [
    ['habit'],
    ['diary', 'list'],
    ['diary', 'id'],
    ['diary', 'detail-date'],
    ['stats', 'habit'],
    ['stats', 'years'],
  ],
  habitCompletion: [
    ['habit', 'completions'],
    ['habit', 'completions-by-habit'],
    ['diary', 'list'],
    ['diary', 'id'],
    ['diary', 'detail-date'],
    ['stats', 'habit'],
    ['stats', 'years'],
  ],
  sober: [['sober']],
} as const;
export function useRecordMutation<T, V>(
  mutationFn: (value: V) => Promise<T>,
  scope: keyof typeof recordMutationKeys,
  onSuccess?: (data: T) => void,
  onError?: (error: Error) => void,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      if (scope === 'sober') refreshSoberWidgets();
      await Promise.all(
        recordMutationKeys[scope].map((queryKey) => client.invalidateQueries({ queryKey })),
      );
      onSuccess?.(data);
    },
    onError,
  });
}
export function useToday() {
  const [today, setToday] = useState(todayString);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setToday(todayString());
      timer = setTimeout(update, midnight.getTime() - now.getTime());
    };
    if (AppState.currentState === 'active' || AppState.currentState === null) update();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      listener.remove();
    };
  }, []);
  return today;
}
