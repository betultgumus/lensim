import * as SQLite from 'expo-sqlite';
import { defaultState, type AppState } from '../domain/types';
import { validateState } from '../domain/reducer';
import { isDatabaseBusy } from '../domain/errors';
import { INITIAL_SCHEMA, UPDATE_STATE } from './schema';

/**
 * All database work goes through ONE connection and ONE queue.
 *
 * Earlier versions saved with `withExclusiveTransactionAsync`, which opens a second SQLite
 * connection, while notification bookkeeping (`rememberNotification`, `clearNotificationRecords`)
 * and the WAL checkpoint wrote through the main connection at the same time. With no busy timeout
 * the second writer failed at once with "Error code 5: database is locked" (SQLITE_BUSY). The
 * queue below makes those writes take turns; the busy timeout and the retry only cover a lock held
 * outside this process (for example while Android backs the file up).
 */
let database: Promise<SQLite.SQLiteDatabase> | undefined;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.catch(() => {}).then(work);
  queue = run;
  return run;
}
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
/** Retries only "database is locked/busy". A failed attempt is rolled back, so retrying cannot write twice. */
async function withBusyRetry<T>(work: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try { return await work(); } catch (error) {
      if (i >= attempts || !isDatabaseBusy(error)) throw error;
      await wait(150 * i);
    }
  }
}
async function db() {
  if (!database) database = (async () => {
    const handle = await SQLite.openDatabaseAsync('lens-takip.db');
    await handle.execAsync('PRAGMA busy_timeout = 5000;');
    await withBusyRetry(() => handle.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;'));
    const version = await handle.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 1) throw new Error('Bu veri için uygulamayı güncellemelisin.');
    if (!version?.user_version) await withBusyRetry(() => handle.withTransactionAsync(async () => {
      await handle.execAsync(INITIAL_SCHEMA);
      await handle.runAsync('INSERT INTO app_state VALUES (1, 0, ?)', JSON.stringify(defaultState()));
    }));
    return handle;
  })().catch(error => { database = undefined; throw error; });
  return database;
}
export function loadState(): Promise<AppState> {
  return serial(async () => {
    const handle = await db();
    const row = await withBusyRetry(() => handle.getFirstAsync<{ payload: string }>('SELECT payload FROM app_state WHERE id=1'));
    if (!row) throw new Error('Veri kaydı bulunamadı.');
    return validateState(JSON.parse(row.payload));
  });
}
export function saveState(state: AppState, expectedRevision: number): Promise<void> {
  validateState(state);
  return serial(async () => {
    const handle = await db();
    // Same connection, run inside the queue: nothing else can interleave with this transaction.
    await withBusyRetry(() => handle.withTransactionAsync(async () => {
      const result = await handle.runAsync(UPDATE_STATE, JSON.stringify(state), state.revision, expectedRevision);
      if (result.changes !== 1) throw new Error('Veriler değişti. Uygulamayı yeniden açıp tekrar dene.');
    }));
    // Do not leave deleted personal notes in the WAL after the transaction is durable.
    if (!state.onboarded || state.journal.length === 0) await handle.execAsync('PRAGMA wal_checkpoint(TRUNCATE);').catch(() => { /* Already committed; a later checkpoint can finish cleanup. */ });
  });
}
export function rememberNotification(id: string, key: string) {
  return serial(async () => { const handle = await db(); await withBusyRetry(() => handle.runAsync('INSERT OR REPLACE INTO scheduled_notifications VALUES (?, ?)', id, key)); });
}
export function clearNotificationRecords() {
  return serial(async () => { const handle = await db(); await withBusyRetry(() => handle.runAsync('DELETE FROM scheduled_notifications')); });
}
