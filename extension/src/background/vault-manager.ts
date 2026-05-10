import { deriveKey, generateSalt, encryptVault, decryptVault } from '../crypto/index.js';
import { saveVault, loadVault } from '../storage/vault.js';
import type { VaultEntry, DecryptedVault } from '../types/index.js';
import { storeBiometricRegistration, getWrappedKey } from './biometric-manager.js';

// Module-scope vault state — never persisted, lives only in service worker memory
let _vault: DecryptedVault | null = null;
let _key: CryptoKey | null = null;
let _salt: Uint8Array | null = null;
let _lastActivity: number = 0;

function generateId(): string {
  const buf = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
}

async function persistVault(): Promise<void> {
  if (!_vault || !_key || !_salt) {
    throw new Error('Vault is locked — cannot persist');
  }
  const blob = await encryptVault(_vault, _key, _salt);
  await saveVault(blob);
}

export const vaultManager = {
  async unlock(masterPassword: string): Promise<boolean> {
    try {
      const blob = await loadVault();
      if (!blob) {
        // No vault exists yet — unlock fails (user must init first)
        return false;
      }
      // Decode salt from the stored blob
      const saltBytes = Uint8Array.from(atob(blob.salt), c => c.charCodeAt(0));
      const key = await deriveKey(masterPassword, saltBytes);
      // Attempt decryption — throws on wrong password (AES-GCM auth tag mismatch)
      const vault = await decryptVault(blob, key);
      _vault = vault;
      _key = key;
      _salt = saltBytes;
      _lastActivity = Date.now();
      return true;
    } catch {
      // Wrong password or corrupted blob
      return false;
    }
  },

  lock(): void {
    _vault = null;
    _key = null;
    _salt = null;
  },

  isLocked(): boolean {
    return _vault === null || _key === null;
  },

  getLastActivity(): number {
    return _lastActivity;
  },

  getEntries(): VaultEntry[] {
    if (!_vault) return [];
    return [..._vault.entries];
  },

  async addEntry(entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<VaultEntry> {
    if (!_vault || !_key || !_salt) {
      throw new Error('Vault is locked');
    }
    const now = Date.now();
    const newEntry: VaultEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    _vault.entries.push(newEntry);
    _lastActivity = now;
    await persistVault();
    return newEntry;
  },

  async deleteEntry(id: string): Promise<void> {
    if (!_vault || !_key || !_salt) {
      throw new Error('Vault is locked');
    }
    const idx = _vault.entries.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Entry not found: ${id}`);
    _vault.entries.splice(idx, 1);
    _lastActivity = Date.now();
    await persistVault();
  },

  async updateEntry(
    id: string,
    updates: Partial<Omit<VaultEntry, 'id' | 'createdAt'>>
  ): Promise<void> {
    if (!_vault || !_key || !_salt) {
      throw new Error('Vault is locked');
    }
    const entry = _vault.entries.find(e => e.id === id);
    if (!entry) throw new Error(`Entry not found: ${id}`);
    Object.assign(entry, updates, { updatedAt: Date.now() });
    _lastActivity = Date.now();
    await persistVault();
  },

  async initNewVault(masterPassword: string): Promise<void> {
    const salt = generateSalt();
    const key = await deriveKey(masterPassword, salt);
    const vault: DecryptedVault = { version: 1, entries: [] };
    _vault = vault;
    _key = key;
    _salt = salt;
    _lastActivity = Date.now();
    await persistVault();
  },

  async bulkAddEntries(
    rawEntries: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>[],
    skipDuplicates: boolean
  ): Promise<{ added: number; skipped: number }> {
    if (!_vault || !_key || !_salt) throw new Error('Vault is locked');
    const now = Date.now();
    let added = 0;
    let skipped = 0;
    for (const raw of rawEntries) {
      if (skipDuplicates) {
        const isDupe = _vault.entries.some(
          e => e.site === raw.site && e.username === raw.username
        );
        if (isDupe) { skipped++; continue; }
      }
      _vault.entries.push({ ...raw, id: generateId(), createdAt: now, updatedAt: now });
      added++;
    }
    if (added > 0) {
      _lastActivity = now;
      await persistVault();
    }
    return { added, skipped };
  },

  // Re-derives a key from the provided master password and attempts to decrypt
  // the stored blob. Returns true only if decryption succeeds — used to gate exports.
  async verifyMasterPassword(masterPassword: string): Promise<boolean> {
    try {
      const blob = await loadVault();
      if (!blob) return false;
      const saltBytes = Uint8Array.from(atob(blob.salt), c => c.charCodeAt(0));
      const key = await deriveKey(masterPassword, saltBytes);
      await decryptVault(blob, key);
      return true;
    } catch {
      return false;
    }
  },

  // Called after successful biometric auth in popup/dashboard — prfOutput zeroed inside getWrappedKey
  async biometricUnlock(prfOutput: ArrayBuffer): Promise<boolean> {
    try {
      const blob = await loadVault();
      if (!blob) return false;
      const key = await getWrappedKey(prfOutput); // zeroes prfOutput in finally
      const saltBytes = Uint8Array.from(atob(blob.salt), c => c.charCodeAt(0));
      const vault = await decryptVault(blob, key);
      _vault = vault;
      _key = key;
      _salt = saltBytes;
      _lastActivity = Date.now();
      return true;
    } catch {
      return false;
    }
  },

  // Wraps current in-memory vault key with PRF output and persists the wrapped key.
  // Must be called while vault is unlocked (after master password login).
  async registerBiometricForCurrentSession(
    prfOutput: ArrayBuffer,
    credentialId: ArrayBuffer,
    prfSalt: ArrayBuffer,
  ): Promise<void> {
    if (!_key) throw new Error('Vault must be unlocked before registering biometric');
    await storeBiometricRegistration(_key, prfOutput, credentialId, prfSalt);
  },
};
