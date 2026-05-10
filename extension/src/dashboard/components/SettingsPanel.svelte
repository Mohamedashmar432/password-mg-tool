<script lang="ts">
  import { onMount } from 'svelte';
  import { isPlatformAuthenticatorAvailable, registerBiometric } from '../../crypto/webauthn.js';

  let biometricSupported = false;
  let enrolled = false;
  let lockTimeoutSeconds = 300;
  let requireAuthBeforeReveal = true;
  let requireAuthBeforeAutofill = false;
  let statusMessage = '';
  let loading = false;
  let userEmail = '';

  onMount(async () => {
    biometricSupported = await isPlatformAuthenticatorAvailable();

    const statusResp = await chrome.runtime.sendMessage({ type: 'BIOMETRIC_STATUS' });
    enrolled = statusResp.enrolled ?? false;

    const session = await chrome.runtime.sendMessage({ type: 'GET_SESSION_SETTINGS' });
    lockTimeoutSeconds = Math.round((session.lockTimeout ?? 300000) / 1000);
    requireAuthBeforeReveal = session.requireAuthBeforeReveal ?? true;
    requireAuthBeforeAutofill = session.requireAuthBeforeAutofill ?? false;
  });

  async function enrollBiometric() {
    loading = true;
    statusMessage = '';
    try {
      const result = await registerBiometric(userEmail || 'zerovault-user');
      await chrome.runtime.sendMessage({
        type: 'REGISTER_BIOMETRIC',
        payload: {
          prfOutput: result.prfOutput,
          credentialId: result.credentialId,
          prfSalt: result.prfSalt,
        },
      });
      enrolled = true;
      statusMessage = 'Windows Hello enrollment successful.';
    } catch (e) {
      statusMessage = e instanceof Error ? e.message : 'Enrollment failed';
    } finally {
      loading = false;
    }
  }

  async function disableBiometric() {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SESSION_SETTINGS',
      payload: { requireAuthBeforeAutofill: false, requireAuthBeforeReveal: false },
    });
    enrolled = false;
    statusMessage = 'Biometric unlock disabled.';
  }

  async function saveSettings() {
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SESSION_SETTINGS',
      payload: {
        lockTimeout: lockTimeoutSeconds * 1000,
        requireAuthBeforeReveal,
        requireAuthBeforeAutofill,
      },
    });
    statusMessage = 'Settings saved.';
  }
</script>

<div class="flex flex-col gap-8 max-w-lg p-6">
  <h2 class="text-2xl font-bold text-white">Security Settings</h2>

  <section class="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
    <h3 class="text-lg font-semibold mb-4 text-gray-100">Biometric Unlock</h3>
    {#if !biometricSupported}
      <p class="text-sm text-yellow-600">
        Windows Hello / platform authenticator not available on this device.
      </p>
    {:else if enrolled}
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-300">Windows Hello is enabled</p>
          <p class="text-xs text-gray-500 mt-1">Unlock vault with fingerprint, PIN, or face</p>
        </div>
        <button
          on:click={disableBiometric}
          class="px-4 py-2 text-sm text-red-400 border border-red-700 rounded-lg hover:bg-red-900/20 transition-colors"
        >
          Disable
        </button>
      </div>
    {:else}
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-300">Enable Windows Hello</p>
          <p class="text-xs text-gray-500 mt-1">Skip master password on future unlocks</p>
        </div>
        <button
          on:click={enrollBiometric}
          disabled={loading}
          class="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {loading ? 'Enrolling...' : 'Enable'}
        </button>
      </div>
    {/if}
    {#if statusMessage}
      <p class="mt-3 text-sm text-green-400">{statusMessage}</p>
    {/if}
  </section>

  <section class="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
    <h3 class="text-lg font-semibold mb-4 text-gray-100">Auto-Lock Timeout</h3>
    <div class="flex items-center gap-4">
      <label for="lock-timeout" class="sr-only">Lock timeout in seconds</label>
      <input
        id="lock-timeout"
        type="number"
        min="60"
        max="3600"
        step="60"
        bind:value={lockTimeoutSeconds}
        class="w-28 px-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
      />
      <span class="text-sm text-gray-400">seconds (60–3600)</span>
    </div>
  </section>

  <section class="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
    <h3 class="text-lg font-semibold mb-4 text-gray-100">Verification Policy</h3>
    <div class="flex flex-col gap-4">
      <label class="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" bind:checked={requireAuthBeforeReveal} class="w-5 h-5 rounded accent-indigo-600" />
        <div>
          <p class="text-sm font-medium text-gray-300">Require verification before revealing passwords</p>
          <p class="text-xs text-gray-500">View or copy triggers Windows Hello</p>
        </div>
      </label>
      <label class="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" bind:checked={requireAuthBeforeAutofill} class="w-5 h-5 rounded accent-indigo-600" />
        <div>
          <p class="text-sm font-medium text-gray-300">Require verification before autofill</p>
          <p class="text-xs text-gray-500">Banking and crypto sites always require verification regardless</p>
        </div>
      </label>
    </div>
  </section>

  <button
    on:click={saveSettings}
    class="self-start px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
  >
    Save Settings
  </button>
</div>
