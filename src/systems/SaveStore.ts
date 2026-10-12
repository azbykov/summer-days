/**
 * The one saved game, kept in the browser's IndexedDB. Anything that fails —
 * private windows, blocked storage — just means the game is not saved; it
 * never stops the game.
 */
const DB_NAME = 'summer-days';
const STORE = 'saves';
const KEY = 'current';

export async function loadSave<T>(): Promise<T | null> {
  try {
    const db = await open();
    return await request<T | undefined>(db.transaction(STORE).objectStore(STORE).get(KEY)).then((value) => value ?? null);
  } catch (error) {
    console.warn('Could not load the saved game', error);
    return null;
  }
}

export async function writeSave<T>(value: T): Promise<void> {
  try {
    const db = await open();
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, KEY));
  } catch (error) {
    console.warn('Could not save the game', error);
  }
}

export async function clearSave(): Promise<void> {
  try {
    const db = await open();
    await request(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY));
  } catch (error) {
    console.warn('Could not clear the saved game', error);
  }
}

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((error) => {
    opening = null;
    throw error;
  });
  return opening;
}

function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}
