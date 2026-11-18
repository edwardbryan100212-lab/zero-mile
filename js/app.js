// Zero Mile app: the router for the daily-use screens (Today, Find, Photo, Rewards, and Impact, About and Admin
// under More), the top bar of stats on a phone, the Mac/iPad sidebar, and the rewards that pop up anywhere.
import { $, $$, esc, data, rise, ROOT, state, plantById, overallStreak, today, thumb, useSaverIfNeeded, toast, photoDays, isTree } from './core.js?v=9';
import { initPress, enter, hop, sheet, pop, floatGain, celebration } from './fun.js?v=9';
import { art } from './art.js?v=9';
import { rewards, level, award, check, onReward } from './rewards.js?v=9';
import { needsOnboarding, onboard, welcomeBack, todayNudge, settingsRow, photoTimeNudge } from './onboard.js?v=9';

const routes = {
  '': () => import('./garden.js?v=9'),
  garden: () => import('./garden.js?v=9'),
  snap: () => import('./garden.js?v=9'),
  find: () => import('./find.js?v=9'),
  plant: () => import('./find.js?v=9'),
  rewards: () => import('./rewards-view.js?v=9'),
  impact: () => import('./impact.js?v=9'),
  sources: () => import('./sources.js?v=9'),
  admin: () => import('./admin.js?v=9'),
};
const VIEW = { snap: 'snapView', find: 'findView', plant: 'plantView' };
const MORE = ['impact', 'sources', 'admin'];
let current = null, routed = false, seq = 0;
const RV = () => import('./rewards-view.js?v=9');

// ---------- the stats: streak sun, seeds and the XP ring (top bar on a phone, top of the sidebar on a Mac) ----------
const nf = (n) => Number(n).toLocaleString('en-IE');
export function renderStats() {
  const n = overallStreak(), r = rewards(), lv = level(), snapped = photoDays().has(today());
  const html = (where) => `
    <button class="tbs st-sun${snapped ? '' : ' dim'}" type="button" data-sheet="streak" aria-label="${n} day streak${snapped ? '' : ', no photo yet today'}">${art('streak-sun', { size: 30 })}<b>${n}</b></button>
    <button class="tbs st-seed" type="button" data-sheet="seeds" aria-label="${nf(r.seeds)} seeds">${art('seed-gem', { size: 28 })}<b>${nf(r.seeds)}</b></button>
    <button class="tbs st-lvl" type="button" data-sheet="level" aria-label="Level ${lv.n}, ${esc(lv.title)}">${ringSvg(lv)}${where === 'side' ? `<b>${esc(lv.title)}</b>` : ''}</button>`;
  const top = $('#top-stats'), side = $('#side-stats');
  if (top) top.innerHTML = html('top');
  if (side) side.innerHTML = html('side');
}
function ringSvg(lv) {
  const r = 15, c = 2 * Math.PI * r;
  return `<svg class="ring" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true"><circle cx="19" cy="19" r="${r}" fill="#fff" stroke="var(--line)" stroke-width="5"/><circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--sun)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - lv.p)).toFixed(1)}" transform="rotate(-90 19 19)"/><text x="19" y="24" text-anchor="middle" font-family="Nunito, ui-rounded, sans-serif" font-weight="900" font-size="13" fill="var(--ink)">${lv.n}</text></svg>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-sheet]'); if (!b) return;
  const V = await RV();
  ({ streak: V.streakSheet, seeds: V.seedSheet, level: V.levelSheet })[b.dataset.sheet]?.();
});

// ---------- More: Impact, About and Admin ----------
$('#more-btn').addEventListener('click', () => sheet({ title: 'More', body: `
  <ul class="more-list">
    <li><a class="c3 more-row" href="#/impact">${art('cloud-co2', { size: 48 })}<b>Impact</b></a></li>
    <li><a class="c3 more-row" href="#/sources">${art('map-pin', { size: 48 })}<b>About</b></a></li>
    <li><a class="c3 more-row" href="#/admin">${art('calendar', { size: 48 })}<b>Admin</b></a></li>
  </ul>` }));

// sidebar: your plants with a tiny picture
export function renderSide() {
  renderStats();
  const list = $('#side-plants'); if (!list) return;
  const here = location.hash.replace(/^#\/?/, '');
  list.innerHTML = state.garden.map((e) => {
    const p = plantById(e.id); if (!p) return '';
    const done = e.log.some((l) => l.date === today());
    const cur = here === `plant/${e.id}`;
    return `<li><a href="#/plant/${e.id}"${cur ? ' aria-current="page"' : ''}><img src="${thumb(e.id)}" alt="" width="28" height="28"><span>${esc(p.name)}</span>${done ? '<i class="tick" aria-label="photo taken today"></i>' : ''}</a></li>`;
  }).join('') || '<li class="side-none">Nothing growing yet</li>';
}

async function route() {
  if (location.hash && !location.hash.startsWith('#/')) return; // in-page anchors such as #main
  const my = ++seq;
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  const key = routes[name] ? name : '';
  await data();
  if (!routed) {
    // the streak saver: if yesterday was missed, a watering can covers it
    if (useSaverIfNeeded()) setTimeout(() => toast('Your watering can saved your streak!'), 900);
    check();
    // first run: Pip's onboarding over Today; otherwise a "welcome back" after 2+ days away, and photo time
    if (!needsOnboarding()) { welcomeBack(); photoTimeNudge(); }
  }
  const mod = await routes[key]();
  if (my !== seq) return; // a newer navigation won
  current?.unmount?.();
  const main = $('#main');
  main.innerHTML = '';
  document.body.dataset.view = key || 'garden';
  const navKey = key === 'plant' ? 'find' : key || 'garden';
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === navKey || (a.dataset.nav === 'more' && MORE.includes(navKey) && !a.closest('.side'));
    if (on) { if (routed && a.getAttribute('aria-current') !== 'page') hop(a.querySelector('svg')); a.setAttribute('aria-current', 'page'); }
    else a.removeAttribute('aria-current');
  });
  current = await mod[VIEW[key] || 'default'](main, decodeURIComponent(arg || ''));
  if (!key || key === 'garden') { if (needsOnboarding()) onboard(); else todayNudge(main); } // first run, or the reminder card (js/onboard.js)
  if (key === 'sources') settingsRow(main); // the reminder row in Settings
  enter(main.firstElementChild);
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.title = (main.querySelector('h1')?.textContent || 'Today') + ' · Zero Mile';
  if (routed) main.focus({ preventScroll: true });
  routed = true;
  rise(main);
  renderSide();
}
addEventListener('hashchange', route);
initPress();
addEventListener('zm:garden', renderSide);
$('.skip').addEventListener('click', (e) => { e.preventDefault(); $('#main').focus(); });

// ---------- rewards from anywhere ----------
// adding a plant or a tree (Find and the plant page call addToGarden)
addEventListener('zm:added', (e) => { const p = plantById(e.detail); award(p && isTree(p) ? 'tree' : 'plant', { id: e.detail }); });
// the stats bump, XP floats up from the ring, and anything big (a quest, a chest, a badge, a level) gets its
// celebration. The photo builds its own sequence, so it is left out here.
onReward(async (out, kind) => {
  renderStats();
  if (!out || kind === 'check' || kind === 'wear') return;
  const vis = [...$$('.st-lvl')].find((b) => b.offsetParent);
  if (out.xp > 0 && kind !== 'photo') { floatGain(vis, `+${out.xp} XP`, 'sun'); pop(vis, { from: .8 }); }
  if (kind === 'photo' || kind === 'chest' || kind === 'spend') return;
  // browsing (learning about plants) and the admin tools: a finished quest is a small banner, not a full-screen stop.
  // Badges, level-ups and chests still get their moment, except in admin where everything stays quiet.
  const quiet = location.hash.startsWith('#/admin') || (kind === 'learn' && !out.levelUp && !out.unlocked?.length && !out.chest);
  if (quiet) {
    const q = out.quests || [];
    if (q.length) toast(`Quest done: ${q.map((x) => x.label).join(', ')}! +${q.reduce((a, x) => a + (x.xp || 0), 0)} XP`);
    else if (out.unlocked?.length || out.levelUp) toast(out.levelUp ? `Level ${out.levelUp.to}: ${out.levelUp.title}!` : 'New badge unlocked!');
    renderStats(); dispatchEvent(new Event('zm:rewards')); return;
  }
  const V = await RV(), s = V.rewardScreens(out);
  if (s.length) { await celebration(s); renderStats(); dispatchEvent(new Event('zm:rewards')); }
});
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('sw.js', ROOT), { scope: ROOT.pathname }).catch(() => {});
