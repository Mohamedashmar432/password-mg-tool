<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { VaultEntry } from '../../types/index.js';
  import { authenticateWithBiometric } from '../../crypto/webauthn.js';

  export let entry: VaultEntry;
  export let biometricEnrolled = false;
  export let credentialId: ArrayBuffer | null = null;
  export let prfSalt: ArrayBuffer | null = null;

  const dispatch = createEventDispatcher<{ edit: VaultEntry; delete: { id: string } }>();

  let showPassword = false;
  let showBiometricModal = false;
  let pendingAction: (() => void) | null = null;
  let biometricLoading = false;
  let biometricError = '';
  let copyUsernameSuccess = false;
  let copyPasswordSuccess = false;
  let copyTimers: ReturnType<typeof setTimeout>[] = [];

  const CLIPBOARD_CLEAR_MS = 30_000;

  async function copyToClipboard(text: string, field: 'username' | 'password'): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);

      if (field === 'username') {
        copyUsernameSuccess = true;
        const t = setTimeout(() => { copyUsernameSuccess = false; }, 2000);
        copyTimers.push(t);
      } else {
        copyPasswordSuccess = true;
        // Auto-clear clipboard after 30 seconds
        const clearTimer = setTimeout(async () => {
          try {
            // Only clear if clipboard still has the same value
            const current = await navigator.clipboard.readText().catch(() => '');
            if (current === text) {
              await navigator.clipboard.writeText('');
            }
          } catch {
            // Ignore clipboard clear errors
          }
          copyPasswordSuccess = false;
        }, CLIPBOARD_CLEAR_MS);
        copyTimers.push(clearTimer);
      }
    } catch {
      // Clipboard write failed — silently ignore
    }
  }

  async function requiresAuth(action: 'view' | 'copy'): Promise<boolean> {
    if (!biometricEnrolled || !credentialId || !prfSalt) return false;
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'SENSITIVE_ACTION_AUTH',
        payload: { action },
      });
      return resp.required === true;
    } catch {
      return false;
    }
  }

  async function handleTogglePassword(): Promise<void> {
    if (showPassword) {
      showPassword = false;
      return;
    }
    const needed = await requiresAuth('view');
    if (needed) {
      pendingAction = () => { showPassword = true; };
      showBiometricModal = true;
      return;
    }
    showPassword = true;
  }

  async function handleCopyPassword(): Promise<void> {
    const needed = await requiresAuth('copy');
    if (needed) {
      pendingAction = () => copyToClipboard(entry.password, 'password');
      showBiometricModal = true;
      return;
    }
    await copyToClipboard(entry.password, 'password');
  }

  async function handleBiometricSuccess(): Promise<void> {
    if (!credentialId || !prfSalt) return;
    biometricLoading = true;
    biometricError = '';
    try {
      const { prfOutput } = await authenticateWithBiometric(credentialId, prfSalt);
      const resp = await chrome.runtime.sendMessage({
        type: 'BIOMETRIC_UNLOCK',
        payload: { prfOutput },
      });
      if (!resp?.success) {
        biometricError = 'Verification failed — try unlocking with master password first';
        return;
      }
      showBiometricModal = false;
      pendingAction?.();
      pendingAction = null;
    } catch (e) {
      biometricError = e instanceof Error ? e.message : 'Verification failed';
    } finally {
      biometricLoading = false;
    }
  }

  function handleDelete(): void {
    if (window.confirm(`Delete credentials for "${entry.site}"? This cannot be undone.`)) {
      dispatch('delete', { id: entry.id });
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  $: maskedPassword = entry.password ? '•'.repeat(Math.min(entry.password.length, 20)) : '';
</script>

<div class="p-6 max-w-2xl">
  <!-- Site header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <h2 class="text-xl font-semibold text-white">{entry.site}</h2>
      {#if entry.url}
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          class="text-indigo-400 hover:text-indigo-300 text-sm mt-0.5 block transition-colors"
        >
          {entry.url}
        </a>
      {/if}
    </div>
    <div class="flex gap-2">
      <button
        on:click={() => dispatch('edit', entry)}
        class="text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors"
      >
        Edit
      </button>
      <button
        on:click={handleDelete}
        class="text-sm px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 rounded-lg transition-colors"
      >
        Delete
      </button>
    </div>
  </div>

  <!-- Fields -->
  <div class="flex flex-col gap-4">
    <!-- Username -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Username</div>
      <div class="flex items-center justify-between gap-3">
        <div class="text-white font-mono text-sm break-all">{entry.username}</div>
        <button
          on:click={() => copyToClipboard(entry.username, 'username')}
          class="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors
                 {copyUsernameSuccess ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}"
        >
          {copyUsernameSuccess ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>

    <!-- Password -->
    <div class="bg-gray-800 rounded-xl p-4">
      <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Password</div>
      <div class="flex items-center justify-between gap-3">
        <div class="text-white font-mono text-sm break-all">
          {showPassword ? entry.password : maskedPassword}
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <button
            on:click={handleTogglePassword}
            class="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            on:click={handleCopyPassword}
            class="text-xs px-3 py-1.5 rounded-lg transition-colors
                   {copyPasswordSuccess ? 'bg-green-700 text-green-200' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}"
          >
            {copyPasswordSuccess ? 'Copied! (30s)' : 'Copy'}
          </button>
        </div>
      </div>
    </div>

    <!-- Notes -->
    {#if entry.notes}
      <div class="bg-gray-800 rounded-xl p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</div>
        <div class="text-gray-300 text-sm whitespace-pre-wrap">{entry.notes}</div>
      </div>
    {/if}

    <!-- Metadata -->
    <div class="flex gap-4 text-xs text-gray-600">
      <div>Created: {formatDate(entry.createdAt)}</div>
      <div>Updated: {formatDate(entry.updatedAt)}</div>
    </div>
  </div>

  {#if showBiometricModal && credentialId && prfSalt}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
        <div class="flex flex-col items-center gap-6">
          <div class="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center">
            <svg class="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div class="text-center">
            <h2 class="text-xl font-semibold text-white">Verify Identity</h2>
            <p class="mt-2 text-sm text-gray-400">Use Windows Hello to view this password</p>
          </div>
          {#if biometricError}
            <p class="text-sm text-red-400 text-center">{biometricError}</p>
          {/if}
          <div class="flex flex-col gap-3 w-full">
            <button
              on:click={handleBiometricSuccess}
              disabled={biometricLoading}
              class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-colors"
            >
              {biometricLoading ? 'Waiting for Windows Security...' : 'Verify using Windows Security'}
            </button>
            <button
              on:click={() => { showBiometricModal = false; pendingAction = null; }}
              disabled={biometricLoading}
              class="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
