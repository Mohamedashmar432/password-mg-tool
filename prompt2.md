# 🎯 Current State

The extension already supports:

* encrypted local vault
* IndexedDB storage
* login/signup detection
* autofill
* password generation
* Azure Blob encrypted backup
* MongoDB backend for identity + vault metadata only

Now implement secure biometric/platform unlock using WebAuthn + Windows Hello WITHOUT requiring any native installer or external application.

# ⚠️ CRITICAL SECURITY REQUIREMENTS

* Never access or store Windows password
* Never store master password
* Never send decrypted vault to backend
* Never expose vault to content scripts
* All crypto must happen client-side
* Use browser-native WebAuthn only
* No native host / no external executable

# 🎯 OBJECTIVE

Allow users to:

* unlock vault using Windows Hello
* authenticate with fingerprint/PIN/face unlock
* view passwords only after Windows Security confirmation
* autofill sensitive credentials only after verification

This should behave similar to:

* Brave password manager
* Bitwarden biometric unlock
* Chrome password manager

# 🧱 ARCHITECTURE REQUIREMENTS

Use this security model:

Master Password
↓
Derive Vault Key
↓
Encrypt Vault (AES-GCM)
↓
Wrap Vault Key using WebAuthn credential
↓
Store wrapped key locally

Future unlocks:
Windows Hello → WebAuthn success → unwrap vault key → decrypt vault

# 🔐 IMPLEMENT WEBAUTHN PLATFORM AUTHENTICATOR

Use:

* navigator.credentials.create()
* navigator.credentials.get()

Requirements:

* authenticatorAttachment: "platform"
* residentKey: "preferred"
* userVerification: "required"

Must trigger:

* Windows Hello
* fingerprint
* PIN
* face unlock

# 📦 IMPLEMENTATION TASKS

## PHASE 1 — WEBAUTHN REGISTRATION

Create biometric enrollment flow.

After successful master password login:

1. Generate vault key
2. Register WebAuthn credential
3. Wrap vault key securely
4. Store:

   * credentialId
   * wrappedVaultKey
   * encryptedVault

Store inside IndexedDB.

# 💾 INDEXEDDB STRUCTURE

Database: zerovault-db

Object stores:

vault:

* encryptedVault
* version
* updatedAt

auth:

* credentialId
* wrappedVaultKey
* biometricEnabled

session:

* lastUnlock
* lockTimeout

# 🔐 PHASE 2 — VAULT KEY WRAPPING

Implement secure key wrapping.

Requirements:

* AES-GCM
* CryptoKey objects
* Non-exportable keys where possible
* Use Web Crypto API only

Do NOT:

* serialize plaintext keys unnecessarily
* store raw vault key unencrypted

# 🔓 PHASE 3 — WINDOWS HELLO UNLOCK FLOW

When user:

* opens dashboard
* clicks "view password"
* triggers autofill for sensitive sites

Flow:

1. Trigger navigator.credentials.get()
2. Browser displays Windows Security popup
3. User authenticates using:

   * fingerprint
   * PIN
   * face unlock
4. On success:

   * unwrap vault key
   * decrypt vault in memory
5. Auto-lock after inactivity

# ⏱️ PHASE 4 — AUTO LOCKING

Implement:

* inactivity timer
* memory cleanup
* vault lock state

Requirements:

* clear decrypted vault from memory
* clear temporary keys
* require re-authentication

Default timeout:

* 5 minutes

# 🛡️ PHASE 5 — SENSITIVE ACTION PROTECTION

Require Windows Hello authentication for:

* viewing password
* copying password
* exporting vault
* restoring vault
* autofill on banking/payment domains

Implement configurable policy settings.

# 🌐 PHASE 6 — DOMAIN RISK DETECTION

Add heuristic detection:

* banking
* crypto
* admin portals

For high-risk domains:

* always require biometric confirmation before autofill

# 🧠 PHASE 7 — MEMORY SECURITY

Requirements:

* keep decrypted vault only in memory
* never persist plaintext vault
* zero sensitive buffers after lock
* avoid console logs containing secrets

# 🔒 PHASE 8 — CSP + EXTENSION HARDENING

Implement:

* strict CSP
* no inline scripts
* no eval
* validate runtime messages
* isolate content scripts
* avoid DOM injection vulnerabilities

# 🎨 PHASE 9 — UI/UX

Add settings page:

* Enable Windows Hello
* Disable biometric unlock
* Lock timeout configuration
* Require auth before autofill
* Require auth before reveal

Add unlock modal:

* "Verify using Windows Security"

# 🧪 PHASE 10 — TESTING

Create tests for:

* WebAuthn registration
* biometric unlock flow
* vault lock/unlock
* autofill gating
* timeout locking
* restore from backup

Include edge cases:

* biometric canceled
* authenticator unavailable
* vault corruption
* wrong master password
* browser restart

# 📁 REQUIRED OUTPUTS

Provide:

1. Folder structure
2. WebAuthn service module
3. Vault key wrapping implementation
4. IndexedDB schema
5. Unlock flow logic
6. React/Svelte UI components
7. Auto-lock manager
8. Security middleware
9. Test plan
10. Step-by-step implementation sequence

# ⚠️ IMPORTANT IMPLEMENTATION RULES

* Use TypeScript everywhere
* Use async/await
* Use Web Crypto API only
* Avoid unnecessary libraries
* Keep extension lightweight
* Follow Manifest V3 constraints
* Build production-quality code

# 🚀 EXECUTION STYLE

Implement incrementally.
Start with:

1. WebAuthn registration service
2. Vault key wrapping
3. Windows Hello unlock flow

Explain security reasoning briefly for each major module.
