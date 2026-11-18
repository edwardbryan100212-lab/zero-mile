// Rewards (#/rewards): level and XP, the streak path of milestone chests, badges, the shop with Pip's cosmetics and
// chest history. Also the top-bar sheets (streak calendar, seeds and shop, level) and the celebration screens built
// from what award() returned.
import { $, $$, esc, state, today, overallStreak, bestStreak, photoDays, savedDays } from './core.js?v=9';
import { art } from './art.js?v=9';
import {
  rewards, level, titleOf, TITLES, levelNeed, BADGES, BADGE_SEEDS, MILESTONES, MILESTONE_SEEDS, SHOP, SAVER_MAX, saversHeld,
  canBuy, spend, wear, worn, chestsReady, openChest, onReward,
} from './rewards.js?v=9';
import { sheet, pip, hatArt, pop, countUp, fillAll, celebration, burstSeeds, floatGain, haptic, reduced } from './fun.js?v=9';

const fmtN = (n) => Number(n).toLocaleString('en-IE');
const dateShort = (d) => new Date(d + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });

// ---------- shared bits ----------
// the XP ring: a circle that fills to the next level, the level number inside
export function levelRing(lv = level(), size = 44, cls = '') {
  const r = 18, c = 2 * Math.PI * r;
  return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" fill="#fff" stroke="var(--line)" stroke-width="5"/><circle class="ring-fill" cx="22" cy="22" r="${r}" fill="none" stroke="var(--sun)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - lv.p)).toFixed(1)}" transform="rotate(-90 22 22)"/><text x="22" y="27" text-anchor="middle" font-family="Nunito, ui-rounded, sans-serif" font-weight="900" font-size="14" fill="var(--ink)">${lv.n}</text></svg>`;
}
export const xpBar = (lv = level()) => `<div class="bar3" style="--c:var(--sun)" role="progressbar" aria-label="XP to level ${lv.n + 1}" aria-valuemin="0" aria-valuemax="${lv.need}" aria-valuenow="${lv.into}"><i data-fill="${lv.p.toFixed(3)}"></i></div>`;

// the streak path: one stop per milestone, with an open, ready (shaking) or locked chest
export function milestonePath(n = overallStreak(), { compact = false } = {}) {
  const ms = rewards().ms;
  const next = MILESTONES.find((m) => m > n);
  return `<ol class="mpath${compact ? ' compact' : ''}" aria-label="Streak chests">${MILESTONES.map((m) => {
    const st = ms[m] === 'open' ? 'open' : ms[m] === 'ready' ? 'ready' : 'locked';
    const isNext = m === next;
    const say = st === 'open' ? 'opened' : st === 'ready' ? 'ready to open' : isNext ? `${m - n} days to go` : 'locked';
    const inner = `${art(st === 'open' ? 'chest-open' : 'chest', { size: compact ? 38 : 56, cls: st === 'locked' ? 'locked' : '' })}${st === 'locked' ? `<span class="mp-lock">${art('lock', { size: 20 })}</span>` : ''}`;
    return `<li class="mp ${st}${isNext ? ' next' : ''}">${st === 'ready' ? `<button class="mp-chest shake" type="button" data-chest="ms:${m}" aria-label="${m}-day chest, ${say}">${inner}</button>` : `<span class="mp-chest" role="img" aria-label="${m}-day chest, ${say}">${inner}</span>`}<b>${m}</b></li>`;
  }).join('')}</ol>`;
}
// open a chest with its own celebration screen, from anywhere
export function chestScreen(c) {
  const title = c.kind === 'milestone' || String(c.key).startsWith('ms:') ? `${c.n ?? c.key.slice(3)}-day chest` : 'Daily chest';
  return {
    tone: 'berry', confetti: false, title, art: `<div class="cele-chest shake">${art('chest', { size: 168 })}</div>`, sub: 'Tap to open', cta: 'Open',
    onContinue(el, next) {
      const got = openChest(c.key); if (!got) return next();
      const box = el.querySelector('.cele-chest'); box.classList.remove('shake'); box.innerHTML = art('chest-open', { size: 168 });
      pop(box, { from: .85 }); burstSeeds(box, art('seed-gem', { size: 28 }), 14); haptic([12, 40, 18]);
      el.querySelector('.cele-sub').innerHTML = `<span class="cele-seeds">${art('seed-gem', { size: 34 })}<b id="cs-n">+0</b></span>`;
      countUp(el.querySelector('#cs-n'), got.seeds, { dur: 700 }); setTimeout(() => { const b = el.querySelector('#cs-n'); if (b) b.textContent = `+${got.seeds}`; }, reduced() ? 0 : 720);
      const go = el.querySelector('.cele-go'); go.textContent = 'Continue';
      // the next tap moves on
      const again = go.cloneNode(true); go.replaceWith(again); again.addEventListener('click', next); again.focus({ preventScroll: true });
    },
  };
}
export async function openChestFlow(key) {
  const c = chestsReady().find((x) => x.key === key); if (!c) return;
  await celebration([chestScreen(c)]);
}

// the screens for whatever award() just gave (after the photo's own screens)
export function rewardScreens(out = {}) {
  const s = [];
  for (const q of out.quests || []) s.push({ tone: 'leaf', art: art(q.art, { size: 132 }), title: 'Quest done!', big: esc(q.label), sub: `<span class="gainrow"><span class="g-xp">${art('xp-bolt', { size: 26 })}+${q.xp} XP</span><span class="g-seed">${art('seed-gem', { size: 26 })}+${q.seeds}</span></span>` });
  if (out.chest) s.push(chestScreen(out.chest));
  for (const m of out.milestones || []) s.push(chestScreen({ key: m.key, kind: 'milestone', n: m.n }));
  for (const b of out.unlocked || []) s.push({ tone: 'tomato', art: `<div class="badge-pop">${art('badge-' + b.id, { size: 150 })}</div>`, title: 'New badge!', big: esc(b.name), sub: `<span class="g-seed">${art('seed-gem', { size: 26 })}+${BADGE_SEEDS}</span>` });
  if (out.levelUp) {
    const L = out.levelUp;
    s.push({ tone: 'leaf', art: `<div class="lvl-pop">${pip('party', { size: 150, mood: 'happy' })}</div>`, title: `Level ${L.to}!`, big: esc(L.title), sub: `<span class="g-seed">${art('seed-gem', { size: 26 })}+${L.seeds}</span>`, confetti: 70 });
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
    return `<li class="${did ? 'did' : ''}${sav ? ' sav' : ''}${fut ? ' fut' : ''}${isT ? ' tdy' : ''}"><span class="vh">${dateShort(k)}${did ? ', photo' : sav ? ', saved by a can' : ''}</span><span aria-hidden="true">${did ? art('streak-sun', { size: 26 }) : sav ? art('can-freeze', { size: 24 }) : d.getDate()}</span></li>`;
  }).join('');
  const cans = saversHeld();
  sheet({ title: 'Your streak', body: `
    <div class="sh-hero tone-sun">${art('streak-sun', { size: 72 })}<p><b>${n}</b><span>day streak</span></p></div>
    <ol class="cal" aria-label="Last five weeks">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<li class="hd" aria-hidden="true">${x}</li>`).join('')}${cal}</ol>
    <div class="sh-row"><span class="chipx">${art('trophy', { size: 26 })}Best ${best}</span><span class="chipx">${art('can-freeze', { size: 26 })}${cans}/${SAVER_MAX} cans</span></div>
    <a class="b3 b3-wide" href="#/snap">${n && photos.has(today()) ? 'Snap another' : 'Take today’s photo'}</a>` });
}
export function seedSheet() {
  const r = rewards();
  const { el } = sheet({ title: 'Seeds', body: `
    <div class="sh-hero tone-berry">${art('seed-gem', { size: 64 })}<p><b>${fmtN(r.seeds)}</b><span>seeds</span></p></div>
    <ul class="earn-list"><li>${art('chest', { size: 36 })}<span>Chests</span></li><li>${art('quest-photo', { size: 36 })}<span>Quests</span></li><li>${art('star', { size: 36 })}<span>Level ups</span></li></ul>
    <ul class="shop one">${shopItem(SHOP[0])}</ul>
    <a class="b3 b3-wide" href="#/rewards/shop">Open the shop</a>` });
  bindShop(el, () => { el.querySelector('.sh-hero b').textContent = fmtN(rewards().seeds); });
}
export function levelSheet() {
  const lv = level();
  const { el } = sheet({ title: `Level ${lv.n}`, body: `
    <div class="sh-hero tone-leaf">${levelRing(lv, 76)}<p><b>${esc(lv.title)}</b><span>${fmtN(lv.to - lv.xp)} XP to level ${lv.n + 1}</span></p></div>
    ${xpBar(lv)}
    <ol class="titles">${TITLES.map((t, k) => `<li class="${k + 1 <= lv.n ? 'got' : ''}${k + 1 === lv.n ? ' cur' : ''}"><b>${k + 1}</b><span>${t}</span><em>${fmtN(levelNeed(k))} XP</em></li>`).join('')}</ol>` });
  fillAll(el);
}

// ---------- shop ----------
function itemArt(it, size = 64) {
  if (it.kind === 'saver') return art('can-freeze', { size });
  if (it.kind === 'hat') return hatArt(it.id, size);
  return `<svg class="art swatch" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><path d="M12 22h40l-6 34H18z" fill="${it.color}"/><rect x="8" y="16" width="48" height="10" rx="5" fill="${it.shade}"/><path d="M20 32l2 16" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".35"/></svg>`;
}
function shopItem(it, { preview = false } = {}) {
  const r = rewards(), owned = r.owned.includes(it.id), on = r.wear[it.kind] === it.id;
  const c = canBuy(it.id);
  const btn = it.kind === 'saver'
    ? `<button class="b3" type="button" data-buy="${it.id}"${c.ok ? '' : ' aria-disabled="true"'}>${art('seed-gem', { size: 22 })}${it.price}</button>`
    : owned ? `<button class="b3 ${on ? 'b3-white' : ''}" type="button" data-wear="${it.id}" aria-pressed="${on}">${on ? 'Worn' : 'Wear'}</button>`
      : `<button class="b3" type="button" data-buy="${it.id}"${c.ok ? '' : ' aria-disabled="true"'}>${art('seed-gem', { size: 22 })}${it.price}</button>`;
  const extra = it.kind === 'saver' ? `<span class="si-sub">${saversHeld()}/${SAVER_MAX} held</span>` : owned ? '<span class="si-sub">Yours</span>' : '';
  return `<li class="si c3${on ? ' on' : ''}" data-item="${it.id}">${preview && it.kind !== 'saver' ? `<button class="si-art" type="button" data-try="${it.id}" aria-label="Try the ${esc(it.name)} on Pip">${itemArt(it)}</button>` : `<span class="si-art">${itemArt(it)}</span>`}<b>${esc(it.name)}</b>${extra}${btn}</li>`;
}
function bindShop(root, after) {
  root.addEventListener('click', (e) => {
    const buy = e.target.closest('[data-buy]'), wr = e.target.closest('[data-wear]');
    if (buy) {
      const id = buy.dataset.buy, c = canBuy(id);
      if (!c.ok) { floatGain(buy, c.why === 'seeds' ? `${c.short} more seeds` : c.why === 'full' ? `${SAVER_MAX} is the most` : 'Yours', 'tomato'); haptic(30); return; }
      spend(id); floatGain(buy, `−${SHOP.find((x) => x.id === id).price}`, 'berry'); haptic(14);
      redrawItems(root); after?.(id);
    }
    if (wr) {
      const it = SHOP.find((x) => x.id === wr.dataset.wear), r = rewards();
      wear(it.kind, r.wear[it.kind] === it.id ? null : it.id); redrawItems(root); after?.(it.id);
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
    const ready = chestsReady();
    main.innerHTML = `
    <div class="page rw">
      <header class="page-head"><h1>Rewards</h1></header>
      <section class="rw-hero c3" aria-label="Your level">
        <div class="rw-pip">${pip(ready.length ? 'point' : 'proud', { size: 132, mood: 'happy' })}</div>
        <div class="rw-lvl">
          <p class="rw-title">${levelRing(lv, 56)}<span><b>Level ${lv.n}</b><em>${esc(lv.title)}</em></span></p>
          ${xpBar(lv)}
          <p class="rw-xp"><b data-count="${lv.xp}">${fmtN(lv.xp)}</b> / ${fmtN(lv.to)} XP</p>
        </div>
        <div class="rw-wallet"><span class="chipx">${art('seed-gem', { size: 28 })}<b>${fmtN(r.seeds)}</b></span><span class="chipx">${art('streak-sun', { size: 28 })}<b>${n}</b></span></div>
      </section>

      <section class="c3 rw-path" aria-labelledby="path-t">
        <div class="card-head"><h2 id="path-t">Streak chests</h2>${ready.length ? `<span class="tag-ready">${ready.length} ready</span>` : ''}</div>
        ${milestonePath(n)}
        ${ready.filter((c) => c.kind === 'daily').map((c) => `<button class="b3 b3-sun b3-wide" type="button" data-chest="${c.key}">${art('chest', { size: 28 })}Open daily chest</button>`).join('')}
      </section>

      <section class="c3 rw-badges" aria-labelledby="badges-t">
        <div class="card-head"><h2 id="badges-t">Badges</h2><span class="count">${got.size}/${BADGES.length}</span></div>
        <ul class="bgrid">${BADGES.map((b) => { const on = got.has(b.id); return `<li class="${on ? 'on' : 'off'}">${art('badge-' + b.id, { size: 72, cls: on ? '' : 'locked' })}${on ? '' : `<span class="b-lock">${art('lock', { size: 22 })}</span>`}<b>${esc(b.name)}</b><span class="vh">${on ? `, earned ${dateShort(got.get(b.id))}` : ', locked'}</span></li>`; }).join('')}</ul>
      </section>

      <section class="c3 rw-shop" id="shop" aria-labelledby="shop-t">
        <div class="card-head"><h2 id="shop-t">Shop</h2><span class="chipx">${art('seed-gem', { size: 22 })}<b id="shop-seeds">${fmtN(r.seeds)}</b></span></div>
        <div class="shop-stage"><div class="shop-pip" id="shop-pip">${pip('wave', { size: 150, look: look || undefined })}</div><p class="shop-hint">Tap a pot or hat to try it</p></div>
        <ul class="shop">${SHOP.map((it) => shopItem(it, { preview: true })).join('')}</ul>
      </section>

      <section class="c3 rw-hist" aria-labelledby="hist-t">
        <div class="card-head"><h2 id="hist-t">Chests opened</h2></div>
        ${r.chests.length ? `<ul class="hist">${r.chests.slice(0, 12).map((c) => `<li>${art('chest-open', { size: 40 })}<b>${c.kind === 'milestone' ? `${c.n}-day chest` : 'Daily chest'}</b><span>${dateShort(c.date)}</span><em>${art('seed-gem', { size: 20 })}+${c.seeds}</em></li>`).join('')}</ul>`
        : `<div class="empty3">${art('chest', { size: 64, cls: 'locked' })}<p>Finish 3 quests to open one</p></div>`}
      </section>
    </div>`;
    fillAll(main);
    $$('[data-chest]', main).forEach((b) => b.addEventListener('click', async () => { await openChestFlow(b.dataset.chest); draw(); }));
    const shop = $('.rw-shop', main);
    bindShop(shop, () => { $('#shop-seeds').textContent = fmtN(rewards().seeds); look = null; $('#shop-pip').innerHTML = pip('cheer', { size: 150 }); pop($('#shop-pip')); });
    shop.addEventListener('click', (e) => {
      const t = e.target.closest('[data-try]'); if (!t) return;
      const it = SHOP.find((x) => x.id === t.dataset.try), w = worn();
      look = { pot: it.kind === 'pot' ? it : w.pot, hat: it.kind === 'hat' ? it.id : w.hat };
      $('#shop-pip').innerHTML = pip('wow', { size: 150, look }); pop($('#shop-pip'), { from: .94 });
      $$('[data-try]', shop).forEach((b) => b.closest('.si').classList.toggle('trying', b === t));
    });
  };
  draw();
  if (arg === 'shop') requestAnimationFrame(() => $('#shop')?.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }));
  const off = onReward((o, kind) => { if (kind === 'check') draw(); });
  return { unmount() { off(); } };
}
