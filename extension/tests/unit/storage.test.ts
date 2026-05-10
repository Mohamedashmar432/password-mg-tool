import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { EncryptedVaultBlob } from '../../src/types/index.js';

// Reset both the IndexedDB global AND the module cache before each test
// so that db.ts's cached _db is cleared and openDB() calls fresh IDB.
beforeEach(() => {
  (globalThis as Record<string, unknown>)['indexedDB'] = new IDBFactory();
  vi.resetModules();
});

const sampleBlob: EncryptedVaultBlob = {
  version: 1,
  kdf: 'pbkdf2',
  salt: 'dGVzdHNhbHQxMjM0NTY=',
  iv: 'dGVzdGl2MTIz',
  ciphertext: 'dGVzdGNpcGhlcnRleHQ=',
};

const sampleBlob2: EncryptedVaultBlob = {
  version: 1,
  kdf: 'pbkdf2',
  salt: 'c2FsdDIzNDU2Nzg5MA==',
  iv: 'aXYyMzQ1Njc4OQ==',
  ciphertext: 'Y2lwaGVydGV4dDIzNDU2Nzg5MA==',
};

describe('IndexedDB vault storage — loadVault', () => {
  it('returns null when no vault has been saved', async () => {
    const { loadVault } = await import('../../src/storage/vault.js');
    expect(await loadVault()).toBeNull();
  });
});

describe('IndexedDB vault storage — saveVault / loadVault', () => {
  it('saves and loads a vault blob', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    await saveVault(sampleBlob);
    expect(await loadVault()).toEqual(sampleBlob);
  });

  it('overwrites the vault on second save (put semantics)', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    await saveVault(sampleBlob);
    await saveVault(sampleBlob2);
    expect(await loadVault()).toEqual(sampleBlob2);
  });

  it('preserves all blob fields exactly', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    await saveVault(sampleBlob);
    const loaded = await loadVault();
    expect(loaded?.version).toBe(1);
    expect(loaded?.kdf).toBe('pbkdf2');
    expect(loaded?.salt).toBe(sampleBlob.salt);
    expect(loaded?.iv).toBe(sampleBlob.iv);
    expect(loaded?.ciphertext).toBe(sampleBlob.ciphertext);
  });
});

describe('IndexedDB vault storage — updateVault', () => {
  it('updateVault replaces existing vault', async () => {
    const { saveVault, updateVault, loadVault } = await import('../../src/storage/vault.js');
    await saveVault(sampleBlob);
    await updateVault(sampleBlob2);
    expect(await loadVault()).toEqual(sampleBlob2);
  });
});

describe('IndexedDB vault storage — clearVault', () => {
  it('clearVault removes the vault so loadVault returns null', async () => {
    const { saveVault, clearVault, loadVault } = await import('../../src/storage/vault.js');
    await saveVault(sampleBlob);
    await clearVault();
    expect(await loadVault()).toBeNull();
  });

  it('clearVault on empty store does not throw', async () => {
    const { clearVault } = await import('../../src/storage/vault.js');
    await expect(clearVault()).resolves.toBeUndefined();
  });
});
