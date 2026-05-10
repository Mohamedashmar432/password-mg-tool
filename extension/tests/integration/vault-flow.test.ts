import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { deriveKey, generateSalt } from '../../src/crypto/kdf.js';
import { encryptVault, decryptVault } from '../../src/crypto/aes.js';
import type { DecryptedVault, VaultEntry } from '../../src/types/index.js';

// Reset IndexedDB and module cache before each test so db.ts's _db cache is cleared
beforeEach(() => {
  (globalThis as Record<string, unknown>)['indexedDB'] = new IDBFactory();
  vi.resetModules();
});

function makeEntry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    id: crypto.randomUUID(),
    site: 'github.com',
    url: 'https://github.com/login',
    username: 'dev@example.com',
    password: 'MyV@ultPw!123',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Full vault lock/unlock cycle', () => {
  it('persists entries across a lock/unlock cycle', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    const masterPw = 'TestMasterPassword!99';
    const salt = generateSalt();
    const key = await deriveKey(masterPw, salt);

    const entry = makeEntry();
    const vault: DecryptedVault = { version: 1, entries: [entry] };

    await saveVault(await encryptVault(vault, key, salt));

    // Simulate lock: drop key from memory; re-derive on unlock
    const loaded = await loadVault();
    expect(loaded).not.toBeNull();

    const key2 = await deriveKey(masterPw, salt);
    const decoded = await decryptVault(loaded!, key2);

    expect(decoded.entries).toHaveLength(1);
    expect(decoded.entries[0]?.password).toBe(entry.password);
    expect(decoded.entries[0]?.username).toBe(entry.username);
  });

  it('wrong master password cannot unlock the vault', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    const salt = generateSalt();
    const key = await deriveKey('correct-master-pw', salt);
    const vault: DecryptedVault = { version: 1, entries: [makeEntry()] };

    await saveVault(await encryptVault(vault, key, salt));

    const loaded = await loadVault();
    const badKey = await deriveKey('wrong-master-pw', salt);
    await expect(decryptVault(loaded!, badKey)).rejects.toThrow();
  });

  it('adding an entry, re-encrypting, and reloading preserves all data', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    const masterPw = 'SecureMasterPw#42';
    const salt = generateSalt();
    const key = await deriveKey(masterPw, salt);

    const entry1 = makeEntry({ site: 'github.com', password: 'GithubPass1!' });
    const vault: DecryptedVault = { version: 1, entries: [entry1] };
    await saveVault(await encryptVault(vault, key, salt));

    // Add a second entry
    const loaded1 = await loadVault();
    const decoded1 = await decryptVault(loaded1!, key);
    const entry2 = makeEntry({ site: 'example.com', password: 'ExamplePass2!' });
    const updated: DecryptedVault = { ...decoded1, entries: [...decoded1.entries, entry2] };
    await saveVault(await encryptVault(updated, key, salt));

    // Reload and verify both entries
    const loaded2 = await loadVault();
    const decoded2 = await decryptVault(loaded2!, key);
    expect(decoded2.entries).toHaveLength(2);
    expect(decoded2.entries.some(e => e.site === 'github.com')).toBe(true);
    expect(decoded2.entries.some(e => e.site === 'example.com')).toBe(true);
    expect(decoded2.entries.find(e => e.site === 'github.com')?.password).toBe('GithubPass1!');
    expect(decoded2.entries.find(e => e.site === 'example.com')?.password).toBe('ExamplePass2!');
  });

  it('deleting an entry and reloading reflects the deletion', async () => {
    const { saveVault, loadVault } = await import('../../src/storage/vault.js');
    const masterPw = 'DeleteTestPw!77';
    const salt = generateSalt();
    const key = await deriveKey(masterPw, salt);

    const e1 = makeEntry({ id: 'id-1', site: 'keep.com', password: 'KeepMe!' });
    const e2 = makeEntry({ id: 'id-2', site: 'delete.com', password: 'DeleteMe!' });
    const vault: DecryptedVault = { version: 1, entries: [e1, e2] };
    await saveVault(await encryptVault(vault, key, salt));

    // Delete e2
    const loaded = await loadVault();
    const decoded = await decryptVault(loaded!, key);
    const after = { ...decoded, entries: decoded.entries.filter(e => e.id !== 'id-2') };
    await saveVault(await encryptVault(after, key, salt));

    const final = await decryptVault((await loadVault())!, key);
    expect(final.entries).toHaveLength(1);
    expect(final.entries[0]?.site).toBe('keep.com');
  });

  it('clearing the vault leaves nothing to load', async () => {
    const { saveVault, loadVault, clearVault } = await import('../../src/storage/vault.js');
    const masterPw = 'ClearTestPw!';
    const salt = generateSalt();
    const key = await deriveKey(masterPw, salt);
    const vault: DecryptedVault = { version: 1, entries: [makeEntry()] };
    await saveVault(await encryptVault(vault, key, salt));

    await clearVault();
    expect(await loadVault()).toBeNull();
  });
});

describe('Cross-vault isolation', () => {
  it('two vaults with different master passwords cannot cross-decrypt', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKey('user1-pw', salt1);
    const key2 = await deriveKey('user2-pw', salt2);

    const vault1: DecryptedVault = { version: 1, entries: [makeEntry({ password: 'user1-secret' })] };
    const vault2: DecryptedVault = { version: 1, entries: [makeEntry({ password: 'user2-secret' })] };

    const enc1 = await encryptVault(vault1, key1, salt1);
    const enc2 = await encryptVault(vault2, key2, salt2);

    await expect(decryptVault(enc1, key2)).rejects.toThrow();
    await expect(decryptVault(enc2, key1)).rejects.toThrow();
  });
});
