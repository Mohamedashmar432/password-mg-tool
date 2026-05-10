<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { generatePassword } from '../../crypto/index.js';
  import PasswordStrength from './PasswordStrength.svelte';
  import type { VaultEntry, GeneratorOptions } from '../../types/index.js';

  export let entry: VaultEntry | null;

  const dispatch = createEventDispatcher<{
    save: { data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>; id?: string };
    cancel: void;
  }>();

  const MAX_TEXT_LENGTH = 256;

  // Initialize form state from entry or blank
  let site = sanitize(entry?.site ?? '');
  let url = sanitize(entry?.url ?? '');
  let username = sanitize(entry?.username ?? '');
  let password = entry?.password ?? '';
  let notes = sanitize(entry?.notes ?? '');
  let showPassword = false;
  let error = '';
  let showMiniGenerator = false;
  let generatorError = '';

  function sanitize(value: string): string {
    return value.trim().slice(0, MAX_TEXT_LENGTH);
  }

  function sanitizeOnBlur(event: Event): void {
    const input = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    input.value = sanitize(input.value);
  }

  function handleSave(): void {
    error = '';

    const cleanSite = sanitize(site);
    const cleanUrl = sanitize(url);
    const cleanUsername = sanitize(username);
    const cleanNotes = sanitize(notes);

    if (!cleanSite) { error = 'Site name is required'; return; }
    if (!cleanUsername) { error = 'Username is required'; return; }
    if (!password) { error = 'Password is required'; return; }

    const data: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'> = {
      site: cleanSite,
      url: cleanUrl,
      username: cleanUsername,
      password, // Password is NOT length-limited
      ...(cleanNotes ? { notes: cleanNotes } : {}),
    };

    dispatch('save', { data, id: entry?.id });
  }

  function generateAndFill(): void {
    generatorError = '';
    try {
      const opts: GeneratorOptions = {
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
      };
      password = generatePassword(opts);
      showMiniGenerator = false;
    } catch (e) {
      generatorError = e instanceof Error ? e.message : 'Generation failed';
    }
  }
</script>

<div class="bg-gray-800 rounded-xl shadow-2xl">
  <!-- Header -->
  <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
    <h3 class="text-lg font-semibold text-white">
      {entry ? 'Edit Credential' : 'Add New Credential'}
    </h3>
    <button
      on:click={() => dispatch('cancel')}
      class="text-gray-500 hover:text-white w-7 h-7 flex items-center justify-center rounded transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <div class="px-6 py-4 flex flex-col gap-4">
    {#if error}
      <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3">
        {error}
      </div>
    {/if}

    <!-- Site -->
    <div>
      <label class="block text-sm text-gray-400 mb-1" for="edit-site">Site Name <span class="text-red-400">*</span></label>
      <input
        id="edit-site"
        type="text"
        bind:value={site}
        on:blur={sanitizeOnBlur}
        placeholder="e.g. GitHub"
        maxlength={MAX_TEXT_LENGTH}
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
               placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
               focus:ring-indigo-500 transition-colors text-sm"
      />
    </div>

    <!-- URL -->
    <div>
      <label class="block text-sm text-gray-400 mb-1" for="edit-url">URL</label>
      <input
        id="edit-url"
        type="url"
        bind:value={url}
        on:blur={sanitizeOnBlur}
        placeholder="https://github.com"
        maxlength={MAX_TEXT_LENGTH}
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
               placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
               focus:ring-indigo-500 transition-colors text-sm"
      />
    </div>

    <!-- Username -->
    <div>
      <label class="block text-sm text-gray-400 mb-1" for="edit-username">Username / Email <span class="text-red-400">*</span></label>
      <input
        id="edit-username"
        type="text"
        bind:value={username}
        on:blur={sanitizeOnBlur}
        placeholder="username@example.com"
        maxlength={MAX_TEXT_LENGTH}
        autocomplete="off"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
               placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
               focus:ring-indigo-500 transition-colors text-sm"
      />
    </div>

    <!-- Password -->
    <div>
      <label class="block text-sm text-gray-400 mb-1" for="edit-password">Password <span class="text-red-400">*</span></label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          {#if showPassword}
            <input
              id="edit-password"
              type="text"
              bind:value={password}
              placeholder="Enter or generate a password"
              autocomplete="new-password"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 pr-20 text-white
                     placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                     focus:ring-indigo-500 transition-colors text-sm font-mono"
            />
          {:else}
            <input
              id="edit-password"
              type="password"
              bind:value={password}
              placeholder="Enter or generate a password"
              autocomplete="new-password"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 pr-20 text-white
                     placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
                     focus:ring-indigo-500 transition-colors text-sm font-mono"
            />
          {/if}
          <button
            type="button"
            on:click={() => { showPassword = !showPassword; }}
            class="absolute right-2 inset-y-0 flex items-center text-xs text-gray-400 hover:text-white px-1"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        <button
          type="button"
          on:click={() => { showMiniGenerator = !showMiniGenerator; }}
          class="flex-shrink-0 px-3 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
          title="Generate password"
        >
          Generate
        </button>
      </div>

      {#if password}
        <div class="mt-2">
          <PasswordStrength {password} />
        </div>
      {/if}

      <!-- Mini generator -->
      {#if showMiniGenerator}
        <div class="mt-2 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
          {#if generatorError}
            <div class="text-red-400 text-xs mb-2">{generatorError}</div>
          {/if}
          <div class="text-xs text-gray-400 mb-2">Quick generate (20 chars, all character types)</div>
          <button
            type="button"
            on:click={generateAndFill}
            class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
          >
            Generate &amp; Fill
          </button>
        </div>
      {/if}
    </div>

    <!-- Notes -->
    <div>
      <label class="block text-sm text-gray-400 mb-1" for="edit-notes">Notes</label>
      <textarea
        id="edit-notes"
        bind:value={notes}
        on:blur={sanitizeOnBlur}
        placeholder="Optional notes..."
        maxlength={MAX_TEXT_LENGTH}
        rows="3"
        class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white
               placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
               focus:ring-indigo-500 transition-colors text-sm resize-none"
      ></textarea>
      <div class="text-xs text-gray-600 text-right mt-0.5">{notes.length}/{MAX_TEXT_LENGTH}</div>
    </div>
  </div>

  <!-- Footer buttons -->
  <div class="px-6 py-4 border-t border-gray-700 flex gap-3">
    <button
      on:click={() => dispatch('cancel')}
      class="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
    >
      Cancel
    </button>
    <button
      on:click={handleSave}
      class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
    >
      {entry ? 'Save Changes' : 'Add Credential'}
    </button>
  </div>
</div>
