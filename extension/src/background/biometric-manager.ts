import { wrapVaultKey, unwrapVaultKey } from '../crypto/key-wrap.js';
import {
  saveBiometricAuth,
  loadBiometricAuth,
  clearBiometricAuth,
} from '../storage/auth-store.js';
import { zeroBuffer } from './memory-security.js';

export async function storeBiometricRegistration(
  vaultKey: CryptoKey,
  prfOutput: ArrayBuffer,
  credentialId: ArrayBuffer,
  prfSalt: ArrayBuffer,
): Promise<void> {
  try {
    const { wrappedVaultKey, iv } = await wrapVaultKey(vaultKey, prfOutput);
    await saveBiometricAuth({
      id: 'biometric',
      credentialId,
      prfSalt,
      wrappedVaultKey,
      wrappedVaultIv: iv.buffer as ArrayBuffer,
      biometricEnabled: true,
    });
  } finally {
    zeroBuffer(prfOutput);
  }
}

export async function getWrappedKey(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  try {
    const auth = await loadBiometricAuth();
    if (!auth) throw new Error('No biometric registration found');
    if (!auth.biometricEnabled) throw new Error('Biometric unlock disabled');
    return await unwrapVaultKey(auth.wrappedVaultKey, auth.wrappedVaultIv, prfOutput);
  } finally {
    zeroBuffer(prfOutput);
  }
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const auth = await loadBiometricAuth();
  return auth !== null && auth.biometricEnabled;
}

export async function disableBiometric(): Promise<void> {
  await clearBiometricAuth();
}

export async function getBiometricCredentialInfo(): Promise<{
  credentialId: ArrayBuffer;
  prfSalt: ArrayBuffer;
} | null> {
  const auth = await loadBiometricAuth();
  if (!auth) return null;
  return { credentialId: auth.credentialId, prfSalt: auth.prfSalt };
}
