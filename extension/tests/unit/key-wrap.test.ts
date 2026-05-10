import { describe, it, expect } from 'vitest';
import { wrapVaultKey, unwrapVaultKey } from '../../src/crypto/key-wrap';

describe('key-wrap', () => {
  it('wraps and unwraps a vault key with PRF output — decrypted key works for encryption', async () => {
    const vaultKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const prfOutput = crypto.getRandomValues(new Uint8Array(32)).buffer;

    const { wrappedVaultKey, iv } = await wrapVaultKey(vaultKey, prfOutput);
    expect(wrappedVaultKey).toBeInstanceOf(ArrayBuffer);
    expect(iv).toHaveLength(12);

    const unwrapped = await unwrapVaultKey(wrappedVaultKey, iv, prfOutput);

    // Verify unwrapped key works
    const testData = new TextEncoder().encode('hello');
    const testIv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: testIv }, unwrapped, testData);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: testIv }, unwrapped, encrypted);
    expect(new TextDecoder().decode(decrypted)).toBe('hello');
  });

  it('fails to unwrap with wrong PRF output', async () => {
    const vaultKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
    const prfOutput = crypto.getRandomValues(new Uint8Array(32)).buffer;
    const wrongPrf = crypto.getRandomValues(new Uint8Array(32)).buffer;

    const { wrappedVaultKey, iv } = await wrapVaultKey(vaultKey, prfOutput);
    await expect(unwrapVaultKey(wrappedVaultKey, iv, wrongPrf)).rejects.toThrow();
  });
});
