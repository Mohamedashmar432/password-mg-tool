<script lang="ts">
  import type { VaultEntry } from '../../types/index.js';

  export let entries: VaultEntry[]          = [];
  export let currentHostname: string | null = null;
  export let tabId: number | null           = null;

  let fillStatus: Record<string, 'done' | 'error'> = {};
  let copiedId: string | null = null;

  function matchesDomain(entry: VaultEntry, hostname: string): boolean {
    try {
      const entryHost = new URL(entry.url).hostname.toLowerCase();
      const h = hostname.toLowerCase();
      return entryHost === h || entryHost.endsWith(`.${h}`) || h.endsWith(`.${entryHost}`);
    } catch {
      return entry.site.toLowerCase().includes(hostname.toLowerCase());
    }
  }

  $: matched = currentHostname
    ? entries.filter(e => matchesDomain(e, currentHostname!))
    : [];

  async function fill(entry: VaultEntry): Promise<void> {
    if (tabId === null) return;
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'POPUP_AUTOFILL',
        payload: { username: entry.username, password: entry.password },
      });
      fillStatus = { ...fillStatus, [entry.id]: 'done' };
      setTimeout(() => window.close(), 400);
    } catch {
      fillStatus = { ...fillStatus, [entry.id]: 'error' };
    }
  }

  async function copyPassword(entry: VaultEntry): Promise<void> {
    await navigator.clipboard.writeText(entry.password);
    copiedId = entry.id;
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30_000);
    setTimeout(() => { copiedId = null; }, 1800);
  }

  function initial(site: string): string {
    return (site.charAt(0) ?? '?').toUpperCase();
  }
</script>

<!-- Domain badge -->
{#if currentHostname}
  <div class="flex items-center gap-1.5 mb-2">
    <svg class="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657
           0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
    </svg>
    <span class="text-xs text-gray-400 truncate">{currentHostname}</span>
  </div>
{/if}

<!-- Matched credentials -->
{#if matched.length === 0}
  <div class="text-center py-4">
    <div class="text-gray-500 text-sm">No saved credentials for this site.</div>
    <div class="text-gray-600 text-xs mt-1">Use the dashboard to add an entry.</div>
  </div>
{:else}
  <div class="flex flex-col gap-1.5">
    {#each matched as entry (entry.id)}
      {@const status = fillStatus[entry.id]}
      <div class="flex items-center gap-2 px-2 py-2 rounded-lg
                   bg-indigo-600/10 border border-indigo-500/20
                   hover:border-indigo-500/40 transition-colors">
        <div class="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center
                    text-xs font-bold text-white flex-shrink-0">
          {initial(entry.site)}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-medium text-white truncate">{entry.site}</div>
          <div class="text-xs text-gray-400 truncate">{entry.username}</div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button
            on:click={() => copyPassword(entry)}
            title="Copy password"
            class="text-xs px-1.5 py-1 rounded transition-colors {
              copiedId === entry.id
                ? 'bg-green-700/60 text-green-300'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white'
            }"
          >
            {copiedId === entry.id ? '✓' : '⎘'}
          </button>
          <button
            on:click={() => fill(entry)}
            title="Fill into the page"
            class="text-xs px-2 py-1 rounded font-medium transition-colors {
              status === 'done'  ? 'bg-green-700 text-green-100' :
              status === 'error' ? 'bg-red-800/60 text-red-300'  :
              'bg-indigo-600 hover:bg-indigo-500 text-white'
            }"
          >
            {status === 'done' ? '✓ Filled' : status === 'error' ? 'No form' : 'Use →'}
          </button>
        </div>
      </div>
    {/each}
  </div>
{/if}
