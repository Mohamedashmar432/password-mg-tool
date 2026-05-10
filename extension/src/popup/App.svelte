<script lang="ts">
  import { onMount } from 'svelte';
  import UnlockForm from './components/UnlockForm.svelte';
  import QuickList from './components/QuickList.svelte';
  import Generator from './components/Generator.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import BiometricUnlockButton from './components/BiometricUnlockButton.svelte';
  import type { VaultEntry, VaultStatusPayload } from '../types/index.js';
  import { arrToBuf } from '../utils/buffer.js';

  let isLocked = true;
  let entries: VaultEntry[] = [];
  let loading = true;
  let error = '';
  let showGenerator = false;
  let showMasterPassword = false;  // collapsed by default when biometric enrolled

  let activeTabId: number | null = null;
  let activeHostname: string | null = null;

  let biometricEnrolled = false;
  let credentialId: ArrayBuffer | null = null;
  let prfSalt: ArrayBuffer | null = null;

  // Entries matching the current page's domain
  $: domainEntries = activeHostname
    ? entries.filter(e => {
        try {
          const h = new URL(e.url).hostname.toLowerCase();
          const ah = activeHostname!.toLowerCase();
          return h === ah || h.endsWith(`.${ah}`) || ah.endsWith(`.${h}`);
        } catch {
          return e.site.toLowerCase().includes(activeHostname!.toLowerCase());
        }
      })
    : [];

  async function fetchStatus(): Promise<void> {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS', payload: {} }) as
        { status: VaultStatusPayload };
      isLocked = resp.status.isLocked;
      if (!isLocked) await fetchEntries();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to get status';
    } finally {
      loading = false;
    }
  }

  async function fetchEntries(): Promise<void> {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_ENTRIES', payload: {} }) as
        { entries: VaultEntry[] };
      entries = resp.entries ?? [];
    } catch {
      entries = [];
    }
  }

  async function getActiveTab(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) activeTabId = tab.id;
      if (tab?.url) {
        try { activeHostname = new URL(tab.url).hostname; } catch { /* chrome:// etc */ }
      }
    } catch { /* permission not granted */ }
  }

  async function handleLock(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: 'LOCK_VAULT', payload: {} });
      isLocked = true;
      entries = [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to lock vault';
    }
  }

  // Called after master password unlock
  function handleUnlock(): void {
    isLocked = false;
    fetchEntries().then(() => {
      // No auto-fill on password unlock — user already knows what they're doing
    });
  }

  // Called after successful Windows Hello unlock
  async function handleBiometricUnlock(): Promise<void> {
    isLocked = false;
    await fetchEntries();
    // Auto-fill if exactly one credential matches the current page
    if (activeTabId && activeHostname && domainEntries.length === 1) {
      await fillEntry(domainEntries[0]);
    }
  }

  // Send a credential to the active tab's content script for autofill
  async function fillEntry(entry: VaultEntry): Promise<void> {
    if (!activeTabId) return;
    try {
      await chrome.tabs.sendMessage(activeTabId, {
        type: 'POPUP_AUTOFILL',
        payload: { username: entry.username, password: entry.password },
      });
      window.close();
    } catch {
      // Content script not present on this page (e.g. chrome:// URL)
    }
  }

  function openDashboard(): void {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') }).catch(() => {});
  }

  onMount(async () => {
    await Promise.all([fetchStatus(), getActiveTab()]);
    try {
      const bioResp = await chrome.runtime.sendMessage({ type: 'BIOMETRIC_STATUS', payload: {} });
      biometricEnrolled = bioResp.enrolled ?? false;
      if (biometricEnrolled) {
        credentialId = bioResp.credentialId ? arrToBuf(bioResp.credentialId) : null;
        prfSalt = bioResp.prfSalt ? arrToBuf(bioResp.prfSalt) : null;
      }
    } catch { /* ignore */ }
  });
</script>

<div class="w-80 bg-gray-900 text-white flex flex-col" style="min-height:300px; max-height:560px; overflow:hidden;">
  <!-- Header -->
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center text-xs font-bold">Z</div>
      <span class="font-semibold text-sm">ZeroVault</span>
    </div>
    {#if !isLocked}
      <button
        on:click={handleLock}
        class="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-700 transition-colors"
        title="Lock vault"
      >
        Lock
      </button>
    {/if}
  </div>

  <!-- Status bar -->
  <div class="px-4 py-1.5 border-b border-gray-700 flex-shrink-0">
    <StatusBar {isLocked} entryCount={entries.length} />
  </div>

  <!-- Main content -->
  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center py-8">
        <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

    {:else if error}
      <div class="px-4 py-3 text-red-400 text-xs bg-red-900/20 rounded m-3">{error}</div>

    {:else if isLocked}
      <!-- ── LOCKED STATE ── -->
      <div class="px-4 py-4 flex flex-col gap-3">

        {#if biometricEnrolled && credentialId && prfSalt}
          <!-- Context hint -->
          {#if activeHostname}
            <p class="text-center text-xs text-gray-500">
              Fill credentials for
              <span class="text-indigo-400 font-medium">{activeHostname}</span>
            </p>
          {/if}

          <!-- PRIMARY: Windows Hello -->
          <BiometricUnlockButton
            {credentialId}
            {prfSalt}
            on:unlocked={handleBiometricUnlock}
            on:error={() => {}}
          />

          <!-- SECONDARY: master password (collapsed) -->
          {#if showMasterPassword}
            <div class="border-t border-gray-700 pt-3">
              <UnlockForm on:unlock={handleUnlock} />
            </div>
          {:else}
            <button
              on:click={() => { showMasterPassword = true; }}
              class="text-center text-xs text-gray-600 hover:text-gray-400 py-1 transition-colors"
            >
              Use master password instead
            </button>
          {/if}

        {:else}
          <!-- No biometric — show master password form directly -->
          <UnlockForm on:unlock={handleUnlock} />
        {/if}

      </div>

    {:else}
      <!-- ── UNLOCKED STATE ── -->

      <!-- Domain match fill buttons (shown when current page has credentials) -->
      {#if domainEntries.length > 0 && activeTabId}
        <div class="px-3 pt-3 pb-2">
          <p class="text-xs text-indigo-400 font-medium mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
            Credentials for {activeHostname}
          </p>
          {#each domainEntries as entry (entry.id)}
            <button
              on:click={() => fillEntry(entry)}
              class="w-full flex items-center gap-3 bg-indigo-600/20 hover:bg-indigo-600/30
                     border border-indigo-700/50 rounded-lg px-3 py-2.5 mb-1.5 text-left transition-colors"
            >
              <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center
                          text-xs font-bold text-white flex-shrink-0">
                {entry.username.charAt(0).toUpperCase() || '?'}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-white font-medium truncate">{entry.username}</p>
                <p class="text-xs text-indigo-300 truncate">{entry.site}</p>
              </div>
              <span class="text-xs text-indigo-400 font-medium flex-shrink-0">Fill ↵</span>
            </button>
          {/each}
        </div>
        <div class="border-t border-gray-800 mx-3"></div>
      {/if}

      <!-- All credentials list -->
      <div class="px-3 py-3">
        <QuickList {entries} currentHostname={activeHostname} tabId={activeTabId} />
      </div>

      <!-- Generator toggle -->
      <div class="border-t border-gray-700 mx-3"></div>
      <div class="px-3 py-2">
        <button
          on:click={() => { showGenerator = !showGenerator; }}
          class="w-full flex items-center justify-between text-xs text-gray-400
                 hover:text-white py-1 transition-colors"
        >
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
            Password Generator
          </span>
          <span class="text-gray-600">{showGenerator ? '▲' : '▼'}</span>
        </button>
        {#if showGenerator}
          <div class="mt-2">
            <Generator />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div class="px-4 py-2.5 border-t border-gray-700 flex-shrink-0">
    <button
      on:click={openDashboard}
      class="w-full text-center text-indigo-400 hover:text-indigo-300 text-xs
             py-1 hover:bg-gray-800 rounded transition-colors"
    >
      Open Full Dashboard →
    </button>
  </div>
</div>
