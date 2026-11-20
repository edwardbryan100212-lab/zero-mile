// Zero Mile app: the router for the daily-use screens (Today, Find, Photo, Stickers (#/rewards), and Impact, About
// and Admin under More), the top bar of stats on a phone, the Mac/iPad sidebar, and the stickers that pop up anywhere.
import { $, $$, esc, fmt, data, rise, ROOT, state, plantById, overallStreak, today, thumb, useSaverIfNeeded, toast, photoDays, isTree } from './core.js?v=9';
import { initPress, enter, sheet, celebration } from './fun.js?v=9';
import { kmCancelled, odometer } from './journey.js?v=1';
import { icon } from './art.js?v=9';
import { produceIcon } from './produce.js?v=9';
import { award, check, onReward } from './rewards.js?v=9';
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
  sow: () => import('./sow.js?v=9'),
  timelapse: () => import('./timelapse.js?v=9'),
};
const VIEW = { snap: 'snapView', find: 'findView', plant: 'plantView' };
const MORE = ['impact', 'sources', 'admin'];
let current = null, routed = false, seq = 0;
const RV = () => import('./rewards-view.js?v=9');

// ---------- the stats: the streak in days and the odometer in km cancelled (top bar on a phone, sidebar on a Mac) ----------
export function renderStats() {
  const n = overallStreak(), snapped = photoDays().has(today()), km = kmCancelled();
  const html = (where) => `
    <button class="tbs st-days${snapped ? '' : ' dim'}" type="button" data-sheet="streak" aria-label="${n} day streak${snapped ? '' : ', no photo yet today'}. What is this?"><span class="st-stamp" aria-hidden="true"><b>${n}</b></span><span class="st-l">${where === 'side' ? `day${n === 1 ? '' : 's'} in a row` : 'days'}</span></button>
    <button class="tbs st-km" type="button" data-sheet="km" aria-label="${fmt(km)} km cancelled. What is this?">${odometer(km, { digits: where === 'side' ? 6 : 5 })}${where === 'side' ? '<span class="st-l">cancelled</span>' : ''}</button>`;
  const top = $('#top-stats'), side = $('#side-stats');
  if (top) top.innerHTML = html('top');
  if (side) side.innerHTML = html('side');
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-sheet]'); if (!b) return;
  const V = await RV();
  ({ streak: V.streakSheet, km: V.kmSheet })[b.dataset.sheet]?.();
});

// ---------- More: Impact, About and Admin ----------
$('#more-btn').addEventListener('click', () => sheet({ title: 'More', body: `
  <ul class="more-list">
    <li><a class="more-row" href="#/impact">${icon('impact')}<b>Impact</b><span>Trips cancelled and CO₂</span>${icon('chevron', { size: 18, cls: 'more-go' })}</a></li>
    <li><a class="more-row" href="#/sources">${icon('about')}<b>About</b><span>Sources and settings</span>${icon('chevron', { size: 18, cls: 'more-go' })}</a></li>
    <li><a class="more-row" href="#/admin">${icon('admin')}<b>Admin</b><span>Demo tools</span>${icon('chevron', { size: 18, cls: 'more-go' })}</a></li>
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
    return `<li><a href="#/plant/${e.id}"${cur ? ' aria-current="page"' : ''}>${produceIcon(e.id, { size: 28, group: p.group })}<span>${esc(p.name)}</span>${done ? '<i class="tick" aria-label="photo taken today"></i>' : ''}</a></li>`;
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
  let mod;
  try { mod = await routes[key](); }
  catch {
    // offline and this screen's code was never saved on this device: say so instead of leaving the old screen up
    if (my !== seq) return;
    current?.unmount?.(); current = null;
    $('#main').innerHTML = `<div class="page"><header class="page-head"><h1>Can’t open this yet</h1></header>
      <section class="c3"><p>You seem to be offline, and this screen isn’t saved on this device yet. Open it once with a connection and it will work offline after that.</p>
      <p><a class="b3" href="#/">Back to Today</a></p></section></div>`;
    document.title = 'Offline · Zero Mile'; routed = true; renderSide();
    return;
  }
  if (my !== seq) return; // a newer navigation won
  current?.unmount?.();
  const main = $('#main');
  main.innerHTML = '';
  document.body.dataset.view = key || 'garden';
  const navKey = key === 'plant' ? 'find' : key || 'garden';
  $$('[data-nav]').forEach((a) => {
    const on = a.dataset.nav === navKey || (a.dataset.nav === 'more' && MORE.includes(navKey) && !a.closest('.side'));
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  current = await mod[VIEW[key] || 'default'](main, decodeURIComponent(arg || ''));
  if (!key || key === 'garden') { if (needsOnboarding()) onboard(); else { todayNudge(main); const nb = $('.nudge3', main), cs = $('#care-slot', main) || $('.t-plants', main); if (nb && cs) cs.after(nb); } } // first run, or the reminder card (js/onboard.js)
  if (key === 'sources') settingsRow(main); // the reminder row in Settings
  import('./care.js?v=9').then((c) => { if (my === seq) c.autoMount(main, key, decodeURIComponent(arg || '')); }).catch(() => {}); // care today, plant care (js/care.js)
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
// the stats update, and anything new (a sticker, a cancelled trip, something Pip unlocked) gets its celebration.
// The photo builds its own sequence, so it is left out here; admin stays quiet (a toast), and so does onboarding,
// which shows the first sticker itself.
onReward(async (out, kind) => {
  renderStats();
  if (!out || kind === 'check' || kind === 'wear' || kind === 'photo') return;
  const got = (out.stickers?.length || 0) + (out.unlocks?.length || 0);
  if (!got && !(out.km > 0 && !(kind === 'harvest' && location.hash.startsWith('#/plant/')))) return;
  if (document.querySelector('.ob')) return;
  if (location.hash.startsWith('#/admin')) {
    if (out.km > 0) toast(`Trip cancelled: ${fmt(out.km)} km. Total ${fmt(out.kmTo)} km.`);
    else if (got) toast(got > 1 ? `${got} new stickers` : 'New sticker');
    dispatchEvent(new Event('zm:rewards')); return;
  }
  const onPlant = kind === 'harvest' && location.hash.startsWith('#/plant/'); // the plant page plays the cancel itself
  const V = await RV(), s = V.rewardScreens(out, { trip: !onPlant });
  if (s.length) { await celebration(s); renderStats(); dispatchEvent(new Event('zm:rewards')); }
});
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register(new URL('sw.js', ROOT), { scope: ROOT.pathname }).catch(() => {});
