import type { DetectedForm, FormKind } from '../types/index.js';

function getInputsByType(form: HTMLFormElement, type: string): HTMLInputElement[] {
  return Array.from(form.querySelectorAll<HTMLInputElement>(`input[type="${type}"]`));
}

function findUsernameField(form: HTMLFormElement): HTMLInputElement | null {
  // Look for explicit username/email autocomplete
  const byAutocomplete = form.querySelector<HTMLInputElement>(
    'input[autocomplete="username"], input[autocomplete="email"]'
  );
  if (byAutocomplete) return byAutocomplete;

  // Look by type
  const emailField = form.querySelector<HTMLInputElement>('input[type="email"]');
  if (emailField) return emailField;

  // Look by name/id heuristics
  const candidates = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])'));
  const heuristicField = candidates.find(input => {
    const name = (input.name + input.id + (input.placeholder ?? '')).toLowerCase();
    return name.includes('user') || name.includes('email') || name.includes('login') || name.includes('account');
  });
  return heuristicField ?? candidates[0] ?? null;
}

function classifyForm(form: HTMLFormElement): FormKind {
  const passwordFields = getInputsByType(form, 'password');

  if (passwordFields.length === 0) return 'unknown';

  // Signup: 2+ password fields, or explicit new-password autocomplete
  const hasNewPassword = form.querySelector('input[autocomplete="new-password"]') !== null;
  if (passwordFields.length >= 2 || hasNewPassword) return 'signup';

  // Login: exactly 1 password field
  if (passwordFields.length === 1) return 'login';

  return 'unknown';
}

function detectForm(form: HTMLFormElement): DetectedForm {
  const kind = classifyForm(form);
  const passwordFields = getInputsByType(form, 'password');

  let usernameField: HTMLInputElement | null = null;
  let passwordField: HTMLInputElement | null = null;
  let confirmField: HTMLInputElement | null = null;

  if (kind === 'login') {
    passwordField = passwordFields[0] ?? null;
    usernameField = findUsernameField(form);
  } else if (kind === 'signup') {
    // First password field is the primary, second is confirm
    passwordField = passwordFields[0] ?? null;
    confirmField = passwordFields[1] ?? null;
    usernameField = findUsernameField(form);
  }

  return { kind, usernameField, passwordField, confirmField, form };
}

export function detectForms(): DetectedForm[] {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form'));
  return forms
    .map(detectForm)
    .filter(f => f.kind !== 'unknown' && f.passwordField !== null);
}

export function observeForms(callback: () => void): MutationObserver {
  const observer = new MutationObserver(callback);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  return observer;
}
