<script lang="ts">
  export let isLocked: boolean;
  export let entryCount: number;
</script>

<div class="flex items-center gap-2 text-xs">
  <!-- Lock/unlock icon -->
  {#if isLocked}
    <div class="flex items-center gap-1 text-yellow-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path fill-rule="evenodd"
          d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
          clip-rule="evenodd" />
      </svg>
      <span>Locked</span>
    </div>
  {:else}
    <div class="flex items-center gap-1 text-green-400">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 01-1.5 0V6.75a3.75 3.75 0 10-7.5 0v3a3 3 0 013 3v6.75a3 3 0 01-3 3H3.75a3 3 0 01-3-3v-6.75a3 3 0 013-3h9v-3c0-2.9 2.35-5.25 5.25-5.25z" />
      </svg>
      <span>Unlocked</span>
    </div>
  {/if}

  <div class="text-gray-600">|</div>

  <!-- Entry count -->
  <div class="text-gray-400">
    {#if isLocked}
      &mdash;
    {:else}
      <span class="text-gray-300 font-medium">{entryCount}</span>
      {entryCount === 1 ? 'entry' : 'entries'}
    {/if}
  </div>
</div>
