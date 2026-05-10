// Vault structures
export interface EncryptedVaultBlob {
  version: 1;
  kdf: 'pbkdf2';
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface DecryptedVault {
  version: 1;
  entries: VaultEntry[];
}

export interface VaultEntry {
  id: string;
  site: string;
  url: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VaultStorageRecord {
  id: 'vault';
  blob: EncryptedVaultBlob;
  updatedAt: number;
}

// Messaging
export type MessageType =
  | 'AUTOFILL_REQUEST'
  | 'AUTOFILL_RESPONSE'
  | 'CAPTURE_CREDENTIALS'
  | 'CAPTURE_ACK'
  | 'LOCK_VAULT'
  | 'UNLOCK_VAULT'
  | 'VAULT_STATUS'
  | 'GET_STATUS'
  | 'ADD_ENTRY'
  | 'DELETE_ENTRY'
  | 'UPDATE_ENTRY'
  | 'GET_ENTRIES'
  | 'INIT_VAULT'
  | 'GET_VAULT_BLOB'
  | 'RESTORE_VAULT'
  | 'BULK_ADD_ENTRIES'
  | 'VERIFY_MASTER_PASSWORD'
  | 'REGISTER_BIOMETRIC'
  | 'BIOMETRIC_UNLOCK'
  | 'BIOMETRIC_STATUS'
  | 'SENSITIVE_ACTION_AUTH'
  | 'GET_SESSION_SETTINGS'
  | 'UPDATE_SESSION_SETTINGS';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload: T;
  sourceTabId?: number;
}

export interface AutofillRequestPayload { hostname: string; }
export interface AutofillResponsePayload {
  entries: Pick<VaultEntry, 'id' | 'username' | 'password' | 'url' | 'site'>[];
}
export interface CaptureCredentialsPayload {
  hostname: string;
  username: string;
  password: string;
  url: string;
}
export interface VaultStatusPayload {
  isLocked: boolean;
  entryCount: number;
  lastActivity: number;
}
export interface UnlockPayload { masterPassword: string; }
export interface AddEntryPayload { entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>; }
export interface DeleteEntryPayload { id: string; }
export interface UpdateEntryPayload { id: string; updates: Partial<Omit<VaultEntry, 'id' | 'createdAt'>>; }
export interface InitVaultPayload { masterPassword: string; }
export interface RestoreVaultPayload { masterPassword: string; blobData: string; }
export interface BulkAddEntriesPayload {
  entries: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>[];
  skipDuplicates: boolean;
}
export interface BulkAddEntriesResult {
  added: number;
  skipped: number;
}
export interface VerifyMasterPasswordPayload { masterPassword: string; }
export interface ExportPayload { masterPassword: string; format: 'csv' | 'json'; }

// API
export interface SignupRequest { email: string; password: string; }
export interface LoginRequest { email: string; password: string; }
export interface AuthResponse { token: string; }
export interface VaultMetadataResponse { has_backup: boolean; last_backup_at: string | null; }
export interface UploadTokenResponse { sasToken: string; blobUrl: string; }

// Generator
export interface GeneratorOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

// Form detection
export type FormKind = 'login' | 'signup' | 'unknown';
export interface DetectedForm {
  kind: FormKind;
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement | null;
  confirmField: HTMLInputElement | null;
  form: HTMLFormElement;
}

// --- Biometric / WebAuthn ---

export interface BiometricAuth {
  id: 'biometric';
  credentialId: ArrayBuffer;
  prfSalt: ArrayBuffer;
  wrappedVaultKey: ArrayBuffer;
  wrappedVaultIv: ArrayBuffer;
  biometricEnabled: boolean;
}

export interface SessionData {
  id: 'session';
  lastUnlock: number;
  lockTimeout: number;           // milliseconds, default 300000 (5 min)
  requireAuthBeforeAutofill: boolean;
  requireAuthBeforeReveal: boolean;
}

export type DomainRiskLevel = 'high' | 'medium' | 'low';

export interface RegisterBiometricPayload {
  prfOutput: ArrayBuffer;
  credentialId: ArrayBuffer;
  prfSalt: ArrayBuffer;
}

export interface BiometricUnlockPayload {
  prfOutput: ArrayBuffer;
}

export interface BiometricStatusPayload {
  enrolled: boolean;
  biometricEnabled: boolean;
  credentialId?: ArrayBuffer;
  prfSalt?: ArrayBuffer;
}

export interface SensitiveActionAuthPayload {
  action: 'view' | 'copy' | 'export' | 'restore' | 'autofill';
  hostname?: string;
}

export interface SensitiveActionAuthResult {
  required: boolean;
}

export interface UpdateSessionSettingsPayload {
  lockTimeout?: number;
  requireAuthBeforeAutofill?: boolean;
  requireAuthBeforeReveal?: boolean;
}
