<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authenticateWithBiometric } from '../../crypto/webauthn.js';
  import { bufToArr } from '../../utils/buffer.js';

  export let credentialId: ArrayBuffer;
  export let prfSalt: ArrayBuffer;

  const dispatch = createEventDispatcher<{
    unlocked: void;
    error: { message: string };
  }>();

  let loading = false;
  let error = '';

  async function unlock() {
    loading = true;
    error = '';
    try {
      const { prfOutput } = await authenticateWithBiometric(credentialId, prfSalt);
      const response = await chrome.runtime.sendMessage({
        type: 'BIOMETRIC_UNLOCK',
        payload: { prfOutput: bufToArr(prfOutput) },
      });
      if (response.success) {
        dispatch('unlocked');
      } else {
        error = 'Unlock failed — try master password';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Verification failed';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col gap-2">
  <button
    on:click={unlock}
    disabled={loading}
    class="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
           text-white text-sm font-medium rounded transition-colors"
  >
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
    {loading ? 'Waiting for Windows Hello...' : 'Unlock with Windows Hello'}
  </button>
  {#if error}
    <p class="text-xs text-red-400 text-center">{error}</p>
  {/if}
</div>
