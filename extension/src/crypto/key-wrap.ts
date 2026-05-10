export interface WrappedKey {
  wrappedVaultKey: ArrayBuffer;
  iv: Uint8Array;
}

async function prfToWrappingKey(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    prfOutput,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function wrapVaultKey(
  vaultKey: CryptoKey,
  prfOutput: ArrayBuffer,
): Promise<WrappedKey> {
  const wrappingKey = await prfToWrappingKey(prfOutput);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawVaultKey = await crypto.subtle.exportKey('raw', vaultKey);
  const wrappedVaultKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    rawVaultKey,
  );
  return { wrappedVaultKey, iv };
}

export async function unwrapVaultKey(
  wrappedVaultKey: ArrayBuffer,
  iv: ArrayBuffer,
  prfOutput: ArrayBuffer,
): Promise<CryptoKey> {
  const wrappingKey = await prfToWrappingKey(prfOutput);
  const rawVaultKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    wrappedVaultKey,
  );
  return crypto.subtle.importKey(
    'raw',
    rawVaultKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
