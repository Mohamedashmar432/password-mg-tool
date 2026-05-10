import type {
  MessageType,
  ExtensionMessage,
  UnlockPayload,
  AddEntryPayload,
  DeleteEntryPayload,
  UpdateEntryPayload,
  AutofillRequestPayload,
  CaptureCredentialsPayload,
  VaultStatusPayload,
  InitVaultPayload,
  RestoreVaultPayload,
  EncryptedVaultBlob,
  BulkAddEntriesPayload,
  VerifyMasterPasswordPayload,
  RegisterBiometricPayload,
  BiometricUnlockPayload,
  UpdateSessionSettingsPayload,
  SensitiveActionAuthPayload,
} from '../types/index.js';
import { loadVault, saveVault } from '../storage/vault.js';
import { deriveKey, decryptVault } from '../crypto/index.js';
import { vaultManager } from './vault-manager.js';
import { resetTimer, cancelTimer } from './auto-lock.js';
import {
  isBiometricEnrolled,
  getBiometricCredentialInfo,
} from './biometric-manager.js';
import { getRiskLevel } from './domain-risk.js';
import {
  loadSession,
  saveSession,
  DEFAULT_SESSION,
} from '../storage/auth-store.js';

const KNOWN_MESSAGE_TYPES: ReadonlySet<MessageType> = new Set<MessageType>([
  'AUTOFILL_REQUEST',
  'AUTOFILL_RESPONSE',
  'CAPTURE_CREDENTIALS',
  'CAPTURE_ACK',
  'LOCK_VAULT',
  'UNLOCK_VAULT',
  'VAULT_STATUS',
  'GET_STATUS',
  'ADD_ENTRY',
  'DELETE_ENTRY',
  'UPDATE_ENTRY',
  'GET_ENTRIES',
  'INIT_VAULT',
  'GET_VAULT_BLOB',
  'RESTORE_VAULT',
  'BULK_ADD_ENTRIES',
  'VERIFY_MASTER_PASSWORD',
  'REGISTER_BIOMETRIC',
  'BIOMETRIC_UNLOCK',
  'BIOMETRIC_STATUS',
  'SENSITIVE_ACTION_AUTH',
  'GET_SESSION_SETTINGS',
  'UPDATE_SESSION_SETTINGS',
]);

export function isKnownMessageType(type: unknown): type is MessageType {
  return typeof type === 'string' && KNOWN_MESSAGE_TYPES.has(type as MessageType);
}

export function requiresTabOrigin(type: MessageType): boolean {
  return type === 'AUTOFILL_REQUEST' || type === 'CAPTURE_CREDENTIALS';
}

function getStatus(): VaultStatusPayload {
  return {
    isLocked: vaultManager.isLocked(),
    entryCount: vaultManager.isLocked() ? 0 : vaultManager.getEntries().length,
    lastActivity: vaultManager.getLastActivity(),
  };
}

function lockAndCancel(): void {
  vaultManager.lock();
  cancelTimer();
}

export async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const { type, payload } = message;

  switch (type) {
    case 'UNLOCK_VAULT': {
      const p = payload as UnlockPayload;
      // Check if this is a "create new vault" scenario
      const success = await vaultManager.unlock(p.masterPassword);
      if (success) {
        resetTimer(lockAndCancel);
      }
      return { success, status: getStatus() };
    }

    case 'LOCK_VAULT': {
      lockAndCancel();
      return { status: getStatus() };
    }

    case 'GET_STATUS': {
      return { status: getStatus() };
    }

    case 'VAULT_STATUS': {
      return { status: getStatus() };
    }

    case 'GET_ENTRIES': {
      if (vaultManager.isLocked()) {
        throw new Error('Vault is locked');
      }
      return { entries: vaultManager.getEntries() };
    }

    case 'ADD_ENTRY': {
      if (vaultManager.isLocked()) {
        throw new Error('Vault is locked');
      }
      const p = payload as AddEntryPayload;
      const entry = await vaultManager.addEntry(p.entry);
      resetTimer(lockAndCancel);
      return { entry };
    }

    case 'DELETE_ENTRY': {
      if (vaultManager.isLocked()) {
        throw new Error('Vault is locked');
      }
      const p = payload as DeleteEntryPayload;
      await vaultManager.deleteEntry(p.id);
      resetTimer(lockAndCancel);
      return { success: true };
    }

    case 'UPDATE_ENTRY': {
      if (vaultManager.isLocked()) {
        throw new Error('Vault is locked');
      }
      const p = payload as UpdateEntryPayload;
      await vaultManager.updateEntry(p.id, p.updates);
      resetTimer(lockAndCancel);
      return { success: true };
    }

    case 'AUTOFILL_REQUEST': {
      if (vaultManager.isLocked()) {
        return { entries: [] };
      }
      const p = payload as AutofillRequestPayload;
      const hostname = p.hostname.toLowerCase();
      const allEntries = vaultManager.getEntries();
      const matching = allEntries.filter(entry => {
        try {
          const entryHost = new URL(entry.url).hostname.toLowerCase();
          return entryHost === hostname || entryHost.endsWith(`.${hostname}`) || hostname.endsWith(`.${entryHost}`);
        } catch {
          return entry.site.toLowerCase().includes(hostname);
        }
      });
      return {
        entries: matching.map(({ id, username, password, url, site }) => ({
          id,
          username,
          password,
          url,
          site,
        })),
      };
    }

    case 'CAPTURE_CREDENTIALS': {
      if (vaultManager.isLocked()) {
        return { success: false, reason: 'vault_locked' };
      }
      const p = payload as CaptureCredentialsPayload;
      // Check for duplicate entry for this hostname
      const existing = vaultManager.getEntries().find(e => {
        try {
          return new URL(e.url).hostname.toLowerCase() === p.hostname.toLowerCase();
        } catch {
          return false;
        }
      });
      if (existing) {
        // Update existing entry instead of creating duplicate
        await vaultManager.updateEntry(existing.id, {
          username: p.username,
          password: p.password,
          url: p.url,
        });
      } else {
        await vaultManager.addEntry({
          site: p.hostname,
          url: p.url,
          username: p.username,
          password: p.password,
        });
      }
      resetTimer(lockAndCancel);
      return { success: true };
    }

    case 'INIT_VAULT': {
      const p = payload as InitVaultPayload;
      await vaultManager.initNewVault(p.masterPassword);
      resetTimer(lockAndCancel);
      return { success: true, status: getStatus() };
    }

    case 'GET_VAULT_BLOB': {
      // Returns the raw JSON of the encrypted blob for backup purposes
      // The blob is already encrypted — never exposes plaintext
      const blob = await loadVault();
      if (!blob) return { blob: null };
      return { blob: JSON.stringify(blob) };
    }

    case 'RESTORE_VAULT': {
      const p = payload as RestoreVaultPayload;
      try {
        // Parse the blob
        const blob = JSON.parse(p.blobData) as EncryptedVaultBlob;
        // Verify the master password can decrypt it
        const saltBytes = Uint8Array.from(atob(blob.salt), c => c.charCodeAt(0));
        const key = await deriveKey(p.masterPassword, saltBytes);
        // This throws if wrong password (AES-GCM auth tag mismatch)
        await decryptVault(blob, key);
        // If successful, save the blob and unlock
        await saveVault(blob);
        // Unlock with the provided master password
        const success = await vaultManager.unlock(p.masterPassword);
        if (success) resetTimer(lockAndCancel);
        return { success, status: getStatus() };
      } catch {
        return { success: false, error: 'Invalid backup or wrong master password' };
      }
    }

    case 'BULK_ADD_ENTRIES': {
      if (vaultManager.isLocked()) throw new Error('Vault is locked');
      const p = payload as BulkAddEntriesPayload;
      const result = await vaultManager.bulkAddEntries(p.entries, p.skipDuplicates);
      resetTimer(lockAndCancel);
      return result;
    }

    case 'VERIFY_MASTER_PASSWORD': {
      const p = payload as VerifyMasterPasswordPayload;
      const valid = await vaultManager.verifyMasterPassword(p.masterPassword);
      return { valid };
    }

    case 'REGISTER_BIOMETRIC': {
      const p = payload as RegisterBiometricPayload;
      await vaultManager.registerBiometricForCurrentSession(
        p.prfOutput,
        p.credentialId,
        p.prfSalt,
      );
      return { success: true };
    }

    case 'BIOMETRIC_UNLOCK': {
      const p = payload as BiometricUnlockPayload;
      const success = await vaultManager.biometricUnlock(p.prfOutput);
      if (success) resetTimer(lockAndCancel);
      return { success, status: getStatus() };
    }

    case 'BIOMETRIC_STATUS': {
      const enrolled = await isBiometricEnrolled();
      const credInfo = enrolled ? await getBiometricCredentialInfo() : null;
      if (enrolled && credInfo) {
        return {
          enrolled: true,
          biometricEnabled: true,
          credentialId: credInfo.credentialId,
          prfSalt: credInfo.prfSalt,
        };
      }
      return { enrolled: false, biometricEnabled: false };
    }

    case 'SENSITIVE_ACTION_AUTH': {
      const p = payload as SensitiveActionAuthPayload;
      const session = (await loadSession()) ?? DEFAULT_SESSION;
      const risk = p.hostname ? getRiskLevel(p.hostname) : 'low';
      const required =
        (p.action === 'view' && session.requireAuthBeforeReveal) ||
        (p.action === 'copy' && session.requireAuthBeforeReveal) ||
        p.action === 'export' ||
        p.action === 'restore' ||
        (p.action === 'autofill' && (session.requireAuthBeforeAutofill || risk === 'high'));
      return { required };
    }

    case 'GET_SESSION_SETTINGS': {
      const session = (await loadSession()) ?? DEFAULT_SESSION;
      return session;
    }

    case 'UPDATE_SESSION_SETTINGS': {
      const current = (await loadSession()) ?? DEFAULT_SESSION;
      const updates = payload as UpdateSessionSettingsPayload;
      await saveSession({ ...current, ...updates });
      return { success: true };
    }

    case 'AUTOFILL_RESPONSE':
    case 'CAPTURE_ACK':
      // These are sent by background to content — no-op if received here
      return { success: true };

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled message type: ${String(_exhaustive)}`);
    }
  }
}
