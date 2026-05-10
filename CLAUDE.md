# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A zero-knowledge browser extension password manager. The full spec is in `prompt.md`.

**Critical constraint: the backend must never see plaintext passwords or decrypted vault data. All encryption/decryption happens client-side only.**

## Architecture

Three components:

1. **Browser Extension** — primary app (Manifest V3, TypeScript, Svelte, TailwindCSS, Web Crypto API)
2. **Backend API** — identity + vault metadata only (Node.js, Fastify, MongoDB)
3. **Azure Blob Storage** — encrypted vault backup only (accessed via SAS tokens from extension directly)

### Extension folder layout (to be created)
```
extension/
  background/   # service worker
  content/      # DOM interaction, form detection, autofill
  popup/        # quick UI
  dashboard/    # full vault UI
  crypto/       # AES-GCM encryption, PBKDF2/Argon2 key derivation
  storage/      # IndexedDB wrapper (saveVault, loadVault, updateVault)
```

### Vault format on disk
```json
{ "version": 1, "kdf": "pbkdf2", "salt": "<base64>", "iv": "<base64>", "ciphertext": "<base64>" }
```

## Security Rules (non-negotiable)

- Encryption: AES-GCM 256-bit via Web Crypto API only
- Key derivation: PBKDF2 (≥100k iterations) or Argon2
- Never store or log the master password
- Keep decrypted vault in memory only
- CSP: no `unsafe-eval`, no inline scripts
- Use `crypto.getRandomValues()` for the password generator
- Clipboard auto-clear after copy
- Auto-lock vault on inactivity
- Sanitize all inputs; secure message passing between content script and background

## Backend (Node.js + Fastify + MongoDB)

MongoDB stores only:
- `users`: `_id`, `email`, `password_hash` (bcrypt), `created_at`
- `vault_meta`: `user_id`, `has_backup`, `last_backup_at`, `blob_path`

Routes: signup, login, JWT auth, SAS token generation for Azure upload.

## Build & Run (to be configured)

Commands will be added here once the project is scaffolded. Expected setup per component:
- Extension: `npm run build` (Vite/Rollup + Svelte)
- Backend: `npm run dev` (Fastify)
- Tests: `npm test` (unit tests for crypto module, integration tests for vault flow)
