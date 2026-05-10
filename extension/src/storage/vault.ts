import type { EncryptedVaultBlob, VaultStorageRecord } from '../types/index.js';
import { openDB, STORE_NAME } from './db.js';

function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
}

export async function saveVault(blob: EncryptedVaultBlob): Promise<void> {
  const db = await openDB();
  const record: VaultStorageRecord = { id: 'vault', blob, updatedAt: Date.now() };
  await idbRequest(tx(db, 'readwrite').put(record));
}

export async function loadVault(): Promise<EncryptedVaultBlob | null> {
  const db = await openDB();
  const record = await idbRequest<VaultStorageRecord | undefined>(tx(db, 'readonly').get('vault'));
  return record?.blob ?? null;
}

export async function updateVault(blob: EncryptedVaultBlob): Promise<void> {
  return saveVault(blob);
}

export async function clearVault(): Promise<void> {
  const db = await openDB();
  await idbRequest(tx(db, 'readwrite').delete('vault'));
}
