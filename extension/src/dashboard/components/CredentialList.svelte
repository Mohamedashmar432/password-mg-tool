<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { VaultEntry } from '../../types/index.js';

  export let entries: VaultEntry[] = [];
  export let searchQuery = '';

  const dispatch = createEventDispatcher<{ select: VaultEntry }>();

  $: filtered = entries.filter(entry => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.site.toLowerCase().includes(q) ||
      entry.username.toLowerCase().includes(q) ||
      entry.url.toLowerCase().includes(q)
    );
  });

  function getDomainInitial(site: string): string {
    return (site.charAt(0) ?? '?').toUpperCase();
  }

  function getDomainColor(site: string): string {
    const colors = [
      'bg-indigo-600', 'bg-purple-600', 'bg-blue-600', 'bg-teal-600',
      'bg-green-600', 'bg-orange-600', 'bg-red-600', 'bg-pink-600',
    ];
    let hash = 0;
    for (let i = 0; i < site.length; i++) {
      hash = (hash * 31 + site.charCodeAt(i)) >>> 0;
    }
    return colors[hash % colors.length] ?? 'bg-indigo-600';
  }
</script>

<div class="flex flex-col h-full">
  {#if filtered.length === 0}
    <div class="flex-1 flex items-center justify-center text-gray-500 p-4">
      <div class="text-center">
        {#if searchQuery}
          <div class="text-sm">No results for "{searchQuery}"</div>
        {:else}
          <div class="text-sm">No credentials yet</div>
          <div class="text-xs mt-1">Click "+ Add Entry" to get started</div>
        {/if}
      </div>
    </div>
  {:else}
    <div class="py-2">
      {#each filtered as entry (entry.id)}
        <button
          on:click={() => dispatch('select', entry)}
          class="w-full text-left px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-700/50
                 flex items-center gap-3 group"
        >
          <!-- Site icon -->
          <div class="w-9 h-9 {getDomainColor(entry.site)} rounded-lg flex items-center justify-center
                      text-sm font-bold text-white flex-shrink-0">
            {getDomainInitial(entry.site)}
          </div>

          <!-- Entry info -->
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-white truncate">{entry.site}</div>
            <div class="text-xs text-gray-400 truncate">{entry.username}</div>
          </div>

          <!-- Chevron -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      {/each}
    </div>
  {/if}
</div>
