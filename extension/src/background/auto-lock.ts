import { loadSession, DEFAULT_SESSION } from '../storage/auth-store.js';

let _timer: ReturnType<typeof setTimeout> | null = null;

async function getTimeoutMs(): Promise<number> {
  const session = await loadSession();
  return session?.lockTimeout ?? DEFAULT_SESSION.lockTimeout;
}

export async function resetTimer(onLock: () => void): Promise<void> {
  cancelTimer();
  const ms = await getTimeoutMs();
  _timer = setTimeout(onLock, ms);
}

export function cancelTimer(): void {
  if (_timer !== null) {
    clearTimeout(_timer);
    _timer = null;
  }
}
