// Zero Mile app: the router for the daily-use screens (Today, Find, Photo, Impact, About),
// plus the Mac/iPad sidebar with your plants.
import { $, $$, esc, data, rise, ROOT, state, plantById, overallStreak, today, thumb } from './core.js?v=5';

const routes = {
  '': () => import('./garden.js?v=5'),
  garden: () => import('./garden.js?v=5'),
  snap: () => import('./garden.js?v=5'),
  find: () => import('./find.js?v=5'),
  plant: () => import('./find.js?v=5'),
  impact: () => import('./impact.js?v=5'),
  sources: () => import('./sources.js?v=5'),
};
const VIEW = { snap: 'snapView', find: 'findView', plant: 'plantView' };
let current = null, routed = false, seq = 0;

// sidebar: your plants with a tiny picture, and the streak under the name
export function renderSide() {
  const list = $('#side-plants'); if (!list) return;
  const here = location.hash.replace(/^#\/?/, '');
  list.innerHTML = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return '';
    const done = e.log.some((l) => l.date === today());
    const cur = here === `plant/${e.id}`;
    return `<li><a href="#/plant/${e.id}"${cur ? ' aria-current="page"' : ''}><img src="${thumb(e.id)}" alt="" width="28" height="28"><span>${esc(p.name)}</span>${done ? '<i class="tick" aria-label="photo taken today"></i>' : ''}</a></li>`;
  }).join('') || '<li class="side-none">Nothing growing yet</li>';
  const n = overallStreak();
  $('#side-streak').textContent = n ? `${n} day streak` : state.garden.length ? 'Take today’s photo' : 'Let’s grow something';
}

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
  document.title = (main.querySelector('h1')?.textContent || 'Today') + ' · Zero Mile';
  if (routed) main.focus({ preventScroll: true });
  routed = true;
  rise(main);
  renderSide();
}
addEventListener('hashchange', route);
addEventListener('zm:garden', renderSide);
$('.skip').addEventListener('click', (e) => { e.preventDefault(); $('#main').focus(); });
route();

// the green fluted glass behind the sidebar header (Mac and iPad only: phones never show the sidebar)
if (matchMedia('(min-width: 700px)').matches) import('./fluted.js?v=5').then(({ fluted }) => fluted($('#side-head'), { ribs: 22 })).catch(() => {});

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('sw.js', ROOT), { scope: ROOT.pathname }).catch(() => {});
