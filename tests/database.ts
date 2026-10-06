import initSqlJs, { type Database } from 'sql.js';
import type { SQLiteDatabase } from 'expo-sqlite';
import { migrateDatabase } from '../src/db/migrations';

export async function database(bytes?: Uint8Array) {
  const SQL = await initSqlJs();
  const raw = new SQL.Database(bytes);
  const adapter = {
    execAsync: async (sql: string) => {
      raw.exec(sql);
    },
    runAsync: async (sql: string, ...params: (string | number | null)[]) => {
      raw.run(sql, params);
      return {
        changes: raw.getRowsModified(),
        lastInsertRowId: Number(raw.exec('SELECT last_insert_rowid()')[0].values[0][0]),
      };
    },
    getAllAsync: async <T>(sql: string, ...params: (string | number | null)[]): Promise<T[]> => {
      const statement = raw.prepare(sql);
      try {
        statement.bind(params);
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
    getFirstAsync: async <T>(
      sql: string,
      ...params: (string | number | null)[]
    ): Promise<T | null> => (await adapter.getAllAsync<T>(sql, ...params))[0] ?? null,
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };
  const db = adapter as unknown as SQLiteDatabase;
  if (!bytes) await migrateDatabase(db);
  return { db, raw };
}
export const rows = (raw: Database, sql: string) => raw.exec(sql)[0]?.values ?? [];
