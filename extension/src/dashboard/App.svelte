<script lang="ts">
  import { onMount } from 'svelte';
  import CredentialList from './components/CredentialList.svelte';
  import CredentialDetail from './components/CredentialDetail.svelte';
  import PasswordGenerator from './components/PasswordGenerator.svelte';
  import BackupPanel from './components/BackupPanel.svelte';
  import ImportExportPanel from './components/ImportExportPanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import EditModal from './components/EditModal.svelte';
  import type {
    VaultEntry,
    VaultStatusPayload,
    AddEntryPayload,
    DeleteEntryPayload,
    UpdateEntryPayload,
    UnlockPayload,
    InitVaultPayload,
  } from '../types/index.js';

  type NavView = 'list' | 'generator' | 'backup' | 'import-export' | 'settings';

  let isLocked = true;
  let entries: VaultEntry[] = [];
  let searchQuery = '';
  let selectedEntry: VaultEntry | null = null;
  let showEdit = false;
  let editEntry: VaultEntry | null = null;
  let currentView: NavView = 'list';
  let loading = true;
  let error = '';
  let biometricEnrolled = false;
  let credentialId: ArrayBuffer | null = null;
  let prfSalt: ArrayBuffer | null = null;
  let masterPasswordInput = '';
  let unlockError = '';
  let unlockLoading = false;
  let isCreatingVault = false;
  let createPasswordInput = '';
  let createConfirmInput = '';

  async function fetchStatus(): Promise<void> {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_STATUS', payload: {} }) as
        { status: VaultStatusPayload };
      isLocked = resp.status.isLocked;
      if (!isLocked) {
        await fetchEntries();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load status';
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

  async function handleUnlock(): Promise<void> {
    if (!masterPasswordInput.trim()) {
      unlockError = 'Please enter your master password';
      return;
    }
    unlockLoading = true;
    unlockError = '';
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'UNLOCK_VAULT',
        payload: { masterPassword: masterPasswordInput } satisfies UnlockPayload,
      }) as { success: boolean };

      if (resp.success) {
        masterPasswordInput = '';
        isLocked = false;
        await fetchEntries();
      } else {
        unlockError = 'Incorrect master password. Please try again.';
        masterPasswordInput = '';
      }
    } catch (e) {
      unlockError = e instanceof Error ? e.message : 'Failed to unlock';
    } finally {
      unlockLoading = false;
    }
  }

  async function handleInitVault(): Promise<void> {
    if (!createPasswordInput.trim()) {
      unlockError = 'Please enter a master password';
      return;
    }
    if (createPasswordInput.length < 8) {
      unlockError = 'Master password must be at least 8 characters';
      return;
    }
    if (createPasswordInput !== createConfirmInput) {
      unlockError = 'Passwords do not match';
      return;
    }
    unlockLoading = true;
    unlockError = '';
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'INIT_VAULT',
        payload: { masterPassword: createPasswordInput } satisfies InitVaultPayload,
      }) as { success: boolean };

      if (resp.success) {
        createPasswordInput = '';
        createConfirmInput = '';
        isLocked = false;
        isCreatingVault = false;
        await fetchEntries();
      } else {
        unlockError = 'Failed to create vault. Please try again.';
      }
    } catch (e) {
      unlockError = e instanceof Error ? e.message : 'Failed to create vault';
    } finally {
      unlockLoading = false;
    }
  }

  async function handleLock(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: 'LOCK_VAULT', payload: {} });
      isLocked = true;
      entries = [];
      selectedEntry = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to lock';
    }
  }

  async function handleDeleteEntry(event: CustomEvent<{ id: string }>): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_ENTRY',
        payload: { id: event.detail.id } satisfies DeleteEntryPayload,
      });
      entries = entries.filter(e => e.id !== event.detail.id);
      selectedEntry = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to delete entry';
    }
  }

  async function handleSaveEntry(
    event: CustomEvent<{ data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>; id?: string }>
  ): Promise<void> {
    try {
      if (event.detail.id) {
        // Update existing
        await chrome.runtime.sendMessage({
          type: 'UPDATE_ENTRY',
          payload: {
            id: event.detail.id,
            updates: event.detail.data,
          } satisfies UpdateEntryPayload,
        });
        entries = entries.map(e =>
          e.id === event.detail.id
            ? { ...e, ...event.detail.data, updatedAt: Date.now() }
            : e
        );
        if (selectedEntry?.id === event.detail.id) {
          selectedEntry = entries.find(e => e.id === event.detail.id) ?? null;
        }
      } else {
        // Add new
        const resp = await chrome.runtime.sendMessage({
          type: 'ADD_ENTRY',
          payload: { entry: event.detail.data } satisfies AddEntryPayload,
        }) as { entry: VaultEntry };
        entries = [...entries, resp.entry];
        selectedEntry = resp.entry;
      }
      showEdit = false;
      editEntry = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to save entry';
    }
  }

  function handleEditEntry(event: CustomEvent<VaultEntry>): void {
    editEntry = event.detail;
    showEdit = true;
  }

  function handleNewEntry(): void {
    editEntry = null;
    showEdit = true;
  }

  onMount(async () => {
    fetchStatus();
    // Load biometric status
    try {
      const bioResp = await chrome.runtime.sendMessage({ type: 'BIOMETRIC_STATUS', payload: {} });
      biometricEnrolled = bioResp.enrolled ?? false;
      if (biometricEnrolled) {
        credentialId = bioResp.credentialId ?? null;
        prfSalt = bioResp.prfSalt ?? null;
      }
    } catch { /* ignore */ }
  });
</script>

<div class="min-h-screen bg-gray-900 text-white flex flex-col">
  {#if loading}
    <div class="flex-1 flex items-center justify-center">
      <div class="text-gray-400">Loading...</div>
    </div>
  {:else if isLocked}
    <!-- Full-page unlock screen -->
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <span class="text-2xl font-bold">Z</span>
          </div>
          <h1 class="text-2xl font-bold text-white">ZeroVault</h1>
          <p class="text-gray-400 mt-1">Zero-knowledge password manager</p>
        </div>

        <div class="bg-gray-800 rounded-xl p-6 shadow-xl">
          {#if error}
            <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded p-3 mb-4">
              {error}
            </div>
          {/if}

          {#if isCreatingVault}
            <h2 class="text-lg font-semibold mb-4">Create New Vault</h2>
            {#if unlockError}
              <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded p-3 mb-4">
                {unlockError}
              </div>
            {/if}
            <div class="flex flex-col gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Master Password</label>
                <input
                  type="password"
                  bind:value={createPasswordInput}
                  placeholder="Choose a strong master password..."
                  class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                         placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                         focus:ring-indigo-500 transition-colors"
                  autocomplete="new-password"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-1">Confirm Password</label>
                <input
                  type="password"
                  bind:value={createConfirmInput}
                  placeholder="Confirm your master password..."
                  class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                         placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                         focus:ring-indigo-500 transition-colors"
                  autocomplete="new-password"
                />
              </div>
              <div class="text-xs text-yellow-500 bg-yellow-900/20 border border-yellow-800/30 rounded p-2">
                Warning: Your master password cannot be recovered. Store it safely.
              </div>
              <button
                on:click={handleInitVault}
                disabled={unlockLoading}
                class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white
                       font-medium py-2.5 rounded-lg transition-colors"
              >
                {unlockLoading ? 'Creating vault...' : 'Create Vault'}
              </button>
              <button
                on:click={() => { isCreatingVault = false; unlockError = ''; }}
                class="w-full text-gray-400 hover:text-white text-sm py-1 transition-colors"
              >
                Back to unlock
              </button>
            </div>
          {:else}
            <h2 class="text-lg font-semibold mb-4">Unlock Vault</h2>
            {#if unlockError}
              <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded p-3 mb-4">
                {unlockError}
              </div>
            {/if}
            <div class="flex flex-col gap-3">
              <div>
                <label class="block text-sm text-gray-400 mb-1">Master Password</label>
                <input
                  type="password"
                  bind:value={masterPasswordInput}
                  on:keydown={(e) => e.key === 'Enter' && handleUnlock()}
                  placeholder="Enter your master password..."
                  class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                         placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                         focus:ring-indigo-500 transition-colors"
                  autocomplete="current-password"
                />
              </div>
              <button
                on:click={handleUnlock}
                disabled={unlockLoading}
                class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white
                       font-medium py-2.5 rounded-lg transition-colors"
              >
                {unlockLoading ? 'Unlocking...' : 'Unlock Vault'}
              </button>
              <button
                on:click={() => { isCreatingVault = true; unlockError = ''; masterPasswordInput = ''; }}
                class="w-full text-gray-500 hover:text-gray-300 text-sm py-1 transition-colors"
              >
                First time? Create a new vault
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <!-- Main dashboard layout -->
    <div class="flex flex-col h-screen">
      <!-- Header -->
      <header class="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">Z</div>
          <span class="font-semibold text-white">ZeroVault</span>
        </div>
        <div class="flex-1 max-w-md">
          <SearchBar value={searchQuery} on:input={(e) => { searchQuery = e.detail; }} />
        </div>
        <div class="flex items-center gap-2 ml-auto">
          <button
            on:click={handleNewEntry}
            class="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Entry
          </button>
          <button
            on:click={handleLock}
            class="text-gray-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            title="Lock vault"
          >
            Lock
          </button>
        </div>
      </header>

      <div class="flex flex-1 min-h-0">
        <!-- Sidebar -->
        <nav class="w-48 bg-gray-800 border-r border-gray-700 flex flex-col py-4 flex-shrink-0">
          <button
            on:click={() => { currentView = 'list'; selectedEntry = null; }}
            class="text-left px-4 py-2.5 text-sm transition-colors
                   {currentView === 'list' ? 'text-white bg-indigo-600/20 border-r-2 border-indigo-500' : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
          >
            Credentials
          </button>
          <button
            on:click={() => { currentView = 'generator'; }}
            class="text-left px-4 py-2.5 text-sm transition-colors
                   {currentView === 'generator' ? 'text-white bg-indigo-600/20 border-r-2 border-indigo-500' : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
          >
            Generator
          </button>
          <button
            on:click={() => { currentView = 'backup'; }}
            class="text-left px-4 py-2.5 text-sm transition-colors
                   {currentView === 'backup' ? 'text-white bg-indigo-600/20 border-r-2 border-indigo-500' : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
          >
            Backup
          </button>
          <button
            on:click={() => { currentView = 'import-export'; }}
            class="text-left px-4 py-2.5 text-sm transition-colors
                   {currentView === 'import-export' ? 'text-white bg-indigo-600/20 border-r-2 border-indigo-500' : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
          >
            Import / Export
          </button>
          <button
            on:click={() => { currentView = 'settings'; }}
            class="text-left px-4 py-2.5 text-sm transition-colors
                   {currentView === 'settings' ? 'text-white bg-indigo-600/20 border-r-2 border-indigo-500' : 'text-gray-400 hover:text-white hover:bg-gray-700'}"
          >
            Settings
          </button>
          <div class="mt-auto px-4 py-2 text-xs text-gray-600">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </div>
        </nav>

        <!-- Main content -->
        <main class="flex-1 flex min-h-0 overflow-hidden">
          {#if error}
            <div class="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-red-900 border border-red-700 text-red-200 text-sm px-4 py-2 rounded-lg shadow-lg">
              {error}
              <button on:click={() => { error = ''; }} class="ml-2 text-red-400 hover:text-red-200">x</button>
            </div>
          {/if}

          {#if currentView === 'list'}
            <!-- Credentials view -->
            <div class="w-72 border-r border-gray-700 overflow-y-auto flex-shrink-0">
              <CredentialList
                {entries}
                {searchQuery}
                on:select={(e) => { selectedEntry = e.detail; }}
              />
            </div>
            <div class="flex-1 overflow-y-auto">
              {#if selectedEntry}
                <CredentialDetail
                  entry={selectedEntry}
                  {biometricEnrolled}
                  {credentialId}
                  {prfSalt}
                  on:edit={handleEditEntry}
                  on:delete={handleDeleteEntry}
                />
              {:else}
                <div class="flex items-center justify-center h-full text-gray-500">
                  <div class="text-center">
                    <div class="text-lg mb-2">Select a credential</div>
                    <div class="text-sm">Or add a new one with the button above</div>
                  </div>
                </div>
              {/if}
            </div>
          {:else if currentView === 'generator'}
            <div class="flex-1 overflow-y-auto p-6">
              <PasswordGenerator on:use={(e) => {
                // If editing, we can pass the password
                if (editEntry) editEntry = { ...editEntry, password: e.detail };
              }} />
            </div>
          {:else if currentView === 'backup'}
            <div class="flex-1 overflow-y-auto">
              <BackupPanel />
            </div>
          {:else if currentView === 'import-export'}
            <div class="flex-1 overflow-y-auto">
              <ImportExportPanel {entries} on:imported={fetchEntries} />
            </div>
          {:else if currentView === 'settings'}
            <div class="flex-1 overflow-y-auto p-6">
              <SettingsPanel />
            </div>
          {/if}
        </main>
      </div>
    </div>
  {/if}

  <!-- Edit Modal -->
  {#if showEdit}
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div class="w-full max-w-lg">
        <EditModal
          entry={editEntry}
          on:save={handleSaveEntry}
          on:cancel={() => { showEdit = false; editEntry = null; }}
        />
      </div>
    </div>
  {/if}
</div>
