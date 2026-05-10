import type { DetectedForm, ExtensionMessage, CaptureCredentialsPayload } from '../types/index.js';

export function attachCaptureListener(form: DetectedForm): void {
  if (form.kind !== 'login' && form.kind !== 'signup') return;
  if (!form.passwordField || !form.usernameField) return;

  const handleSubmit = (): void => {
    // Read values at submit time — then immediately clear local references
    const username = form.usernameField?.value ?? '';
    const password = form.passwordField?.value ?? '';

    if (!username || !password) return;

    let hostname: string;
    let url: string;
    try {
      const parsed = new URL(window.location.href);
      hostname = parsed.hostname;
      url = parsed.href;
    } catch {
      return;
    }

    const message: ExtensionMessage<CaptureCredentialsPayload> = {
      type: 'CAPTURE_CREDENTIALS',
      payload: { hostname, username, password, url },
    };

    // Send to background — fire and forget
    chrome.runtime.sendMessage(message).catch(() => {
      // Silently ignore if background is unavailable
    });

    // Clear local references immediately
    // (values were already sent; we don't hold onto them)
  };

  form.form.addEventListener('submit', handleSubmit, { once: false, passive: true });
}
