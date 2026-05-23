import { elements } from '../state';
import { TOAST_DURATION_MS } from '../constants';

export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function isTeleportButton(btnText) {
  const text = (btnText || '').trim().toLowerCase();
  return (
    text.includes('travel to hideout') ||
    text.includes('teleport anyway') ||
    text.includes('隠れ家') ||
    text.includes('テレポート')
  );
}

export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function showToast(message, type = 'info') {
  const toastEl = elements.toastEl;
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = 'toast-notification';
  if (type === 'warning') toastEl.classList.add('toast-warning');
  toastEl.classList.add('visible');
  setTimeout(() => {
    toastEl.classList.remove('visible');
  }, TOAST_DURATION_MS);
}
