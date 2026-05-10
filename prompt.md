You are a senior full-stack security engineer. Build a lightweight browser-based password manager with a zero-knowledge architecture. Follow strict security practices. Do not take shortcuts.

# 🎯 Objective

Build a browser extension-based password manager with:

* Local encrypted vault
* Autofill + form detection
* Password generator
* Optional encrypted backup to Azure Blob Storage
* Minimal backend (MongoDB) for user identity and vault metadata only

# 🧱 Core Architecture

System has 3 components:

1. Browser Extension (primary application)
2. Backend API (Node.js + MongoDB)
3. Azure Blob Storage (encrypted vault backup only)

⚠️ CRITICAL RULE:

* Backend MUST NEVER see plaintext passwords or decrypted vault
* All encryption/decryption happens client-side only

---

# 🧩 PHASE 1 — EXTENSION FOUNDATION

## Stack:

* TypeScript
* Manifest V3
* Svelte (for UI)
* TailwindCSS
* Web Crypto API

## Build:

* Extension structure:

  * /background (service worker)
  * /content (DOM interaction)
  * /popup (quick UI)
  * /dashboard (full vault UI)
  * /crypto (encryption logic)
  * /storage (IndexedDB wrapper)

## Features:

* Detect login forms
* Detect signup forms (confirm password fields)
* Capture credentials on submit
* Autofill credentials on page load

---

# 🔐 PHASE 2 — ENCRYPTION MODULE (CRITICAL)

Implement zero-knowledge vault encryption.

## Requirements:

* Algorithm: AES-GCM (256-bit)
* Key derivation: PBKDF2 (minimum 100k iterations) OR Argon2 (preferred)
* Use Web Crypto API ONLY

## Flow:

1. User enters master password
2. Derive key using salt
3. Encrypt vault JSON
4. Store encrypted blob

## Vault format:

{
version: 1,
kdf: "pbkdf2",
salt: base64,
iv: base64,
ciphertext: base64
}

## Rules:

* Never store master password
* Never log sensitive data
* Keep decrypted vault only in memory

---

# 💾 PHASE 3 — LOCAL STORAGE

Use IndexedDB.

## Store:

* encrypted vault blob
* metadata (last updated, version)

## Build:

* storage service:

  * saveVault()
  * loadVault()
  * updateVault()

---

# 🔑 PHASE 4 — AUTH SYSTEM (BACKEND)

## Stack:

* Node.js
* Fastify
* MongoDB

## Collections:

users:

* _id
* email
* password_hash (bcrypt)
* created_at

vault_meta:

* user_id
* has_backup (boolean)
* last_backup_at
* blob_path

## Features:

* Signup
* Login
* JWT authentication

⚠️ DO NOT store:

* master password
* vault content

---

# ☁️ PHASE 5 — AZURE BLOB BACKUP

Use Azure Blob Storage.

## Requirements:

* Private container
* Use SAS tokens (short-lived)
* Upload encrypted vault only

## Flow:

1. Extension requests upload URL from backend
2. Backend returns SAS token
3. Extension uploads encrypted blob directly
4. Backend stores metadata only

## Restore:

1. Fetch blob via SAS
2. Decrypt locally using master password

---

# 🧠 PHASE 6 — DASHBOARD UI

Inside extension (not separate web app)

## Features:

* List credentials
* Search/filter
* View password (requires master password unlock)
* Edit/delete entries
* Password strength indicator
* Backup status indicator

---

# 🔐 PHASE 7 — SECURITY HARDENING

Implement:

* CSP (no unsafe-eval)
* No inline scripts
* Input sanitization
* Secure messaging between content script & background
* Clipboard auto-clear
* Auto-lock vault after inactivity

---

# ⚙️ PHASE 8 — PASSWORD GENERATOR

Features:

* Length control
* Uppercase / lowercase / numbers / symbols
* Use crypto.getRandomValues()

---

# 🧪 PHASE 9 — TESTING

Write:

* Unit tests for crypto
* Integration tests for vault flow
* Manual test cases:

  * login detection
  * autofill accuracy
  * backup + restore

---

# 📦 DELIVERABLES

Produce:

1. Full folder structure
2. Key code files (crypto, storage, extension logic)
3. Backend API routes
4. MongoDB schema
5. Azure upload logic
6. Step-by-step run instructions

---

# ⚠️ NON-NEGOTIABLE SECURITY RULES

* No plaintext passwords anywhere
* No master password storage
* No sensitive logs
* All encryption must be client-side
* Backend must be zero-knowledge

---

# 🚀 EXECUTION STYLE

* Build step-by-step
* Explain each module briefly
* Provide production-quality code
* Avoid unnecessary dependencies
* Keep bundle size minimal

Start with PHASE 1 and proceed sequentially.
