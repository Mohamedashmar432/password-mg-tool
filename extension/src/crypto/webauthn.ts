// WebAuthn PRF-based biometric unlock service.
// MUST be called from an extension page (popup/dashboard) — not from a service worker.
// The PRF output is a 32-byte deterministic secret derived inside the platform
// authenticator (Windows Hello). Used as a wrapping key for the vault key.

export interface BiometricRegistrationResult {
  credentialId: ArrayBuffer;
  prfSalt: ArrayBuffer;
  prfOutput: ArrayBuffer;
}

export interface BiometricAuthResult {
  prfOutput: ArrayBuffer;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(
  userEmail: string,
): Promise<BiometricRegistrationResult> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'ZeroVault' },
      user: {
        id: userId,
        name: userEmail,
        displayName: 'ZeroVault User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      extensions: {
        prf: { eval: { first: prfSalt } },
      } as AuthenticationExtensionsClientInputs,
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!credential) throw new Error('WebAuthn registration cancelled');

  const extResults = credential.getClientExtensionResults() as Record<string, unknown>;
  const prfResults = (
    extResults['prf'] as { results?: { first?: ArrayBuffer } } | undefined
  )?.results;

  if (!prfResults?.first) {
    throw new Error(
      'PRF extension not supported on this device. Use master password instead.',
    );
  }

  return {
    credentialId: credential.rawId,
    prfSalt: prfSalt.buffer as ArrayBuffer,
    prfOutput: prfResults.first,
  };
}

export async function authenticateWithBiometric(
  credentialId: ArrayBuffer,
  prfSalt: ArrayBuffer,
): Promise<BiometricAuthResult> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials: [{ id: credentialId, type: 'public-key' }],
      userVerification: 'required',
      extensions: {
        prf: { eval: { first: prfSalt } },
      } as AuthenticationExtensionsClientInputs,
      timeout: 60000,
    },
  }) as PublicKeyCredential | null;

  if (!assertion) throw new Error('WebAuthn authentication cancelled');

  const extResults = assertion.getClientExtensionResults() as Record<string, unknown>;
  const prfResults = (
    extResults['prf'] as { results?: { first?: ArrayBuffer } } | undefined
  )?.results;

  if (!prfResults?.first) {
    throw new Error('PRF extension not supported. Use master password.');
  }

  return { prfOutput: prfResults.first };
}
