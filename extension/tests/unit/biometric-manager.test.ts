import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/crypto/key-wrap', () => ({
  wrapVaultKey: vi.fn().mockResolvedValue({
    wrappedVaultKey: new Uint8Array(60).buffer,
    iv: new Uint8Array(12),
  }),
  unwrapVaultKey: vi.fn().mockResolvedValue({} as CryptoKey),
}));

vi.mock('../../src/storage/auth-store', () => ({
  saveBiometricAuth: vi.fn().mockResolvedValue(undefined),
  loadBiometricAuth: vi.fn().mockResolvedValue({
    id: 'biometric' as const,
    credentialId: new Uint8Array([1]).buffer,
    prfSalt: new Uint8Array(32).buffer,
    wrappedVaultKey: new Uint8Array(60).buffer,
    wrappedVaultIv: new Uint8Array(12).buffer,
    biometricEnabled: true,
  }),
  clearBiometricAuth: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/background/memory-security', () => ({
  zeroBuffer: vi.fn(),
}));

import {
  storeBiometricRegistration,
  getWrappedKey,
  isBiometricEnrolled,
  disableBiometric,
  getBiometricCredentialInfo,
} from '../../src/background/biometric-manager';
import { wrapVaultKey } from '../../src/crypto/key-wrap';
import { saveBiometricAuth, clearBiometricAuth, loadBiometricAuth } from '../../src/storage/auth-store';

describe('biometric-manager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('storeBiometricRegistration wraps vault key with PRF output', async () => {
    const fakeVaultKey = {} as CryptoKey;
    const fakePrfOutput = new Uint8Array(32).buffer;
    await storeBiometricRegistration(
      fakeVaultKey,
      fakePrfOutput,
      new Uint8Array([1, 2]).buffer,
      new Uint8Array(32).buffer,
    );
    expect(wrapVaultKey).toHaveBeenCalledWith(fakeVaultKey, fakePrfOutput);
  });

  it('getWrappedKey retrieves and unwraps vault key', async () => {
    const fakePrfOutput = new Uint8Array(32).buffer;
    const key = await getWrappedKey(fakePrfOutput);
    expect(key).toBeDefined();
  });

  it('getWrappedKey throws when no biometric registered', async () => {
    vi.mocked(loadBiometricAuth).mockResolvedValueOnce(null);
    await expect(getWrappedKey(new Uint8Array(32).buffer)).rejects.toThrow();
  });

  it('isBiometricEnrolled returns true when auth record exists', async () => {
    const enrolled = await isBiometricEnrolled();
    expect(enrolled).toBe(true);
  });

  it('isBiometricEnrolled returns false when no auth record', async () => {
    vi.mocked(loadBiometricAuth).mockResolvedValueOnce(null);
    const enrolled = await isBiometricEnrolled();
    expect(enrolled).toBe(false);
  });

  it('disableBiometric clears auth record', async () => {
    await disableBiometric();
    expect(clearBiometricAuth).toHaveBeenCalled();
  });

  it('getBiometricCredentialInfo returns null when not enrolled', async () => {
    vi.mocked(loadBiometricAuth).mockResolvedValueOnce(null);
    const info = await getBiometricCredentialInfo();
    expect(info).toBeNull();
  });

  it('getBiometricCredentialInfo returns credentialId and prfSalt when enrolled', async () => {
    const info = await getBiometricCredentialInfo();
    expect(info).not.toBeNull();
    expect(info!.credentialId).toBeDefined();
    expect(info!.prfSalt).toBeDefined();
  });

  it('storeBiometricRegistration zeros prfOutput even if saveBiometricAuth fails', async () => {
    const { zeroBuffer } = await import('../../src/background/memory-security');
    vi.mocked(saveBiometricAuth).mockRejectedValueOnce(new Error('IDB error'));
    const fakePrfOutput = new Uint8Array(32).buffer;
    await expect(
      storeBiometricRegistration({} as CryptoKey, fakePrfOutput, new Uint8Array([1]).buffer, new Uint8Array(32).buffer)
    ).rejects.toThrow('IDB error');
    expect(zeroBuffer).toHaveBeenCalledWith(fakePrfOutput);
  });

  it('getWrappedKey zeros prfOutput when no auth found', async () => {
    const { zeroBuffer } = await import('../../src/background/memory-security');
    vi.mocked(loadBiometricAuth).mockResolvedValueOnce(null);
    const fakePrf = new Uint8Array(32).buffer;
    await expect(getWrappedKey(fakePrf)).rejects.toThrow();
    expect(zeroBuffer).toHaveBeenCalledWith(fakePrf);
  });

  it('getWrappedKey zeros prfOutput when biometric disabled', async () => {
    const { zeroBuffer } = await import('../../src/background/memory-security');
    vi.mocked(loadBiometricAuth).mockResolvedValueOnce({
      id: 'biometric' as const,
      credentialId: new Uint8Array([1]).buffer,
      prfSalt: new Uint8Array(32).buffer,
      wrappedVaultKey: new Uint8Array(60).buffer,
      wrappedVaultIv: new Uint8Array(12).buffer,
      biometricEnabled: false,
    });
    const fakePrf = new Uint8Array(32).buffer;
    await expect(getWrappedKey(fakePrf)).rejects.toThrow('Biometric unlock disabled');
    expect(zeroBuffer).toHaveBeenCalledWith(fakePrf);
  });
});
