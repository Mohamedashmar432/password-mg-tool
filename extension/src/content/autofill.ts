import type { DetectedForm } from '../types/index.js';

function fillInput(input: HTMLInputElement, value: string): void {
  // Set the native input value property so React/Vue detect the change
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }

  // Dispatch events for framework compatibility
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function autofillForm(
  form: DetectedForm,
  entry: { username: string; password: string }
): void {
  if (form.usernameField) {
    fillInput(form.usernameField, entry.username);
  }
  if (form.passwordField) {
    fillInput(form.passwordField, entry.password);
  }
  // Never store credentials — values are set directly into DOM inputs only
}
