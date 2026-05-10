import type { EncryptedVaultBlob, DecryptedVault } from '../types/index.js';

function b64encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64decode(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

export async function encryptVault(
  vault: DecryptedVault,
  key: CryptoKey,
  salt: Uint8Array
): Promise<EncryptedVaultBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(vault));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  return {
    version: 1,
    kdf: 'pbkdf2',
    salt: b64encode(salt.buffer as ArrayBuffer),
    iv: b64encode(iv.buffer as ArrayBuffer),
    ciphertext: b64encode(ciphertext),
  };
}

export async function decryptVault(
  blob: EncryptedVaultBlob,
  key: CryptoKey
): Promise<DecryptedVault> {
  const iv = b64decode(blob.iv);
  const ciphertext = b64decode(blob.ciphertext);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plaintext)) as DecryptedVault;
}
