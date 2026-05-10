<script lang="ts">
  export let password: string;

  type StrengthLevel = 'Weak' | 'Fair' | 'Good' | 'Strong';

  interface StrengthResult {
    score: number;
    label: StrengthLevel;
    color: string;
    barColor: string;
  }

  function scorePassword(pwd: string): StrengthResult {
    if (!pwd) return { score: 0, label: 'Weak', color: 'text-red-400', barColor: 'bg-red-500' };

    let score = 0;

    // Length scoring
    if (pwd.length >= 8)  score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (pwd.length >= 24) score += 1;

    // Character diversity
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 2;

    // Penalize common patterns
    if (/(.)\1{2,}/.test(pwd)) score -= 1; // Repeated chars
    if (/^[a-z]+$/i.test(pwd)) score -= 1; // Only letters
    if (/^[0-9]+$/.test(pwd)) score -= 2;  // Only numbers
    if (/password|123456|qwerty|admin|letmein/i.test(pwd)) score -= 3;

    score = Math.max(0, Math.min(10, score));

    if (score <= 3) return { score, label: 'Weak', color: 'text-red-400', barColor: 'bg-red-500' };
    if (score <= 5) return { score, label: 'Fair', color: 'text-yellow-400', barColor: 'bg-yellow-500' };
    if (score <= 7) return { score, label: 'Good', color: 'text-blue-400', barColor: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'text-green-400', barColor: 'bg-green-500' };
  }

  $: result = scorePassword(password);
  $: barWidth = `${(result.score / 10) * 100}%`;
</script>

<div class="flex flex-col gap-1">
  <div class="flex justify-between items-center">
    <span class="text-xs text-gray-500">Strength</span>
    <span class="text-xs font-medium {result.color}">{result.label}</span>
  </div>
  <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
    <div
      class="h-full rounded-full transition-all duration-300 {result.barColor}"
      style="width: {barWidth}"
    ></div>
  </div>
</div>
