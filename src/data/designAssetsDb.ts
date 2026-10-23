// Keep potentially large user images in IndexedDB, never inside localStorage project JSON.
import { userStorageKey } from './accountStorage';
const DB_NAME = 'dekel-design-assets-v1';
const STORE = 'images';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(userStorageKey(DB_NAME), 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  const db = await database();
  try { return await new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
    operation(tx.objectStore(STORE), resolve, reject);
  }); } catch (err) { db.close(); throw err; }
}
export const saveDesignImage = (id: string, dataUrl: string) => transaction<void>('readwrite', (store, resolve, reject) => {
  const request = store.put(dataUrl, id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
});
export const loadDesignImage = (id: string) => transaction<string | null>('readonly', (store, resolve, reject) => {
  const request = store.get(id); request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null); request.onerror = () => reject(request.error);
});
export const deleteDesignImage = (id: string) => transaction<void>('readwrite', (store, resolve, reject) => {
  const request = store.delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
});
