import { describe, it, expect } from 'vitest';
import { deriveKey, generateSalt } from '../../src/crypto/kdf.js';
import { encryptVault, decryptVault } from '../../src/crypto/aes.js';
import { generatePassword } from '../../src/crypto/index.js';
import type { DecryptedVault } from '../../src/types/index.js';

const emptyVault: DecryptedVault = { version: 1, entries: [] };
const vaultWithEntry: DecryptedVault = {
  version: 1,
  entries: [
    {
      id: 'test-id-1',
      site: 'example.com',
      url: 'https://example.com/login',
      username: 'user@example.com',
      password: 'S3cr3t!Passw0rd',
      createdAt: 1000000,
      updatedAt: 1000000,
    },
  ],
};

describe('PBKDF2 key derivation', () => {
  it('derives a key without throwing', async () => {
    const salt = generateSalt();
    await expect(deriveKey('masterPw123!', salt)).resolves.toBeDefined();
  });

  it('generates a non-extractable key', async () => {
    const salt = generateSalt();
    const key = await deriveKey('masterPw123!', salt);
    expect(key.extractable).toBe(false);
  });

  it('two derivations with the same password+salt produce equivalent keys (verified via encrypt/decrypt)', async () => {
    const salt = generateSalt();
    const key1 = await deriveKey('same-password', salt);
    const key2 = await deriveKey('same-password', salt);
    const blob = await encryptVault(emptyVault, key1, salt);
    await expect(decryptVault(blob, key2)).resolves.toEqual(emptyVault);
  });

  it('different passwords produce different keys (decrypt fails)', async () => {
    const salt = generateSalt();
    const goodKey = await deriveKey('correct-password', salt);
    const badKey = await deriveKey('wrong-password', salt);
    const blob = await encryptVault(emptyVault, goodKey, salt);
    await expect(decryptVault(blob, badKey)).rejects.toThrow();
  });

  it('same password with different salts produces different keys', async () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const key1 = await deriveKey('same-pw', salt1);
    const key2 = await deriveKey('same-pw', salt2);
    const blob = await encryptVault(emptyVault, key1, salt1);
    await expect(decryptVault(blob, key2)).rejects.toThrow();
  });
});

describe('generateSalt', () => {
  it('returns a 16-byte Uint8Array', () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it('generates unique salts each time', () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    expect(Buffer.from(s1).toString('hex')).not.toBe(Buffer.from(s2).toString('hex'));
  });
});

describe('AES-GCM encrypt/decrypt', () => {
  it('round-trips an empty vault', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob = await encryptVault(emptyVault, key, salt);
    await expect(decryptVault(blob, key)).resolves.toEqual(emptyVault);
  });

  it('round-trips a vault with entries', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob = await encryptVault(vaultWithEntry, key, salt);
    const result = await decryptVault(blob, key);
    expect(result).toEqual(vaultWithEntry);
    expect(result.entries[0]?.password).toBe('S3cr3t!Passw0rd');
  });

  it('ciphertext does not contain plaintext password', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob = await encryptVault(vaultWithEntry, key, salt);
    expect(blob.ciphertext).not.toContain('S3cr3t!Passw0rd');
    expect(blob.ciphertext).not.toContain('user@example.com');
  });

  it('blob has the correct format shape', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob = await encryptVault(emptyVault, key, salt);
    expect(blob.version).toBe(1);
    expect(blob.kdf).toBe('pbkdf2');
    expect(typeof blob.salt).toBe('string');
    expect(typeof blob.iv).toBe('string');
    expect(typeof blob.ciphertext).toBe('string');
  });

  it('generates a unique IV on every encrypt call', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob1 = await encryptVault(emptyVault, key, salt);
    const blob2 = await encryptVault(emptyVault, key, salt);
    expect(blob1.iv).not.toBe(blob2.iv);
  });

  it('different ciphertexts for same plaintext due to random IV', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob1 = await encryptVault(emptyVault, key, salt);
    const blob2 = await encryptVault(emptyVault, key, salt);
    expect(blob1.ciphertext).not.toBe(blob2.ciphertext);
  });

  it('tampered ciphertext fails to decrypt', async () => {
    const salt = generateSalt();
    const key = await deriveKey('pw', salt);
    const blob = await encryptVault(emptyVault, key, salt);
    const tampered = { ...blob, ciphertext: blob.ciphertext.slice(0, -4) + 'XXXX' };
    await expect(decryptVault(tampered, key)).rejects.toThrow();
  });
});

describe('generatePassword', () => {
  it('generates password of the correct length', () => {
    const pw = generatePassword({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: false });
    expect(pw.length).toBe(20);
  });

  it('respects character class restrictions (numbers only)', () => {
    const pw = generatePassword({ length: 32, uppercase: false, lowercase: false, numbers: true, symbols: false });
    expect(/^[0-9]+$/.test(pw)).toBe(true);
  });

  it('respects character class restrictions (uppercase only)', () => {
    const pw = generatePassword({ length: 16, uppercase: true, lowercase: false, numbers: false, symbols: false });
    expect(/^[A-Z]+$/.test(pw)).toBe(true);
  });

  it('includes symbols when requested', () => {
    const results = Array.from({ length: 20 }, () =>
      generatePassword({ length: 32, uppercase: false, lowercase: false, numbers: false, symbols: true })
    );
    const hasSymbol = results.some(pw => /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(pw));
    expect(hasSymbol).toBe(true);
  });

  it('throws when no character class is selected', () => {
    expect(() =>
      generatePassword({ length: 16, uppercase: false, lowercase: false, numbers: false, symbols: false })
    ).toThrow('At least one character class required');
  });

  it('generates unique passwords (statistical check)', () => {
    const pws = new Set(
      Array.from({ length: 10 }, () =>
        generatePassword({ length: 24, uppercase: true, lowercase: true, numbers: true, symbols: true })
      )
    );
    expect(pws.size).toBeGreaterThan(1);
  });

  it('works at minimum length (8)', () => {
    const pw = generatePassword({ length: 8, uppercase: true, lowercase: true, numbers: true, symbols: false });
    expect(pw.length).toBe(8);
  });

  it('works at maximum length (128)', () => {
    const pw = generatePassword({ length: 128, uppercase: true, lowercase: true, numbers: true, symbols: true });
    expect(pw.length).toBe(128);
  });
});
