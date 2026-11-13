import * as SQLite from 'expo-sqlite';
import { defaultState, type AppState } from '../domain/types';
import { validateState } from '../domain/reducer';
import { INITIAL_SCHEMA, UPDATE_STATE } from './schema';

let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function db() {
  if (!database) database = (async () => {
    const handle = await SQLite.openDatabaseAsync('lens-takip.db');
    await handle.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
    const version = await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 1) throw new Error('Bu veri için uygulamayı güncellemelisin.');
    if (!version?.user_version) await handle.withExclusiveTransactionAsync(async txn => {
      await txn.execAsync(INITIAL_SCHEMA);
      await txn.runAsync('INSERT INTO app_state VALUES (1, 0, ?)', JSON.stringify(defaultState()));
    });
    return handle;
  })().catch(error => { database = undefined; throw error; });
  return database;
}
export async function loadState(): Promise<AppState> {
  const row = await (await db()).getFirstAsync<{ payload: string }>('SELECT payload FROM app_state WHERE id=1');
  if (!row) throw new Error('Veri kaydı bulunamadı.');
  return validateState(JSON.parse(row.payload));
}
export async function saveState(state: AppState, expectedRevision: number) {
  validateState(state);
  await (await db()).withExclusiveTransactionAsync(async txn => {
    await txn.execAsync('PRAGMA secure_delete = ON;');
    const result = await txn.runAsync(UPDATE_STATE, JSON.stringify(state), state.revision, expectedRevision);
    if (result.changes !== 1) throw new Error('Veriler değişti. Uygulamayı yeniden açıp tekrar dene.');
  });
  // Do not leave deleted personal notes in the WAL after the transaction is durable.
  if (!state.onboarded || state.journal.length === 0) await (await db()).execAsync('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => { /* Already committed; a later checkpoint can finish cleanup. */ });
}
export async function rememberNotification(id: string, key: string) {
  await (await db()).runAsync('INSERT OR REPLACE INTO scheduled_notifications VALUES (?, ?)', id, key);
}
export async function clearNotificationRecords() { await (await db()).runAsync('DELETE FROM scheduled_notifications'); }
