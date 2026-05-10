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

const BIOMETRIC_NOTIFICATION_STYLES = `
  .wrap {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 292px;
    background: #1e1b4b;
    border: 1px solid #6366f1;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.65);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #e0e7ff;
    overflow: hidden;
    z-index: 2147483647;
    animation: zv-slide 0.2s ease-out;
  }
  @keyframes zv-slide {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 13px 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 12px;
    color: #a5b4fc;
    letter-spacing: 0.02em;
  }
  .z-icon {
    width: 20px; height: 20px;
    background: #4f46e5;
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: #fff;
  }
  .close {
    background: none; border: none; cursor: pointer;
    color: #6366f1; font-size: 18px; line-height: 1;
    padding: 2px 5px; border-radius: 4px;
    transition: color 0.12s, background 0.12s;
  }
  .close:hover { color: #e0e7ff; background: #312e81; }
  .body { padding: 8px 13px 13px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: #312e81; border-radius: 5px;
    padding: 2px 7px; font-size: 10px; font-weight: 700;
    color: #c7d2fe; margin-bottom: 7px; letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .msg {
    font-size: 12px; color: #a5b4fc;
    margin-bottom: 11px; line-height: 1.4;
  }
  .btn {
    width: 100%; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    background: #4f46e5; color: #fff;
    border: none; border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; letter-spacing: 0.01em;
  }
  .btn:hover { background: #4338ca; }
  .btn-icon { font-size: 14px; }
  .progress { height: 2px; background: #312e81; }
  .bar {
    height: 100%; background: #6366f1;
    animation: shrink 30s linear forwards;
  }
  @keyframes shrink { from { width: 100%; } to { width: 0%; } }
`;

function showBiometricHint(highRisk: boolean): void {
  document.querySelector('[data-zv-notice]')?.remove();

  const host = document.createElement('div');
  host.setAttribute('data-zv-notice', '');
  const shadow = host.attachShadow({ mode: 'closed' });

  const badge = highRisk ? '⚠ High-risk site' : '🔐 Credentials detected';
  const msg = highRisk
    ? 'Banking/crypto site — click below to autofill securely'
    : 'Saved password found for this site';

  shadow.innerHTML = `
    <style>${BIOMETRIC_NOTIFICATION_STYLES}</style>
    <div class="wrap">
      <div class="header">
        <div class="brand"><div class="z-icon">Z</div>ZeroVault</div>
        <button class="close" id="x">&#10005;</button>
      </div>
      <div class="body">
        <div class="badge">${badge}</div>
        <div class="msg">${msg}</div>
        <button class="btn" id="fill">
          <span class="btn-icon">🔑</span>
          Unlock &amp; Fill with Windows Hello
        </button>
      </div>
      <div class="progress"><div class="bar"></div></div>
    </div>
  `;

  const dismiss = (): void => { clearTimeout(timer); host.remove(); };

  shadow.getElementById('x')?.addEventListener('click', dismiss);
  shadow.getElementById('fill')?.addEventListener('click', async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'OPEN_POPUP', payload: {} });
    } catch { /* ignore */ }
    dismiss();
  });

  document.body.appendChild(host);
  const timer = setTimeout(dismiss, 30_000);
}

async function queryAutofill(hostname: string): Promise<AutofillResponsePayload['entries']> {
  try {
    const msg: ExtensionMessage<AutofillRequestPayload> = {
      type: 'AUTOFILL_REQUEST',
      payload: { hostname },
    };
    const resp = await chrome.runtime.sendMessage(msg) as {
      entries?: AutofillResponsePayload['entries'];
      requiresBiometric?: boolean;
      vaultLocked?: boolean;
      isHighRisk?: boolean;
    } | null;

    // Vault is locked and biometric is enrolled — show hint to open popup for 1-tap fill
    if (resp?.vaultLocked && resp?.requiresBiometric) {
      showBiometricHint(resp.isHighRisk === true);
      return [];
    }

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
