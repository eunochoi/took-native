import type { SQLiteDatabase } from 'expo-sqlite';
import { withWriteLock } from './index';
import type { Sober, SoberRestart } from './types';
import type { Settings } from '../settings/model';
import { MAX_SOBER_COUNT } from '../domain/limits';
import {
  validateSober,
  validateSoberRestart,
  type SoberInput,
  type SoberRestartInput,
} from '../domain/sober';

export const getSoberList = (db: SQLiteDatabase) =>
  db.getAllAsync<Sober>('SELECT * FROM sobers ORDER BY created_at DESC, id');
export const getSoberById = (db: SQLiteDatabase, id: number) =>
  db.getFirstAsync<Sober>('SELECT * FROM sobers WHERE id = ?', id);
export const getSoberRestarts = (db: SQLiteDatabase, soberId?: number) =>
  soberId === undefined
    ? db.getAllAsync<SoberRestart>('SELECT * FROM sober_restarts ORDER BY restarted_at, id')
    : db.getAllAsync<SoberRestart>(
        'SELECT * FROM sober_restarts WHERE sober_id = ? ORDER BY restarted_at, id',
        soberId,
      );
export function sortSobers(
  sobers: Sober[],
  settings: Pick<Settings, 'soberSort' | 'soberPriorityFirst'>,
) {
  return [...sobers].sort((a, b) => {
    if (settings.soberPriorityFirst && a.is_priority !== b.is_priority)
      return b.is_priority - a.is_priority;
    const difference = Date.parse(a.created_at) - Date.parse(b.created_at);
    return (settings.soberSort === 'ASC' ? difference : -difference) || a.id - b.id;
  });
}
export function saveSober(db: SQLiteDatabase, input: SoberInput, now = Date.now()) {
  return withWriteLock(async () => {
    validateSober(input, now);
    if (input.id !== undefined && (!Number.isSafeInteger(input.id) || input.id <= 0))
      throw new Error('절제 항목을 확인해주세요.');
    let id = input.id ?? 0;
    await db.withTransactionAsync(async () => {
      const name = input.name.trim();
      if (await db.getFirstAsync('SELECT id FROM sobers WHERE name = ? AND id != ?', name, id))
        throw new Error('같은 이름의 절제가 있어요.');
      const timestamp = new Date(now).toISOString();
      const values = [
        name,
        input.description?.trim() || null,
        input.icon_key,
        input.icon_color,
        input.is_priority,
        input.initial_started_at,
        input.goal_mode,
        input.goal_days,
        timestamp,
      ] as const;
      if (id) {
        const restarts = await getSoberRestarts(db, id);
        if (
          restarts.some(
            (item) => Date.parse(item.restarted_at) < Date.parse(input.initial_started_at),
          )
        )
          throw new Error('다시 시작 기록보다 늦은 시각으로 최초 시작을 변경할 수 없어요.');
        const result = await db.runAsync(
          'UPDATE sobers SET name = ?, description = ?, icon_key = ?, icon_color = ?, is_priority = ?, initial_started_at = ?, goal_mode = ?, goal_days = ?, updated_at = ? WHERE id = ?',
          ...values,
          id,
        );
        if (!result.changes) throw new Error('절제 항목을 찾을 수 없어요.');
      } else {
        const count = (await db.getFirstAsync<{ count: number }>(
          'SELECT count(*) AS count FROM sobers',
        ))!.count;
        if (count >= MAX_SOBER_COUNT)
          throw new Error(`절제는 최대 ${MAX_SOBER_COUNT}개까지 만들 수 있어요.`);
        id = (
          await db.runAsync(
            'INSERT INTO sobers (name, description, icon_key, icon_color, is_priority, initial_started_at, goal_mode, goal_days, updated_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ...values,
            timestamp,
          )
        ).lastInsertRowId;
      }
    });
    return id;
  });
}
export const deleteSober = (db: SQLiteDatabase, id: number) =>
  withWriteLock(() => db.runAsync('DELETE FROM sobers WHERE id = ?', id));
export function saveSoberRestart(db: SQLiteDatabase, input: SoberRestartInput, now = Date.now()) {
  return withWriteLock(async () => {
    if (input.id !== undefined && (!Number.isSafeInteger(input.id) || input.id <= 0))
      throw new Error('다시 시작 기록을 확인해주세요.');
    let id = input.id ?? 0;
    await db.withTransactionAsync(async () => {
      const sober = await getSoberById(db, input.sober_id);
      if (!sober) throw new Error('절제 항목을 찾을 수 없어요.');
      validateSoberRestart(input, sober.initial_started_at, now);
      const timestamp = new Date(now).toISOString();
      if (id) {
        const result = await db.runAsync(
          'UPDATE sober_restarts SET restarted_at = ?, memo = ?, updated_at = ? WHERE id = ? AND sober_id = ?',
          input.restarted_at,
          input.memo?.trim() || null,
          timestamp,
          id,
          input.sober_id,
        );
        if (!result.changes) throw new Error('다시 시작 기록을 찾을 수 없어요.');
      } else
        id = (
          await db.runAsync(
            'INSERT INTO sober_restarts (sober_id, restarted_at, memo, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            input.sober_id,
            input.restarted_at,
            input.memo?.trim() || null,
            timestamp,
            timestamp,
          )
        ).lastInsertRowId;
    });
    return id;
  });
}
export const deleteSoberRestart = (db: SQLiteDatabase, id: number, soberId: number) =>
  withWriteLock(() =>
    db.runAsync('DELETE FROM sober_restarts WHERE id = ? AND sober_id = ?', id, soberId),
  );
