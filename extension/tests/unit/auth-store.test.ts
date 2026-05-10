import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

const mockAuth = {
  id: 'biometric' as const,
  credentialId: new Uint8Array([1, 2, 3]).buffer,
  prfSalt: new Uint8Array(32).buffer,
  wrappedVaultKey: new Uint8Array(60).buffer,
  wrappedVaultIv: new Uint8Array(12).buffer,
  biometricEnabled: true,
};

beforeEach(() => {
  (globalThis as Record<string, unknown>)['indexedDB'] = new IDBFactory();
  vi.resetModules();
});

describe('auth-store', () => {
  it('returns null when no auth stored', async () => {
    const { loadBiometricAuth } = await import('../../src/storage/auth-store.js');
    const loaded = await loadBiometricAuth();
    expect(loaded).toBeNull();
  });

  it('saves and loads biometric auth', async () => {
    const { saveBiometricAuth, loadBiometricAuth } = await import('../../src/storage/auth-store.js');
    await saveBiometricAuth(mockAuth);
    const loaded = await loadBiometricAuth();
    expect(loaded).not.toBeNull();
    expect(loaded!.biometricEnabled).toBe(true);
  });

  it('clears biometric auth', async () => {
    const { saveBiometricAuth, loadBiometricAuth, clearBiometricAuth } = await import('../../src/storage/auth-store.js');
    await saveBiometricAuth(mockAuth);
    await clearBiometricAuth();
    const loaded = await loadBiometricAuth();
    expect(loaded).toBeNull();
  });

  it('saves and loads session data', async () => {
    const { saveSession, loadSession } = await import('../../src/storage/auth-store.js');
    await saveSession({
      id: 'session',
      lastUnlock: 1000,
      lockTimeout: 300000,
      requireAuthBeforeAutofill: false,
      requireAuthBeforeReveal: true,
    });
    const session = await loadSession();
    expect(session).not.toBeNull();
    expect(session!.lockTimeout).toBe(300000);
    expect(session!.requireAuthBeforeReveal).toBe(true);
  });

  it('returns null session when none stored', async () => {
    const { loadSession } = await import('../../src/storage/auth-store.js');
    const session = await loadSession();
    expect(session).toBeNull();
  });
});
