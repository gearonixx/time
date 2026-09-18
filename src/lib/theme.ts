type Theme = 'black' | 'light';
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'black' ? '#000000' : '#ffffff');
}
export function followSystemTheme(): () => void {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const sync = () => applyTheme(preference.matches ? 'black' : 'light');
  sync();
  preference.addEventListener('change', sync);
  return () => preference.removeEventListener('change', sync);
}
