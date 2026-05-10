<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../../api/client.js';
  import type { VaultMetadataResponse } from '../../types/index.js';

  // ── State machine ─────────────────────────────────────────────────────────
  type PanelMode = 'loading' | 'auth' | 'backup';
  type AuthTab   = 'register' | 'login';

  let mode: PanelMode = 'loading';
  let authTab: AuthTab = 'register';

  // Auth form fields
  let email           = '';
  let password        = '';
  let confirmPassword = '';
  let authError       = '';
  let authLoading     = false;

  // Authenticated context
  let currentEmail = '';
  let vaultMeta: VaultMetadataResponse | null = null;

  // Backup / restore operation state
  let backupLoading = false;
  let backupError   = '';
  let backupSuccess = '';

  let showRestoreModal = false;
  let restorePassword  = '';
  let restoreLoading   = false;
  let restoreError     = '';

  // ── Session helpers (chrome.storage.session) ──────────────────────────────
  async function getSession(): Promise<{ jwt: string; email: string } | null> {
    return new Promise(resolve => {
      chrome.storage.session.get(['zv_jwt', 'zv_email'], items => {
        const jwt   = items['zv_jwt']   as string | undefined;
        const saved = items['zv_email'] as string | undefined;
        resolve(jwt && saved ? { jwt, email: saved } : null);
      });
    });
  }

  async function saveSession(jwt: string, userEmail: string): Promise<void> {
    return new Promise(resolve =>
      chrome.storage.session.set({ zv_jwt: jwt, zv_email: userEmail }, resolve)
    );
  }

  async function clearSession(): Promise<void> {
    return new Promise(resolve =>
      chrome.storage.session.remove(['zv_jwt', 'zv_email'], resolve)
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(async () => {
    const session = await getSession();
    if (!session) { mode = 'auth'; return; }

    // Validate the stored token by hitting /vault/metadata
    try {
      vaultMeta    = await api.vaultMetadata(session.jwt);
      currentEmail = session.email;
      mode         = 'backup';
    } catch {
      // Token expired or server unreachable — back to auth
      await clearSession();
      mode = 'auth';
    }
  });

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function handleAuth(): Promise<void> {
    authError = '';
    if (!email.trim())  { authError = 'Email is required';    return; }
    if (!password)      { authError = 'Password is required'; return; }
    if (authTab === 'register') {
      if (password.length < 8)           { authError = 'Password must be at least 8 characters'; return; }
      if (password !== confirmPassword)  { authError = 'Passwords do not match';                 return; }
    }

    authLoading = true;
    try {
      const resp = authTab === 'register'
        ? await api.signup({ email: email.trim(), password })
        : await api.login({ email: email.trim(), password });

      await saveSession(resp.token, email.trim());
      currentEmail = email.trim();
      vaultMeta    = await api.vaultMetadata(resp.token);
      mode         = 'backup';
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      if (msg.includes('409') || msg.includes('already registered')) {
        authError = 'Email already registered — please sign in instead.';
      } else if (msg.includes('401') || msg.includes('Invalid credentials')) {
        authError = 'Incorrect email or password.';
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        authError = 'Cannot reach the server. Make sure the backend is running.';
      } else {
        authError = msg;
      }
    } finally {
      authLoading = false;
    }
  }

  function handleAuthKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') handleAuth();
  }

  async function handleLogout(): Promise<void> {
    await clearSession();
    email = ''; password = ''; confirmPassword = '';
    currentEmail = ''; vaultMeta = null;
    backupError  = ''; backupSuccess = '';
    mode = 'auth';
  }

  function switchTab(tab: AuthTab): void {
    authTab = tab; authError = ''; password = ''; confirmPassword = '';
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  async function handleBackup(): Promise<void> {
    backupLoading = true; backupError = ''; backupSuccess = '';
    try {
      const session = await getSession();
      if (!session) { mode = 'auth'; return; }

      const { blobUrl } = await api.uploadToken(session.jwt);

      const resp = await chrome.runtime.sendMessage({ type: 'GET_VAULT_BLOB' as never, payload: {} }) as
        { blob?: string } | null;
      if (!resp?.blob) throw new Error('Failed to read vault data. Make sure the vault is unlocked.');

      await api.uploadToAzure(blobUrl, resp.blob);
      await api.confirmBackup(session.jwt, blobUrl);

      backupSuccess = 'Backup completed successfully!';
      vaultMeta     = await api.vaultMetadata(session.jwt);
    } catch (e) {
      backupError = e instanceof Error ? e.message : 'Backup failed';
    } finally {
      backupLoading = false;
    }
  }

  async function handleRestore(): Promise<void> {
    if (!restorePassword.trim()) { restoreError = 'Enter your master password'; return; }
    restoreLoading = true; restoreError = '';
    try {
      const session = await getSession();
      if (!session) { mode = 'auth'; return; }

      const { blobUrl } = await api.downloadToken(session.jwt);
      const blobData    = await api.downloadFromAzure(blobUrl);

      const result = await chrome.runtime.sendMessage({
        type: 'RESTORE_VAULT' as never,
        payload: { masterPassword: restorePassword, blobData },
      }) as { success: boolean; error?: string } | null;

      if (result?.success) {
        showRestoreModal = false; restorePassword = '';
        backupSuccess = 'Vault restored! Please re-unlock your vault with your master password.';
      } else {
        restoreError = result?.error ?? 'Restore failed. Check your master password.';
      }
    } catch (e) {
      restoreError = e instanceof Error ? e.message : 'Restore failed';
    } finally {
      restoreLoading = false;
    }
  }

  function formatDate(d: string | null): string {
    if (!d) return 'Never';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  }
</script>

<!-- ── Loading ────────────────────────────────────────────────────────────── -->
{#if mode === 'loading'}
  <div class="flex items-center justify-center h-48">
    <div class="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
  </div>

<!-- ── Auth (Register / Sign In) ──────────────────────────────────────────── -->
{:else if mode === 'auth'}
  <div class="p-6 max-w-md mx-auto">
    <h2 class="text-xl font-semibold text-white mb-1">Cloud Backup</h2>
    <p class="text-sm text-gray-400 mb-6">
      Create an account to back up your encrypted vault to the cloud.
      Your master password never leaves this device.
    </p>

    <!-- Tab switcher -->
    <div class="flex bg-gray-700/60 rounded-lg p-0.5 mb-6">
      <button
        on:click={() => switchTab('register')}
        class="flex-1 py-2 text-sm font-medium rounded-md transition-colors
               {authTab === 'register'
                 ? 'bg-gray-900 text-white shadow-sm'
                 : 'text-gray-400 hover:text-white'}"
      >
        Register
      </button>
      <button
        on:click={() => switchTab('login')}
        class="flex-1 py-2 text-sm font-medium rounded-md transition-colors
               {authTab === 'login'
                 ? 'bg-gray-900 text-white shadow-sm'
                 : 'text-gray-400 hover:text-white'}"
      >
        Sign In
      </button>
    </div>

    <!-- Error banner -->
    {#if authError}
      <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
        {authError}
      </div>
    {/if}

    <!-- Fields -->
    <div class="flex flex-col gap-4">
      <div>
        <label for="auth-email" class="block text-sm text-gray-400 mb-1">Email</label>
        <input
          id="auth-email"
          type="email"
          bind:value={email}
          on:keydown={handleAuthKey}
          placeholder="you@example.com"
          autocomplete="email"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                 focus:ring-indigo-500 transition-colors text-sm"
        />
      </div>

      <div>
        <label for="auth-pw" class="block text-sm text-gray-400 mb-1">Password</label>
        <input
          id="auth-pw"
          type="password"
          bind:value={password}
          on:keydown={handleAuthKey}
          placeholder={authTab === 'register' ? 'At least 8 characters' : 'Your password'}
          autocomplete={authTab === 'register' ? 'new-password' : 'current-password'}
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                 focus:ring-indigo-500 transition-colors text-sm"
        />
      </div>

      {#if authTab === 'register'}
        <div>
          <label for="auth-confirm" class="block text-sm text-gray-400 mb-1">Confirm Password</label>
          <input
            id="auth-confirm"
            type="password"
            bind:value={confirmPassword}
            on:keydown={handleAuthKey}
            placeholder="Repeat your password"
            autocomplete="new-password"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                   placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                   focus:ring-indigo-500 transition-colors text-sm"
          />
        </div>
      {/if}

      <button
        on:click={handleAuth}
        disabled={authLoading}
        class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
               text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        {#if authLoading}
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {authTab === 'register' ? 'Creating account…' : 'Signing in…'}
        {:else}
          {authTab === 'register' ? 'Create Account' : 'Sign In'}
        {/if}
      </button>

      <p class="text-xs text-gray-600 text-center">
        {#if authTab === 'register'}
          Already have an account?
          <button on:click={() => switchTab('login')} class="text-indigo-400 hover:text-indigo-300 underline-offset-2">
            Sign in
          </button>
        {:else}
          Don't have an account?
          <button on:click={() => switchTab('register')} class="text-indigo-400 hover:text-indigo-300 underline-offset-2">
            Register
          </button>
        {/if}
      </p>
    </div>
  </div>

<!-- ── Backup dashboard (authenticated) ───────────────────────────────────── -->
{:else if mode === 'backup'}
  <div class="p-6 max-w-lg">

    <!-- Header: title + account + logout -->
    <div class="flex items-start justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-white">Cloud Backup</h2>
        <div class="flex items-center gap-1.5 mt-0.5">
          <span class="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
          <span class="text-xs text-gray-400">{currentEmail}</span>
        </div>
      </div>
      <button
        on:click={handleLogout}
        class="text-xs text-gray-400 hover:text-white px-3 py-1.5 bg-gray-700/80
               hover:bg-gray-600 rounded-lg transition-colors flex-shrink-0"
      >
        Sign Out
      </button>
    </div>

    <!-- Flash messages -->
    {#if backupError}
      <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
        {backupError}
      </div>
    {/if}
    {#if backupSuccess}
      <div class="text-green-400 text-sm bg-green-900/20 border border-green-800/50 rounded-lg p-3 mb-4">
        {backupSuccess}
      </div>
    {/if}

    <!-- Status card -->
    <div class="bg-gray-800 rounded-xl p-5 mb-5">
      <p class="text-sm font-medium text-gray-300 mb-3">Backup Status</p>
      <div class="flex flex-col gap-2 mb-4">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Cloud Backup</span>
          <span class="{vaultMeta?.has_backup ? 'text-green-400' : 'text-yellow-400'}">
            {vaultMeta?.has_backup ? 'Available' : 'No backup yet'}
          </span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Last Backup</span>
          <span class="text-gray-300">{formatDate(vaultMeta?.last_backup_at ?? null)}</span>
        </div>
      </div>
      <div class="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3">
        <p class="text-xs text-indigo-300">
          Your vault is encrypted with AES-256-GCM before upload.
          The server never sees your passwords or master key — zero-knowledge by design.
        </p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-col gap-3">
      <button
        on:click={handleBackup}
        disabled={backupLoading}
        class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
               disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg
               transition-colors flex items-center justify-center gap-2"
      >
        {#if backupLoading}
          <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Backing up…
        {:else}
          Backup Now
        {/if}
      </button>
      <button
        on:click={() => { showRestoreModal = true; restoreError = ''; }}
        disabled={backupLoading || !vaultMeta?.has_backup}
        class="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40
               disabled:cursor-not-allowed text-gray-200 font-medium py-2.5
               rounded-lg transition-colors"
      >
        Restore from Backup
      </button>
    </div>
  </div>
{/if}

<!-- ── Restore modal ───────────────────────────────────────────────────────── -->
{#if showRestoreModal}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div class="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
      <h3 class="text-lg font-semibold text-white mb-2">Restore from Backup</h3>
      <p class="text-sm text-gray-400 mb-4">
        Enter your master password to decrypt and restore your vault.
        This will replace your current vault data.
      </p>

      {#if restoreError}
        <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
          {restoreError}
        </div>
      {/if}

      <div class="mb-4">
        <label for="restore-pw" class="block text-sm text-gray-400 mb-1">Master Password</label>
        <input
          id="restore-pw"
          type="password"
          bind:value={restorePassword}
          on:keydown={(e) => e.key === 'Enter' && handleRestore()}
          placeholder="Enter your master password…"
          autocomplete="current-password"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                 focus:ring-indigo-500 transition-colors text-sm"
        />
      </div>

      <div class="flex gap-3">
        <button
          on:click={() => { showRestoreModal = false; restorePassword = ''; restoreError = ''; }}
          disabled={restoreLoading}
          class="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg
                 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={handleRestore}
          disabled={restoreLoading}
          class="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50
                 text-white rounded-lg text-sm font-medium transition-colors
                 flex items-center justify-center gap-2"
        >
          {#if restoreLoading}
            <span class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {/if}
          {restoreLoading ? 'Restoring…' : 'Restore Vault'}
        </button>
      </div>
    </div>
  </div>
{/if}
