import { detectForms, observeForms } from './form-detector.js';
import { autofillForm } from './autofill.js';
import { attachCaptureListener } from './capture.js';
import { showAutofillPrompt } from './prompt.js';
import type { ExtensionMessage, AutofillRequestPayload, AutofillResponsePayload } from '../types/index.js';

// Tracks password fields that have already triggered a prompt so we never
// show two prompts for the same field within one page lifetime.
const promptedFields = new WeakSet<HTMLInputElement>();

// Cleanup fn for the currently visible prompt (only one at a time).
let activeCleanup: (() => void) | null = null;

function getSafeHostname(): string | null {
  try { return new URL(window.location.href).hostname; } catch { return null; }
}

async function queryAutofill(hostname: string): Promise<AutofillResponsePayload['entries']> {
  try {
    const msg: ExtensionMessage<AutofillRequestPayload> = {
      type: 'AUTOFILL_REQUEST',
      payload: { hostname },
    };
    const resp = await chrome.runtime.sendMessage(msg) as { entries?: AutofillResponsePayload['entries'] } | null;
    return resp?.entries ?? [];
  } catch {
    return [];
  }
}

async function maybePrompt(form: import('../types/index.js').DetectedForm, hostname: string): Promise<void> {
  if (!form.passwordField) return;
  if (promptedFields.has(form.passwordField)) return;

  // Mark before the async call so a racing MutationObserver doesn't prompt twice
  promptedFields.add(form.passwordField);

  const entries = await queryAutofill(hostname);
  if (entries.length === 0) return;

  // Dismiss any previous prompt before showing the new one
  activeCleanup?.();

  activeCleanup = showAutofillPrompt(
    entries,
    (entry) => {
      activeCleanup = null;
      autofillForm(form, { username: entry.username, password: entry.password });
    },
    () => { activeCleanup = null; }
  );
}

function processForms(): void {
  const hostname = getSafeHostname();
  if (!hostname) return;

  for (const form of detectForms()) {
    attachCaptureListener(form);
    if (form.kind === 'login') {
      maybePrompt(form, hostname).catch(() => { /* silently ignore */ });
    }
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t !== null) clearTimeout(t);
    t = setTimeout(() => { t = null; fn(); }, ms);
  };
}

// Initial run — wait for DOM if needed
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', processForms);
} else {
  processForms();
}

// Re-run when the DOM changes (SPAs render forms late).
// Debounced to avoid flooding on rapid DOM mutations.
const debouncedProcess = debounce(processForms, 500);
observeForms(debouncedProcess);

// ── Popup-triggered fill ──────────────────────────────────────────────────
// The popup sends POPUP_AUTOFILL directly to the content script (not through
// the background) with the exact credential to fill.
chrome.runtime.onMessage.addListener(
  (msg: unknown, _sender, sendResponse) => {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as { type?: string; payload?: { username?: string; password?: string } };
    if (m.type !== 'POPUP_AUTOFILL') return false;

    const username = m.payload?.username ?? '';
    const password = m.payload?.password ?? '';

    // Try to fill any login form already on the page
    const loginForms = detectForms().filter(f => f.kind === 'login' && f.passwordField);
    if (loginForms[0]) {
      autofillForm(loginForms[0], { username, password });
    }
    sendResponse({ ok: true });
    return false;
  }
);
