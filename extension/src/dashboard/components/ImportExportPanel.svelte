<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { parseFile, buildPreview, toVaultShape } from '../../utils/importer.js';
  import { entriesToCsv, entriesToJson } from '../../utils/csv.js';
  import type { ImportPreview } from '../../utils/importer.js';
  import type { VaultEntry, BulkAddEntriesPayload, BulkAddEntriesResult } from '../../types/index.js';

  const dispatch = createEventDispatcher<{ imported: void }>();

  export let entries: VaultEntry[] = [];

  // ── State ────────────────────────────────────────────────────────────────

  type Mode = 'idle' | 'export-confirm' | 'importing' | 'import-preview' | 'done';

  let mode: Mode = 'idle';
  let exportFormat: 'csv' | 'json' = 'csv';
  let masterPasswordInput = '';
  let passwordError = '';
  let verifying = false;

  // Import state
  let fileInput: HTMLInputElement;
  let importError = '';
  let preview: ImportPreview | null = null;
  let parsedEntries: ReturnType<typeof parseFile>['entries'] = [];
  let skipDuplicates = true;
  let importResult: BulkAddEntriesResult | null = null;
  let importLoading = false;

  // ── Export ───────────────────────────────────────────────────────────────

  function startExport(fmt: 'csv' | 'json') {
    exportFormat = fmt;
    masterPasswordInput = '';
    passwordError = '';
    mode = 'export-confirm';
  }

  async function confirmExport() {
    if (!masterPasswordInput) { passwordError = 'Enter your master password'; return; }
    verifying = true;
    passwordError = '';
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'VERIFY_MASTER_PASSWORD',
        payload: { masterPassword: masterPasswordInput },
      }) as { valid: boolean };

      if (!resp.valid) {
        passwordError = 'Incorrect master password';
        verifying = false;
        return;
      }

      // Password verified — generate and download the file
      const content = exportFormat === 'csv' ? entriesToCsv(entries) : entriesToJson(entries);
      const mime    = exportFormat === 'csv' ? 'text/csv' : 'application/json';
      const ext     = exportFormat === 'csv' ? 'csv'      : 'json';
      downloadFile(content, `zerovault-export-${datestamp()}.${ext}`, mime);

      masterPasswordInput = '';
      mode = 'idle';
    } catch (e) {
      passwordError = e instanceof Error ? e.message : 'Verification failed';
    } finally {
      verifying = false;
    }
  }

  function downloadFile(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function datestamp() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Import ───────────────────────────────────────────────────────────────

  function triggerFilePicker() {
    importError = '';
    preview = null;
    importResult = null;
    fileInput.click();
  }

  async function onFileSelected() {
    const file = fileInput.files?.[0];
    if (!file) return;
    importError = '';
    mode = 'importing';

    try {
      const content = await file.text();
      const parsed  = parseFile(file.name, content);
      parsedEntries = parsed.entries;

      if (parsedEntries.length === 0) {
        importError = 'No valid entries found in this file.';
        mode = 'idle';
        return;
      }

      preview = buildPreview(parsedEntries, entries, parsed.format, parsed.source);
      mode = 'import-preview';
    } catch (e) {
      importError = e instanceof Error ? e.message : 'Failed to parse file';
      mode = 'idle';
    } finally {
      fileInput.value = '';   // reset so same file can be re-selected
    }
  }

  async function confirmImport() {
    if (!preview || parsedEntries.length === 0) return;
    importLoading = true;
    importError = '';

    try {
      const payload: BulkAddEntriesPayload = {
        entries: toVaultShape(parsedEntries),
        skipDuplicates,
      };
      const result = await chrome.runtime.sendMessage({
        type: 'BULK_ADD_ENTRIES',
        payload,
      }) as BulkAddEntriesResult & { error?: string };

      if (result.error) {
        importError = result.error === 'Vault is locked'
          ? 'Session expired — please refresh the page and unlock your vault again.'
          : result.error;
        mode = 'import-preview';
        return;
      }

      importResult = result;
      mode = 'done';
      dispatch('imported');
    } catch (e) {
      importError = e instanceof Error ? e.message : 'Import failed';
      mode = 'import-preview';
    } finally {
      importLoading = false;
    }
  }

  function reset() {
    mode = 'idle';
    preview = null;
    parsedEntries = [];
    importResult = null;
    importError = '';
    masterPasswordInput = '';
    passwordError = '';
  }

  const SOURCE_LABELS: Record<string, string> = {
    zerovault: 'ZeroVault',
    chrome: 'Chrome',
    firefox: 'Firefox',
    bitwarden: 'Bitwarden',
    lastpass: 'LastPass',
    '1password': '1Password',
    json: 'JSON',
    generic: 'Generic CSV',
  };
</script>

<!-- Hidden file input -->
<input
  bind:this={fileInput}
  type="file"
  accept=".csv,.json"
  class="hidden"
  on:change={onFileSelected}
/>

<div class="p-6 max-w-2xl mx-auto">
  <h2 class="text-xl font-semibold text-white mb-1">Import &amp; Export</h2>
  <p class="text-sm text-gray-400 mb-6">Move passwords in and out of ZeroVault.</p>

  <!-- ── Export section ─────────────────────────────────────────────── -->
  {#if mode === 'idle' || mode === 'done'}
    <div class="bg-gray-800 rounded-xl p-5 mb-5">
      <h3 class="text-base font-medium text-white mb-1">Export</h3>
      <p class="text-sm text-gray-400 mb-4">
        Download all {entries.length} credential{entries.length !== 1 ? 's' : ''} as a file.
        Your master password is required to confirm the export.
      </p>
      {#if entries.length === 0}
        <p class="text-sm text-yellow-400">Your vault is empty — nothing to export.</p>
      {:else}
        <div class="flex gap-3">
          <button
            on:click={() => startExport('csv')}
            class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium
                   py-2.5 px-4 rounded-lg transition-colors"
          >
            Export as CSV
          </button>
          <button
            on:click={() => startExport('json')}
            class="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium
                   py-2.5 px-4 rounded-lg transition-colors"
          >
            Export as JSON
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          CSV works with Chrome, Firefox, Bitwarden, LastPass and 1Password.
          JSON is the native ZeroVault format (lossless round-trip).
        </p>
      {/if}
    </div>

    <!-- ── Import section ───────────────────────────────────────────── -->
    <div class="bg-gray-800 rounded-xl p-5">
      <h3 class="text-base font-medium text-white mb-1">Import</h3>
      <p class="text-sm text-gray-400 mb-4">
        Import from a CSV or JSON file. Supports Chrome, Firefox, Bitwarden, LastPass,
        1Password, and ZeroVault exports.
      </p>
      {#if importError}
        <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-3">
          {importError}
        </div>
      {/if}
      {#if importResult && mode === 'done'}
        <div class="text-green-400 text-sm bg-green-900/20 border border-green-800/50 rounded-lg p-3 mb-3">
          Import complete — {importResult.added} added, {importResult.skipped} skipped.
        </div>
      {/if}
      <button
        on:click={triggerFilePicker}
        class="w-full border-2 border-dashed border-gray-600 hover:border-indigo-500
               text-gray-400 hover:text-white rounded-xl py-8 text-sm transition-colors
               flex flex-col items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span>Click to choose a file <span class="text-gray-500">(.csv or .json)</span></span>
      </button>
    </div>
  {/if}

  <!-- ── Export password confirmation ─────────────────────────────────── -->
  {#if mode === 'export-confirm'}
    <div class="bg-gray-800 rounded-xl p-5">
      <h3 class="text-base font-medium text-white mb-1">Confirm Export</h3>
      <p class="text-sm text-gray-400 mb-4">
        You're about to export <strong class="text-white">{entries.length}</strong> credentials
        as a plaintext <strong class="text-white">{exportFormat.toUpperCase()}</strong> file.
        Enter your master password to proceed.
      </p>
      <div class="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 mb-4 text-xs text-yellow-300">
        Keep this file secure — it contains all your passwords in plaintext.
      </div>
      {#if passwordError}
        <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-3">
          {passwordError}
        </div>
      {/if}
      <div class="mb-4">
        <label class="block text-sm text-gray-400 mb-1" for="export-pw">Master Password</label>
        <input
          id="export-pw"
          type="password"
          bind:value={masterPasswordInput}
          on:keydown={(e) => e.key === 'Enter' && confirmExport()}
          placeholder="Enter your master password…"
          autocomplete="current-password"
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
                 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                 focus:ring-indigo-500 transition-colors text-sm"
        />
      </div>
      <div class="flex gap-3">
        <button
          on:click={confirmExport}
          disabled={verifying}
          class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white
                 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {verifying ? 'Verifying…' : `Download ${exportFormat.toUpperCase()}`}
        </button>
        <button
          on:click={reset}
          class="px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}

  <!-- ── Importing spinner ─────────────────────────────────────────────── -->
  {#if mode === 'importing'}
    <div class="bg-gray-800 rounded-xl p-8 flex flex-col items-center gap-3">
      <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-sm text-gray-400">Reading file…</p>
    </div>
  {/if}

  <!-- ── Import preview ────────────────────────────────────────────────── -->
  {#if mode === 'import-preview' && preview}
    <div class="bg-gray-800 rounded-xl p-5">
      <h3 class="text-base font-medium text-white mb-1">Import Preview</h3>
      <div class="flex gap-4 mb-4 text-sm">
        <span class="text-gray-400">Source: <span class="text-white">{SOURCE_LABELS[preview.source] ?? preview.source}</span></span>
        <span class="text-gray-400">Found: <span class="text-white">{preview.total}</span></span>
        {#if preview.duplicates > 0}
          <span class="text-yellow-400">{preview.duplicates} duplicate{preview.duplicates !== 1 ? 's' : ''}</span>
        {/if}
      </div>

      <!-- Preview table -->
      <div class="overflow-x-auto rounded-lg border border-gray-700 mb-4">
        <table class="w-full text-xs">
          <thead class="bg-gray-750">
            <tr class="border-b border-gray-700">
              <th class="text-left py-2 px-3 text-gray-400 font-medium">Site</th>
              <th class="text-left py-2 px-3 text-gray-400 font-medium">Username</th>
              <th class="text-left py-2 px-3 text-gray-400 font-medium">Password</th>
            </tr>
          </thead>
          <tbody>
            {#each preview.preview as row, i}
              <tr class="border-b border-gray-700/50 {i % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750/50'}">
                <td class="py-2 px-3 text-gray-200 truncate max-w-[160px]">{row.site || '—'}</td>
                <td class="py-2 px-3 text-gray-200 truncate max-w-[160px]">{row.username || '—'}</td>
                <td class="py-2 px-3 text-gray-500 font-mono">{'•'.repeat(Math.min(row.password.length, 10))}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if preview.total > 5}
          <p class="text-xs text-gray-500 p-2 text-center">…and {preview.total - 5} more</p>
        {/if}
      </div>

      {#if preview.duplicates > 0}
        <label class="flex items-center gap-2 text-sm text-gray-300 mb-4 cursor-pointer select-none">
          <input type="checkbox" bind:checked={skipDuplicates} class="accent-indigo-500" />
          Skip {preview.duplicates} duplicate{preview.duplicates !== 1 ? 's' : ''}
          (same site &amp; username already in vault)
        </label>
      {/if}

      {#if importError}
        <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-3">
          {importError}
        </div>
      {/if}

      <div class="bg-indigo-900/20 border border-indigo-700/40 rounded-lg p-3 text-sm text-indigo-300 mb-4">
        {skipDuplicates ? preview.toAdd : preview.total} credential{(skipDuplicates ? preview.toAdd : preview.total) !== 1 ? 's' : ''} will be added to your vault.
      </div>

      <div class="flex gap-3">
        <button
          on:click={confirmImport}
          disabled={importLoading || (skipDuplicates ? preview.toAdd === 0 : preview.total === 0)}
          class="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white
                 text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          {importLoading ? 'Importing…' : 'Import'}
        </button>
        <button
          on:click={reset}
          class="px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
</div>
