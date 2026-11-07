const filter = document.querySelector('#filter');
filter?.addEventListener('input', () => {
  const query = filter.value.trim().toLowerCase();
  document.querySelectorAll('.sidebar nav a').forEach(link => link.hidden = !link.textContent.toLowerCase().includes(query));
});
const frame = document.querySelector('[data-example]');
const theme = document.querySelector('[data-theme-select]');
function applyTheme() {
  if (!frame?.contentDocument) return;
  const doc = frame.contentDocument;
  doc.querySelectorAll('.portal-theme').forEach(root => root.dataset.theme = theme?.value ?? 'light');
  const root = doc.querySelector('.portal-theme');
  if (root) {
    root.style.padding = '24px'; root.style.minHeight = '130px'; doc.body.style.margin = '0';
    doc.body.style.background = getComputedStyle(root).getPropertyValue('--portal-surface');
    root.querySelectorAll('.portal-demo-box').forEach(box => { box.style.padding = '16px'; box.style.background = 'var(--portal-surface-muted)'; box.style.borderRadius = 'var(--portal-radius-md)'; });
  }
  requestAnimationFrame(() => frame.style.height = `${Math.max(150,doc.documentElement.scrollHeight)}px`);
}
frame?.addEventListener('load', () => {
  applyTheme();
  frame.contentDocument?.addEventListener('toggle', applyTheme, true);
  frame.contentDocument?.addEventListener('submit', event => event.preventDefault());
});
theme?.addEventListener('change', applyTheme);
window.addEventListener('resize', applyTheme);
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const text = document.getElementById(button.dataset.copy)?.textContent ?? '';
  const status = button.closest('section')?.querySelector('.copy-status');
  try { await navigator.clipboard.writeText(text); if (status) status.textContent = 'Source copied.'; }
  catch { if (status) status.textContent = 'Select the source above and copy it with your keyboard.'; }
}));
