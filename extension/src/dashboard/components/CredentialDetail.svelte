<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { VaultEntry } from '../../types/index.js';

  export let entry: VaultEntry;

  const dispatch = createEventDispatcher<{ edit: VaultEntry; delete: { id: string } }>();

  let showPassword = false;
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
            on:click={() => { showPassword = !showPassword; }}
            class="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
          <button
            on:click={() => copyToClipboard(entry.password, 'password')}
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
</div>
