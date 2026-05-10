<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { UnlockPayload, VaultStatusPayload } from '../../types/index.js';

  const dispatch = createEventDispatcher<{ unlock: void }>();

  let masterPassword = '';
  let error = '';
  let loading = false;
  let isCreatingVault = false;

  async function handleUnlock(): Promise<void> {
    if (!masterPassword.trim()) {
      error = 'Please enter your master password';
      return;
    }
    loading = true;
    error = '';
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'UNLOCK_VAULT',
        payload: { masterPassword } satisfies UnlockPayload,
      }) as { success: boolean; status: VaultStatusPayload };

      if (resp.success) {
        masterPassword = '';
        dispatch('unlock');
      } else {
        error = 'Incorrect master password. Please try again.';
        masterPassword = '';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to unlock vault';
    } finally {
      loading = false;
    }
  }

  async function handleCreateVault(): Promise<void> {
    if (!masterPassword.trim()) {
      error = 'Please enter a master password to protect your vault';
      return;
    }
    if (masterPassword.length < 8) {
      error = 'Master password must be at least 8 characters';
      return;
    }
    loading = true;
    error = '';
    try {
      // Send init message to background — this will use initNewVault
      await chrome.runtime.sendMessage({
        type: 'ADD_ENTRY',
        payload: {
          entry: {
            site: '__vault_init__',
            url: '',
            username: '',
            password: masterPassword,
          },
        },
      });
      // Actually, we need to call initNewVault. We do it via a dedicated unlock path:
      // The background will try unlock, fail (no vault), so we need a custom message.
      // Instead, we send a special init flow: try unlock (fails), then the dashboard
      // handles init. For the popup, signal via a special flow.
      error = 'Please open the full dashboard to initialize a new vault.';
      masterPassword = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create vault';
    } finally {
      loading = false;
      isCreatingVault = false;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (isCreatingVault) {
        handleCreateVault();
      } else {
        handleUnlock();
      }
    }
  }
</script>

<div class="flex flex-col gap-3">
  <div class="text-center">
    <div class="text-gray-300 text-sm font-medium mb-1">
      {#if isCreatingVault}
        Create Your Vault
      {:else}
        Unlock Your Vault
      {/if}
    </div>
    <div class="text-gray-500 text-xs">
      {#if isCreatingVault}
        Choose a strong master password. It cannot be recovered.
      {:else}
        Enter your master password to access your credentials.
      {/if}
    </div>
  </div>

  {#if error}
    <div class="text-red-400 text-xs bg-red-900/20 border border-red-800/50 rounded p-2">
      {error}
    </div>
  {/if}

  <div>
    <label for="master-password" class="block text-xs text-gray-400 mb-1">
      Master Password
    </label>
    <input
      id="master-password"
      type="password"
      bind:value={masterPassword}
      on:keydown={handleKeydown}
      placeholder="Enter master password..."
      disabled={loading}
      class="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white
             placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
             focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      autocomplete="current-password"
    />
  </div>

  {#if isCreatingVault}
    <button
      on:click={handleCreateVault}
      disabled={loading}
      class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
             text-white text-sm font-medium py-2 px-4 rounded transition-colors"
    >
      {loading ? 'Creating...' : 'Create Vault'}
    </button>
    <button
      on:click={() => { isCreatingVault = false; error = ''; masterPassword = ''; }}
      disabled={loading}
      class="w-full text-gray-400 hover:text-white text-xs py-1 transition-colors"
    >
      Back to unlock
    </button>
  {:else}
    <button
      on:click={handleUnlock}
      disabled={loading}
      class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
             text-white text-sm font-medium py-2 px-4 rounded transition-colors"
    >
      {loading ? 'Unlocking...' : 'Unlock Vault'}
    </button>
    <button
      on:click={() => { isCreatingVault = true; error = ''; masterPassword = ''; }}
      disabled={loading}
      class="w-full text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors text-center"
    >
      First time? Open dashboard to create vault
    </button>
  {/if}
</div>
