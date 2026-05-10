const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const HASH = 'SHA-256';

async function importMasterPassword(masterPassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
}

export async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await importMasterPassword(masterPassword);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    true,  // extractable: needed for wrapVaultKey to export raw bytes for biometric wrapping
    ['encrypt', 'decrypt']
  );
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}
