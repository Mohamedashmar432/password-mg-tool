import type { BiometricAuth, SessionData } from '../types/index.js';
import { openDB } from './db.js';

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(
  storeName: string,
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> {
  const db = await openDB();
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function saveBiometricAuth(auth: BiometricAuth): Promise<void> {
  const store = await getStore('auth', 'readwrite');
  await idbRequest(store.put(auth));
}

export async function loadBiometricAuth(): Promise<BiometricAuth | null> {
  const store = await getStore('auth', 'readonly');
  const result = await idbRequest<BiometricAuth | undefined>(store.get('biometric'));
  return result ?? null;
}

export async function clearBiometricAuth(): Promise<void> {
  const store = await getStore('auth', 'readwrite');
  await idbRequest(store.delete('biometric'));
}

export async function saveSession(session: SessionData): Promise<void> {
  const store = await getStore('session', 'readwrite');
  await idbRequest(store.put(session));
}

export async function loadSession(): Promise<SessionData | null> {
  const store = await getStore('session', 'readonly');
  const result = await idbRequest<SessionData | undefined>(store.get('session'));
  return result ?? null;
}

export const DEFAULT_SESSION: SessionData = {
  id: 'session',
  lastUnlock: 0,
  lockTimeout: 300_000,
  requireAuthBeforeAutofill: false,
  requireAuthBeforeReveal: true,
};
