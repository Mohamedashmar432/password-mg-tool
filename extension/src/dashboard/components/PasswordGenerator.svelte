<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { generatePassword } from '../../crypto/index.js';
  import PasswordStrength from './PasswordStrength.svelte';
  import type { GeneratorOptions } from '../../types/index.js';

  const dispatch = createEventDispatcher<{ use: string }>();

  let length = 20;
  let uppercase = true;
  let lowercase = true;
  let numbers = true;
  let symbols = true;

  let generatedPassword = '';
  let error = '';
  let copySuccess = false;

  const CLIPBOARD_CLEAR_MS = 30_000;

  function generate(): void {
    error = '';
    try {
      const opts: GeneratorOptions = { length, uppercase, lowercase, numbers, symbols };
      generatedPassword = generatePassword(opts);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Generation failed';
    }
  }

  async function copyPassword(): Promise<void> {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      copySuccess = true;
      const pwd = generatedPassword;
      setTimeout(async () => {
        try {
          const current = await navigator.clipboard.readText().catch(() => '');
          if (current === pwd) {
            await navigator.clipboard.writeText('');
          }
        } catch {
          // ignore
        }
        copySuccess = false;
      }, CLIPBOARD_CLEAR_MS);
    } catch {
      error = 'Failed to copy to clipboard';
    }
  }

  // Generate one on mount
  generate();
</script>

<div class="max-w-lg">
  <h2 class="text-xl font-semibold text-white mb-6">Password Generator</h2>

  <!-- Options -->
  <div class="bg-gray-800 rounded-xl p-5 mb-4 flex flex-col gap-4">
    <!-- Length slider -->
    <div>
      <div class="flex justify-between items-center mb-2">
        <label class="text-sm text-gray-300 font-medium">Length</label>
        <span class="text-indigo-400 font-mono font-bold text-sm w-8 text-right">{length}</span>
      </div>
      <input
        type="range"
        min="8"
        max="128"
        bind:value={length}
        class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
      />
      <div class="flex justify-between text-xs text-gray-600 mt-1">
        <span>8</span>
        <span>128</span>
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="grid grid-cols-2 gap-3">
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={uppercase}
          class="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
        />
        <span class="text-sm text-gray-300">Uppercase (A-Z)</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={lowercase}
          class="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
        />
        <span class="text-sm text-gray-300">Lowercase (a-z)</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={numbers}
          class="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
        />
        <span class="text-sm text-gray-300">Numbers (0-9)</span>
      </label>
      <label class="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          bind:checked={symbols}
          class="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
        />
        <span class="text-sm text-gray-300">Symbols (!@#...)</span>
      </label>
    </div>

    <button
      on:click={generate}
      class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors"
    >
      Generate Password
    </button>
  </div>

  <!-- Result -->
  {#if error}
    <div class="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">
      {error}
    </div>
  {/if}

  {#if generatedPassword}
    <div class="bg-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div class="text-xs text-gray-500 uppercase tracking-wider">Generated Password</div>
      <div class="font-mono text-white text-sm break-all bg-gray-900 rounded-lg p-3 select-all">
        {generatedPassword}
      </div>

      <PasswordStrength password={generatedPassword} />

      <div class="flex gap-3">
        <button
          on:click={copyPassword}
          class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                 {copySuccess
                   ? 'bg-green-700 text-green-200'
                   : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}"
        >
          {copySuccess ? 'Copied! (clears in 30s)' : 'Copy to Clipboard'}
        </button>
        <button
          on:click={() => dispatch('use', generatedPassword)}
          class="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Use this password
        </button>
      </div>
    </div>
  {/if}
</div>
