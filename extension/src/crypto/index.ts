export { deriveKey, generateSalt } from './kdf.js';
export { encryptVault, decryptVault } from './aes.js';
export {
  isPlatformAuthenticatorAvailable,
  registerBiometric,
  authenticateWithBiometric,
  type BiometricRegistrationResult,
  type BiometricAuthResult,
} from './webauthn.js';
import type { GeneratorOptions } from '../types/index.js';

function fisherYatesShuffle(arr: string[]): string[] {
  const copy = [...arr];
  const rng = crypto.getRandomValues(new Uint32Array(copy.length));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (rng[i] as number) % (i + 1);
    [copy[i], copy[j]] = [copy[j] as string, copy[i] as string];
  }
  return copy;
}

export function generatePassword(opts: GeneratorOptions): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums  = '0123456789';
  const syms  = '!@#$%^&*()-_=+[]{}|;:,.<>?';

  let charset = '';
  if (opts.uppercase) charset += upper;
  if (opts.lowercase) charset += lower;
  if (opts.numbers)   charset += nums;
  if (opts.symbols)   charset += syms;

  if (!charset) throw new Error('At least one character class required');

  const result: string[] = [];
  const randomValues = crypto.getRandomValues(new Uint32Array(opts.length));
  for (let i = 0; i < opts.length; i++) {
    result.push((charset[(randomValues[i] as number) % charset.length]) as string);
  }
  return fisherYatesShuffle(result).join('');
}
