// Keep potentially large user images in IndexedDB, never inside localStorage project JSON.
import { loadCloudImage, cacheCloudImage } from './cloudSync';
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
    let result: T;
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error || Error('שמירת התמונה בוטלה')); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    operation(tx.objectStore(STORE), value => { result = value; }, reject);
  }); } catch (err) { db.close(); throw err; }
}
export const saveDesignImage = (id: string, dataUrl: string) => transaction<void>('readwrite', (store, resolve, reject) => {
  const request = store.put(dataUrl, id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
});
const loadLocalDesignImage = (id: string) => transaction<string | null>('readonly', (store, resolve, reject) => {
  const request = store.get(id); request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null); request.onerror = () => reject(request.error);
});
export const deleteDesignImage = (id: string) => transaction<void>('readwrite', (store, resolve, reject) => {
  const request = store.delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
});

export async function listDesignImages(): Promise<Record<string, string>> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const keys = tx.objectStore(STORE).getAllKeys();
    const values = tx.objectStore(STORE).getAll();
    tx.oncomplete = () => { db.close(); resolve(Object.fromEntries(keys.result.map((key, i) => [String(key), values.result[i]]))); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function restoreDesignImages(images: Record<string, string>): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    for (const [id, data] of Object.entries(images)) tx.objectStore(STORE).put(data, id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error || Error('שמירת התמונות בוטלה')); };
  });
}

export async function loadDesignImage(id:string):Promise<string|null>{
  const local=await loadLocalDesignImage(id);if(local)return local;
  const cloud=await loadCloudImage(id);if(cloud)await cacheCloudImage(id,cloud);return cloud;
}
