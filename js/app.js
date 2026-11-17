// Zero Mile app: the router for the daily-use screens (Garden, Find, Snap, Impact, More).
import { $, $$, data, rise, ROOT } from './core.js?v=3';

const routes = {
  '': () => import('./garden.js?v=3'),
  garden: () => import('./garden.js?v=3'),
  snap: () => import('./garden.js?v=3'),
  find: () => import('./find.js?v=3'),
  plant: () => import('./find.js?v=3'),
  impact: () => import('./impact.js?v=3'),
  sources: () => import('./sources.js?v=3'),
};
const VIEW = { snap: 'snapView', find: 'findView', plant: 'plantView' };
let current = null, routed = false, seq = 0;
async function route() {
  if (location.hash && !location.hash.startsWith('#/')) return; // in-page anchors such as #main
  const my = ++seq;
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const key = routes[name] ? name : '';
  await data();
  const mod = await routes[key]();
  if (my !== seq) return; // a newer navigation won
  current?.unmount?.();
  const main = $('#main');
  main.innerHTML = '';
  document.body.dataset.view = key || 'garden';
  const navKey = key === 'plant' ? 'find' : key || 'garden';
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  current = await mod[VIEW[key] || 'default'](main, decodeURIComponent(arg || ''));
  main.firstElementChild?.classList.add('view-enter');
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = (main.querySelector('h1')?.textContent || 'My garden') + ' · Zero Mile';
  if (routed) main.focus({ preventScroll: true });
  routed = true;
  rise(main);
}
addEventListener('hashchange', route);
$('.skip').addEventListener('click', (e) => { e.preventDefault(); $('#main').focus(); });
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('sw.js', ROOT), { scope: ROOT.pathname }).catch(() => {});
