<script lang="ts">
  import { generatePassword } from '../../crypto/index.js';

  let length    = 20;
  let uppercase = true;
  let lowercase = true;
  let numbers   = true;
  let symbols   = true;
  let generated = '';
  let copied    = false;
  let error     = '';

  function generate(): void {
    error = '';
    try {
      generated = generatePassword({ length, uppercase, lowercase, numbers, symbols });
      copied = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Generation failed';
    }
  }

  async function copyPassword(): Promise<void> {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    copied = true;
    // Auto-clear clipboard after 30 s
    setTimeout(() => navigator.clipboard.writeText('').catch(() => {}), 30_000);
    setTimeout(() => { copied = false; }, 1500);
  }

  // Generate a password on first render
  generate();
</script>

<div class="flex flex-col gap-2">
  <!-- Length row -->
  <div class="flex items-center gap-2">
    <span class="text-xs text-gray-400 w-12 flex-shrink-0">Length</span>
    <input
      type="range"
      min="8" max="40"
      bind:value={length}
      on:input={generate}
      class="flex-1 accent-indigo-500 h-1.5"
    />
    <span class="text-xs text-indigo-300 font-mono w-5 text-right flex-shrink-0">{length}</span>
  </div>

  <!-- Character class toggles -->
  <div class="flex gap-1 flex-wrap">
    {#each [
      { label: 'A–Z', bind: 'uppercase' },
      { label: 'a–z', bind: 'lowercase' },
      { label: '0–9', bind: 'numbers'   },
      { label: '!@#', bind: 'symbols'   },
    ] as opt (opt.label)}
      <button
        on:click={() => {
          if (opt.bind === 'uppercase') { uppercase = !uppercase; }
          else if (opt.bind === 'lowercase') { lowercase = !lowercase; }
          else if (opt.bind === 'numbers') { numbers = !numbers; }
          else { symbols = !symbols; }
          generate();
        }}
        class="text-xs px-2 py-0.5 rounded border transition-colors {
          (opt.bind === 'uppercase' ? uppercase :
           opt.bind === 'lowercase' ? lowercase :
           opt.bind === 'numbers'   ? numbers   : symbols)
            ? 'bg-indigo-600/40 border-indigo-500 text-indigo-200'
            : 'bg-gray-700 border-gray-600 text-gray-500'
        }"
      >
        {opt.label}
      </button>
    {/each}
  </div>

  {#if error}
    <p class="text-red-400 text-xs">{error}</p>
  {:else if generated}
    <!-- Result row -->
    <div class="flex items-center gap-2 bg-gray-900 rounded px-2 py-1.5">
      <span class="font-mono text-xs text-gray-200 flex-1 truncate select-all">{generated}</span>
      <button
        on:click={copyPassword}
        class="text-xs flex-shrink-0 px-2 py-0.5 rounded transition-colors {
          copied
            ? 'bg-green-700 text-green-200'
            : 'bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white'
        }"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  {/if}

  <button
    on:click={generate}
    class="w-full text-xs py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300
           hover:text-white rounded transition-colors"
  >
    Regenerate
  </button>
</div>
