import { defaultState, type AppState } from '../domain/types';
import { validateState } from '../domain/reducer';

let database: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('lens-takip-web-preview', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Diğer Lens Takip sekmelerini kapatıp yeniden dene.'));
    request.onsuccess = () => resolve(request.result);
  }).catch(error => { database = undefined; throw error; });
  return database;
}
export async function loadState(): Promise<AppState> {
  const handle = await db();
  return new Promise((resolve, reject) => {
    const request = handle.transaction('state', 'readonly').objectStore('state').get(1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { try { resolve(request.result ? validateState(request.result) : defaultState()); } catch (error) { reject(error); } };
  });
}
export async function saveState(state: AppState, expectedRevision: number): Promise<void> {
  validateState(state);
  const handle = await db();
  return new Promise((resolve, reject) => {
    const transaction = handle.transaction('state', 'readwrite');
    const store = transaction.objectStore('state');
    let failure: Error | undefined;
    transaction.oncomplete = () => resolve();
    transaction.onerror = transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Tarayıcı kaydı tamamlanamadı.'));
    const request = store.get(1);
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== expectedRevision) {
        failure = new Error('Veriler başka sekmede değişti. Sayfayı yenileyip tekrar dene.'); transaction.abort(); return;
      }
      store.put(state, 1);
    };
  });
}
export async function rememberNotification(_id: string, _key: string) {}
export async function clearNotificationRecords() {}
