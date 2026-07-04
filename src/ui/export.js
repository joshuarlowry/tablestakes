import { $ } from './dom.js';

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    prompt('Copy this:', text);
    return;
  }
  const t = $('toast');
  if (!t) return;
  t.textContent = 'Copied';
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); t.textContent = 'Link copied'; }, 1800);
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
