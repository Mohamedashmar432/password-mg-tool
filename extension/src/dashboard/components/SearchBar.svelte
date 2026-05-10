<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value: string = '';

  const dispatch = createEventDispatcher<{ input: string }>();

  function handleInput(event: Event): void {
    const target = event.currentTarget as HTMLInputElement;
    dispatch('input', target.value);
  }
</script>

<div class="relative">
  <!-- Search icon -->
  <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4 text-gray-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
    >
      <circle cx="11" cy="11" r="8" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  </div>

  <input
    type="search"
    {value}
    on:input={handleInput}
    placeholder="Search credentials..."
    class="w-full bg-gray-700 border border-gray-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white
           placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1
           focus:ring-indigo-500 transition-colors"
    autocomplete="off"
    spellcheck="false"
  />
</div>
