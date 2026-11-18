// Rewards (#/rewards), v2 "Garden LCD": the level readout on Pip's LCD, the streak milestones as a slim pixel row,
// badges as small LCD tiles (dim when locked, lit when earned), and a tidy shop list. Also the top-bar sheets
// (streak, seeds, level) and the celebration screens built from what award() returned. No chests anywhere.
import { $, $$, esc, today, overallStreak, bestStreak, photoDays, savedDays } from './core.js?v=9';
import { art, icon } from './art.js?v=9';
import {
  rewards, level, TITLES, levelNeed, BADGES, BADGE_SEEDS, MILESTONES, MILESTONE_SEEDS, SHOP, SAVER_MAX, saversHeld,
  canBuy, spend, wear, worn, onReward,
} from './rewards.js?v=9';
import { sheet, pip, hatArt, pop, fillAll, celebration, floatGain, haptic, reduced, play } from './fun.js?v=9';

const fmtN = (n) => Number(n).toLocaleString('en-IE');
const dateShort = (d) => new Date(d + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });

// ---------- shared bits ----------
// the XP bar: on paper a thin leaf bar, inside .lcd a pixel-segment bar (css/tokens.css)
export const xpBar = (lv = level()) => `<div class="bar3" role="progressbar" aria-label="XP to level ${lv.n + 1}" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i data-fill="${lv.p.toFixed(3)}"></i></div>`;
// v1 name: the level as a small LCD readout instead of a ring
export const levelRing = (lv = level()) => `<span class="lv-chip lcd px" aria-hidden="true">LV ${lv.n}</span>`;
// the level readout panel (Rewards and the level sheet)
export function levelPanel(lv = level(), { seeds, streak } = {}) {
  return `<div class="lvp">
      <p class="lvp-n"><span class="lvp-lv">LV</span><b>${lv.n}</b></p>
      <div class="lvp-main">
        <p class="lvp-title">${esc(lv.title)}</p>
        ${xpBar(lv)}
        <p class="lvp-xp"><b>${fmtN(lv.xp)}</b> / ${fmtN(lv.to)} XP</p>
      </div>
      ${seeds != null ? `<dl class="lvp-wallet"><div><dt>${art('seed-gem', { size: 16 })}<span class="vh">Seeds</span></dt><dd>${fmtN(seeds)}</dd></div><div><dt>${art('streak-sun', { size: 16 })}<span class="vh">Streak</span></dt><dd>${streak}</dd></div></dl>` : ''}
    </div>`;
}

// the streak milestones: a slim LCD row of pixel numbers; reached ones are lit, the next one blinks
export function milestonePath(n = overallStreak()) {
  const ms = rewards().ms, next = MILESTONES.find((m) => m > n);
  return `<ol class="mrow" aria-label="Streak milestones">${MILESTONES.map((m) => {
    const got = !!ms[m] || n >= m, isNext = m === next;
    const say = got ? 'reached' : isNext ? `${m - n} days to go` : 'not yet';
    return `<li class="${got ? 'on' : ''}${isNext ? ' next' : ''}${m >= 50 ? ' big' : ''}"><b>${m}</b><span>+${MILESTONE_SEEDS[m]}</span><span class="vh">-day streak, ${say}, ${MILESTONE_SEEDS[m]} seeds and a badge</span></li>`;
  }).join('')}</ol>`;
}
// v1 names, kept so old calls don't break: there is nothing to open
export const chestScreen = () => null;
export async function openChestFlow() {}

// the screens for whatever award() just gave (after the photo's own screens)
const gainLine = (xp, seeds) => [xp ? `+${xp} XP` : '', seeds ? `+${seeds} seeds` : ''].filter(Boolean).join('<span aria-hidden="true">  ·  </span>');
export function rewardScreens(out = {}) {
  const s = [];
  for (const q of out.quests || []) s.push({ tone: 'leaf', sound: 'quest', art: art(q.art, { size: 96 }), title: 'Quest done', big: esc(q.label), sub: gainLine(q.xp, q.seeds) });
  if (out.bonus) s.push({ tone: 'leaf', sound: 'quest', art: art('seed-gem', { size: 96 }), title: 'All 3 quests done', big: `<b class="cele-num">+${out.bonus}</b>`, count: { from: 0, to: out.bonus, prefix: '+' }, sub: 'bonus seeds' });
  const msBadges = new Set((out.milestones || []).map((m) => `streak-${m.n}`));
  for (const m of out.milestones || []) s.push({ tone: 'night', sound: 'badge', amber: m.n >= 30, art: art('streak-sun', { size: 96 }), title: `${m.n}-day streak`, big: `<b class="cele-num">+${m.seeds}</b>`, count: { from: 0, to: m.seeds, prefix: '+' }, sub: msBadges.has(`streak-${m.n}`) ? 'seeds and a new badge' : 'seeds' });
  for (const b of out.unlocked || []) {
    if (msBadges.has(b.id)) continue;
    const big = BADGES.find((x) => x.id === b.id)?.big;
    s.push({ tone: 'tomato', sound: 'badge', amber: !!big, art: art('badge-' + b.id, { size: 96 }), title: 'New badge', big: esc(b.name), sub: gainLine(0, BADGE_SEEDS) });
  }
  if (out.levelUp) {
    const L = out.levelUp;
    s.push({ tone: 'leaf', sound: 'level', face: 'thriving', title: `Level ${L.to}`, big: esc(L.title), sub: gainLine(0, L.seeds) });
  }
  return s;
}

// ---------- the three top-bar sheets ----------
export function streakSheet() {
  const n = overallStreak(), best = bestStreak(), photos = photoDays(), kept = savedDays();
  // five weeks ending this week, Monday first
  const end = new Date(); end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  const days = []; for (let i = 34; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); days.push(d); }
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cal = days.map((d) => {
    const k = key(d), did = photos.has(k), sav = !did && kept.has(k), fut = k > today(), isT = k === today();
    return `<li class="${did ? 'did' : ''}${sav ? ' sav' : ''}${fut ? ' fut' : ''}${isT ? ' tdy' : ''}"><span class="vh">${dateShort(k)}${did ? ', photo' : sav ? ', saved by a watering can' : ''}</span><span aria-hidden="true">${d.getDate()}</span></li>`;
  }).join('');
  const cans = saversHeld();
  sheet({ title: 'Your streak', body: `
    <div class="lcd sh-lcd">
      <p class="sh-big">${art('streak-sun', { size: 32 })}<b>${n}</b><span>day streak</span></p>
      <ol class="pxcal" aria-label="Last five weeks">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<li class="hd" aria-hidden="true">${x}</li>`).join('')}${cal}</ol>
    </div>
    <dl class="sh-facts"><div><dt>Best</dt><dd>${best} days</dd></div><div><dt>Watering cans</dt><dd>${cans} of ${SAVER_MAX}</dd></div></dl>
    <a class="b3 b3-wide" href="#/snap">${photos.has(today()) ? 'Snap another' : 'Take today’s photo'}</a>` });
}
export function seedSheet() {
  const r = rewards();
  const { el } = sheet({ title: 'Seeds', body: `
    <div class="lcd sh-lcd"><p class="sh-big">${art('seed-gem', { size: 32 })}<b>${fmtN(r.seeds)}</b><span>seeds</span></p></div>
    <ul class="earn-list">
      <li>${icon('check', { size: 20 })}<span>Daily quests, and a bonus for all 3</span></li>
      <li>${icon('sun', { size: 20 })}<span>Streak milestones</span></li>
      <li>${icon('star', { size: 20 })}<span>New badges and levels</span></li>
    </ul>
    <ul class="shop one">${shopItem(SHOP[0])}</ul>
    <a class="b3 b3-white b3-wide" href="#/rewards/shop">Open the shop</a>` });
  bindShop(el, () => { el.querySelector('.sh-big b').textContent = fmtN(rewards().seeds); });
}
export function levelSheet() {
  const lv = level();
  const { el } = sheet({ title: `Level ${lv.n}`, body: `
    <div class="lcd sh-lcd">${levelPanel(lv)}</div>
    <ol class="titles">${TITLES.map((t, k) => `<li class="${k + 1 <= lv.n ? 'got' : ''}${k + 1 === lv.n ? ' cur' : ''}"><b>${k + 1}</b><span>${t}</span><em>${fmtN(levelNeed(k))} XP</em></li>`).join('')}</ol>` });
  fillAll(el);
}

// ---------- shop ----------
function itemArt(it, size = 48) {
  if (it.kind === 'saver') return `<span class="si-px lcd">${art('can-freeze', { size: 24 })}</span>`;
  if (it.kind === 'hat') return hatArt(it.id, size);
  return `<svg class="art swatch" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M13 24h38l-5 30a3 3 0 0 1-3 2.5H21a3 3 0 0 1-3-2.5z" fill="${it.color}"/><rect x="9" y="15" width="46" height="11" rx="4" fill="${it.shade}"/></svg>`;
}
function shopItem(it, { preview = false } = {}) {
  const r = rewards(), owned = r.owned.includes(it.id), on = r.wear[it.kind] === it.id;
  const c = canBuy(it.id);
  const price = `${art('seed-gem', { size: 16 })}<span>${it.price}</span><span class="vh"> seeds, buy the ${esc(it.name)}</span>`;
  const btn = it.kind === 'saver' || !owned
    ? `<button class="b3 b3-sm si-buy" type="button" data-buy="${it.id}"${c.ok ? '' : ' aria-disabled="true"'}>${price}</button>`
    : `<button class="b3 b3-sm b3-white" type="button" data-wear="${it.id}" aria-pressed="${on}">${on ? 'Worn' : 'Wear'}</button>`;
  const sub = it.kind === 'saver' ? `${saversHeld()} of ${SAVER_MAX} held` : owned ? (on ? 'Wearing' : 'Yours') : it.kind === 'hat' ? 'Hat for Pip' : 'Pot colour';
  const pic = preview && it.kind !== 'saver' ? `<button class="si-art" type="button" data-try="${it.id}" aria-label="Try the ${esc(it.name)} on Pip">${itemArt(it)}</button>` : `<span class="si-art">${itemArt(it)}</span>`;
  return `<li class="si${on ? ' on' : ''}" data-item="${it.id}">${pic}<p class="si-txt"><b>${esc(it.name)}</b><span class="si-sub">${sub}</span></p>${btn}</li>`;
}
function bindShop(root, after) {
  root.addEventListener('click', (e) => {
    const buy = e.target.closest('[data-buy]'), wr = e.target.closest('[data-wear]');
    if (buy) {
      const id = buy.dataset.buy, c = canBuy(id);
      if (!c.ok) { floatGain(buy, c.why === 'seeds' ? `${c.short} more seeds` : c.why === 'full' ? `${SAVER_MAX} is the most` : 'Yours', 'tomato'); haptic(30); return; }
      spend(id); floatGain(buy, `−${SHOP.find((x) => x.id === id).price}`, 'berry'); haptic(14); play('buy');
      redrawItems(root); after?.(id);
    }
    if (wr) {
      const it = SHOP.find((x) => x.id === wr.dataset.wear), r = rewards();
      wear(it.kind, r.wear[it.kind] === it.id ? null : it.id); play('toggle'); redrawItems(root); after?.(it.id);
    }
  });
}
function redrawItems(root) {
  $$('[data-item]', root).forEach((li) => { const it = SHOP.find((x) => x.id === li.dataset.item); const t = document.createElement('div'); t.innerHTML = shopItem(it, { preview: !!li.querySelector('[data-try]') }); li.replaceWith(t.firstElementChild); });
}

// ================= the Rewards screen =================
export default async function rewardsView(main, arg) {
  let look = null; // a shop preview on Pip
  const draw = () => {
    const r = rewards(), lv = level(), n = overallStreak();
    const got = new Map(r.badges.map((b) => [b.id, b.date]));
    main.innerHTML = `
    <div class="page rw ombre" data-tone="rewards">
      <header class="page-head"><h1>Rewards</h1></header>
      <div class="rw-grid">
        <section class="rw-level lcd" aria-label="Your level">${levelPanel(lv, { seeds: r.seeds, streak: n })}</section>
        <section class="rw-path lcd" aria-labelledby="path-t">
          <h2 id="path-t" class="lcd-h">Streak milestones</h2>
          ${milestonePath(n)}
          <p class="lcd-note">${MILESTONES.find((m) => m > n) ? `${MILESTONES.find((m) => m > n) - n} days to the next` : 'Every milestone reached'}</p>
        </section>
        <section class="c3 rw-badges" aria-labelledby="badges-t">
          <div class="card-head"><h2 id="badges-t">Badges</h2><span class="count">${got.size} of ${BADGES.length}</span></div>
          <ul class="bgrid">${BADGES.map((b) => { const on = got.has(b.id); return `<li class="${on ? 'on' : 'off'}${b.big ? ' big' : ''}"><span class="b-tile lcd">${art('badge-' + b.id, { size: 32 })}</span><b>${esc(b.name)}</b><span class="vh">${on ? `, earned ${dateShort(got.get(b.id))}` : ', not yet earned'}</span></li>`; }).join('')}</ul>
        </section>
        <section class="c3 rw-shop" id="shop" aria-labelledby="shop-t">
          <div class="card-head"><h2 id="shop-t">Shop</h2><span class="count">${art('seed-gem', { size: 16 })}<b id="shop-seeds">${fmtN(r.seeds)}</b><span class="vh"> seeds</span></span></div>
          <div class="shop-stage"><div class="shop-pip" id="shop-pip">${pip('wave', { size: 132, look: look || undefined })}</div><p class="shop-hint">Tap a pot or hat to try it on Pip</p></div>
          <ul class="shop">${SHOP.map((it) => shopItem(it, { preview: true })).join('')}</ul>
        </section>
      </div>
    </div>`;
    fillAll(main);
    const shop = $('.rw-shop', main);
    bindShop(shop, () => { $('#shop-seeds').textContent = fmtN(rewards().seeds); look = null; $('#shop-pip').innerHTML = pip('cheer', { size: 132 }); pop($('#shop-pip')); });
    shop.addEventListener('click', (e) => {
      const t = e.target.closest('[data-try]'); if (!t) return;
      const it = SHOP.find((x) => x.id === t.dataset.try), w = worn();
      look = { pot: it.kind === 'pot' ? it : w.pot, hat: it.kind === 'hat' ? it.id : w.hat };
      $('#shop-pip').innerHTML = pip('wow', { size: 132, look }); pop($('#shop-pip'));
      $$('[data-try]', shop).forEach((b) => b.closest('.si').classList.toggle('trying', b === t));
    });
  };
  draw();
  if (arg === 'shop') requestAnimationFrame(() => $('#shop')?.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }));
  const off = onReward((o, kind) => { if (kind === 'check') draw(); });
  return { unmount() { off(); } };
}
