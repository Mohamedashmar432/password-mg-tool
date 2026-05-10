<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authenticateWithBiometric } from '../../crypto/webauthn.js';

  export let credentialId: ArrayBuffer;
  export let prfSalt: ArrayBuffer;

  const dispatch = createEventDispatcher<{
    success: { prfOutput: ArrayBuffer };
    cancel: void;
    error: { message: string };
  }>();

  let loading = false;
  let error = '';

  async function verify() {
    loading = true;
    error = '';
    try {
      const result = await authenticateWithBiometric(credentialId, prfSalt);
      dispatch('success', { prfOutput: result.prfOutput });
    } catch (e) {
      error = e instanceof Error ? e.message : 'Verification failed';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
  <div class="bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 border border-gray-800">
    <div class="flex flex-col items-center gap-6">
      <div class="w-16 h-16 rounded-full bg-indigo-900/40 flex items-center justify-center border border-indigo-700">
        <svg class="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      </div>
      <div class="text-center">
        <h2 class="text-xl font-semibold text-white">Verify Identity</h2>
        <p class="mt-2 text-sm text-gray-400">
          Use Windows Hello, fingerprint, PIN, or face unlock to continue
        </p>
      </div>
      {#if error}
        <p class="text-sm text-red-400 text-center bg-red-900/20 border border-red-800/50 rounded px-3 py-2 w-full">{error}</p>
      {/if}
      <div class="flex flex-col gap-3 w-full">
        <button
          on:click={verify}
          disabled={loading}
          class="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
        >
          {loading ? 'Waiting for Windows Security...' : 'Verify using Windows Security'}
        </button>
        <button
          on:click={() => dispatch('cancel')}
          disabled={loading}
          class="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-medium rounded-xl transition-colors border border-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>
