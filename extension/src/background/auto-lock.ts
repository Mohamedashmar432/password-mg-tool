const INACTIVITY_MS = 15 * 60 * 1000;
let timer: ReturnType<typeof setTimeout> | null = null;

export function resetTimer(onLock: () => void): void {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(onLock, INACTIVITY_MS);
}

export function cancelTimer(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}
