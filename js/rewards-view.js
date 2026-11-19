// Stickers (#/rewards), v3 "The cancelled journey" (DESIGN.md): a sticker book on backing paper (your plants'
// home stickers and their cancelled shop twins, streak date stamps, real journeys cancelled), the odometer with
// the next real journey, and Pip's pots and hats unlocked by km. Also the two top-bar sheets (streak, km), the
// date stamps used on Today, and the celebration screens built from what award() returned.
import { $, $$, esc, fmt, today, overallStreak, bestStreak, photoDays, savedDays, plantById, state } from './core.js?v=9';
import * as J from './journey.js?v=1';
import { rewards, MILESTONES, PIP_ITEMS, SAVER_MAX, saversHeld, isUnlocked, wear, worn, onReward, stickerBook, journeyLabel, placeShort } from './rewards.js?v=9';
import { sheet, pip, hatArt, stickOn, rollOdo, cancelRoute, reduced, play } from './fun.js?v=9';

const fmtN = (n) => Number(n).toLocaleString('en-IE');
const dt = (d) => new Date(d + 'T12:00');
const dateShort = (d) => dt(d).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
const tilt = (key) => { let h = 0; for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) | 0; return ((Math.abs(h) % 9) - 4) * .75; };

// ---------- the date stamps (Today hero, streak sheet) ----------
// days: ['YYYY-MM-DD', …]. A photo day is stamped in leaf ink; a day the watering can saved in terracotta; a missed
// day is an empty dashed box you can tap to add a photo from then (opts.repair); today without a photo is waiting.
export function stampDay(d, { photos = photoDays(), kept = savedDays(), first = null, repair = false, small = false } = {}) {
  const x = dt(d), did = photos.has(d), sav = !did && kept.has(d), isT = d === today(), fut = d > today();
  const missed = !did && !sav && !isT && !fut && (!first || d >= first);
  const wd = x.toLocaleDateString('en-IE', { weekday: 'short' }).slice(0, 3).toUpperCase();
  const mo = x.toLocaleDateString('en-IE', { month: 'short' }).slice(0, 3).toUpperCase();
  const say = `${x.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}${did ? ', photo taken' : sav ? ', saved by the watering can' : missed ? ', no photo' : isT ? ', today, no photo yet' : ''}`;
  const cls = `ds${did ? ' did' : ''}${sav ? ' sav' : ''}${isT ? ' tdy' : ''}${missed ? ' miss' : ''}${fut ? ' fut' : ''}${small ? ' sm' : ''}`;
  const inner = `<span class="ds-wd" aria-hidden="true">${small ? wd.slice(0, 1) : wd}</span><b aria-hidden="true">${x.getDate()}</b>${small ? '' : `<span class="ds-mo" aria-hidden="true">${sav ? 'SAVED' : mo}</span>`}`;
  const style = did || sav ? ` style="--r:${tilt(d)}deg"` : '';
  if (missed && repair) return `<button type="button" class="${cls}" data-repair="${d}" aria-label="${esc(say)}. Add a photo from that day">${inner}</button>`;
  return `<span class="${cls}"${style} role="img" aria-label="${esc(say)}">${inner}</span>`;
}

// ---------- sticker art made here: streak stamps, trip tickets, the cancelled twin ----------
export function stampSvg(n, { empty = false, size = 92 } = {}) {
  const c = empty ? 'var(--ink-3, #8b938c)' : '#23774a';
  return `<svg class="stamp${empty ? ' empty' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${empty ? `Empty: ${n}-day streak stamp` : `${n}-day streak stamp`}" style="stroke:none">
    <circle cx="50" cy="50" r="45" fill="${empty ? 'none' : '#fffdf7'}" stroke="${c}" stroke-width="3"${empty ? ' stroke-dasharray="5 5"' : ''}/>
    ${empty ? '' : `<circle cx="50" cy="50" r="38" fill="none" stroke="${c}" stroke-width="1.5"/>`}
    <text x="50" y="${n >= 100 ? 58 : 60}" text-anchor="middle" font-size="${n >= 100 ? 30 : 36}" font-weight="800" fill="${c}" font-family="Bricolage Grotesque, Nunito, sans-serif" stroke="none">${n}</text>
    <text x="50" y="30" text-anchor="middle" font-size="9" font-weight="800" letter-spacing="1.5" fill="${c}" font-family="Nunito, sans-serif" stroke="none">STREAK</text>
    <text x="50" y="77" text-anchor="middle" font-size="9" font-weight="800" letter-spacing="1.5" fill="${c}" font-family="Nunito, sans-serif" stroke="none">DAYS</text>
  </svg>`;
}
export function ticketHtml(j, { empty = false } = {}) {
  const from = placeShort(j.from.place);
  return `<span class="tix${empty ? ' empty' : ''}" role="img" aria-label="${esc(empty ? `Not yet: ${from} to ${j.to.name}, ${fmtN(j.km)} km` : `Journey cancelled: ${from} to ${j.to.name}, ${fmtN(j.km)} km`)}">
    <span class="tix-route" aria-hidden="true"><b>${esc(from)}</b><i>→</i><b>${esc(j.to.name)}</b></span>
    <span class="tix-km" aria-hidden="true">${fmtN(j.km)} km</span>
    ${empty ? '' : '<span class="tix-stamp" aria-hidden="true">Cancelled</span>'}
  </span>`;
}
export const twinSticker = (id, size = 96) => `<span class="twin" style="--r:${tilt(id)}deg">${J.stickerSvg(id, { kind: 'shop', size, tilt: true })}<span class="twin-x" aria-hidden="true">Cancelled</span></span>`;
const homeSticker = (id, size = 96, day) => J.stickerSvg(id, { kind: 'home', size, day, tilt: true });
const emptySticker = (id, size = 96) => J.stickerSvg(id, { kind: 'empty', size });

// ---------- the celebration screens for whatever award() just gave ----------
export function harvestScreen(out) {
  const j = J.journeyOf(out.id); if (!j) return null;
  const twin = (out.stickers || []).some((s) => s.kind === 'twin' && s.id === out.id);
  return {
    tone: 'paper', sound: 'done', title: 'Trip cancelled',
    art: `<div class="cele-route" data-route="${esc(out.id)}">${J.routeSvg(out.id, { w: 320, h: 180, cancel: 0, crop: 'auto' })}</div>`,
    big: `<span class="cele-odo">${J.odometer(out.kmFrom)}</span>`,
    sub: `Your ${esc(j.name.toLowerCase())} didn’t travel ${fmtN(j.km)} km from ${esc(placeShort(j.from.place))}, ${esc(j.from.country)}.`,
    extra: twin ? `<div class="cele-extra cele-stick">${twinSticker(out.id, 120)}<p>New sticker: ${esc(j.name)}’s shop twin, cancelled</p></div>` : '',
    onShow(el) {
      const box = $('.cele-route', el), odo = $('.cele-odo', el), st = $('.cele-stick .twin', el);
      if (st) st.style.visibility = 'hidden';
      cancelRoute(box, out.id, { w: 320, h: 180 }).then(() => rollOdo(odo, out.kmFrom, out.kmTo)).then(() => {
        if (st) { st.style.visibility = ''; stickOn(st); play('badge'); }
      });
    },
  };
}
// { trip: false } when the screen already played the cancel (the plant page does its own)
export function rewardScreens(out = {}, { trip = true } = {}) {
  const s = [];
  if (out.km > 0 && trip) s.push(harvestScreen(out));
  for (const k of (out.stickers || []).filter((x) => x.kind === 'home')) {
    const p = plantById(k.id); if (!p) continue;
    s.push({ tone: 'paper', sound: 'badge', title: 'New sticker', sticker: homeSticker(k.id, 150, 1), big: esc(p.name), sub: 'Grown at home · 0 km. Your first harvest cancels its shop twin.' });
  }
  for (const k of (out.stickers || []).filter((x) => x.kind === 'twin' && !(trip && out.km > 0 && x.id === out.id))) {
    const p = plantById(k.id); if (!p) continue;
    s.push({ tone: 'paper', sound: 'badge', title: 'New sticker', sticker: twinSticker(k.id, 150), big: `${esc(p.name)}’s twin`, sub: 'Its shop trip, cancelled.' });
  }
  for (const k of (out.stickers || []).filter((x) => x.kind === 'streak')) {
    s.push({ tone: 'paper', sound: 'streak', title: `${k.n}-day streak`, sticker: stampSvg(k.n, { size: 150 }), big: 'Stamped', sub: `${k.n} days of photos in a row.` });
  }
  const trips = (out.stickers || []).filter((x) => x.kind === 'km');
  if (trips.length) s.push({ tone: 'paper', sound: 'badge', title: trips.length > 1 ? `${trips.length} journeys cancelled` : 'Journey cancelled', sticker: ticketHtml(trips.at(-1).j), big: esc(trips.at(-1).label), sub: trips.length > 1 ? `And ${trips.length - 1} shorter trip${trips.length > 2 ? 's' : ''}. Real journeys shop food makes, now cancelled by you.` : 'A real trip shop food makes, now cancelled by you.' });
  // several unlocks at once (a long trip): one screen for the newest, the others named under it
  const un = out.unlocks || [], it = un.at(-1);
  if (it) {
    const also = un.slice(0, -1).map((x) => x.name);
    s.push({ tone: 'paper', sound: 'level', title: 'Pip unlocked', sticker: pip('cheer', { size: 150, look: { pot: it.kind === 'pot' ? it : worn().pot, hat: it.kind === 'hat' ? it.id : worn().hat } }), big: esc(it.name),
      sub: `For ${fmtN(it.km)} km cancelled.${also.length ? ` Also new: ${esc(also.join(', '))}.` : ''}`, cta: 'Wear it', alt: 'Not now', onContinue(el, next) { wear(it.kind, it.id); next(); } });
  }
  return s.filter(Boolean);
}
// v2 names kept so old calls don't break
export const chestScreen = () => null;
export async function openChestFlow() {}

// ---------- the two top-bar sheets ----------
export function streakSheet() {
  const n = overallStreak(), best = bestStreak(), photos = photoDays(), kept = savedDays();
  const end = new Date(); end.setDate(end.getDate() + (6 - ((end.getDay() + 6) % 7)));
  const days = []; for (let i = 27; i >= 0; i--) { const d = new Date(end); d.setDate(end.getDate() - i); days.push(today(d)); }
  const cans = saversHeld();
  sheet({ title: 'Your streak', body: `
    <p class="sh-big"><b>${n}</b><span>day${n === 1 ? '' : 's'} in a row</span></p>
    <p class="sh-say">Take one photo of a plant every day. Each day gets a stamp. Miss a day and the count starts again.</p>
    <ol class="ds-cal" aria-label="The last four weeks">${days.map((d) => `<li>${stampDay(d, { photos, kept, small: true })}</li>`).join('')}</ol>
    <dl class="sh-facts"><div><dt>Best</dt><dd>${best} days</dd></div><div><dt>Watering cans</dt><dd>${cans} of ${SAVER_MAX}</dd></div></dl>
    <p class="sh-say">A watering can saves one missed day. You earn one for every 7 days in a row.</p>
    <a class="b3 b3-wide" href="#/snap">${photos.has(today()) ? 'Snap another' : 'Take today’s photo'}</a>
    <p class="sh-src"><a href="#/sources">How we count</a></p>` });
}
export function kmSheet() {
  const km = J.kmCancelled(), next = J.nextJourney(km);
  const eg = state.garden.map((e) => J.journeyOf(e.id)).find(Boolean) || J.journeyOf('tomato');
  const src = eg?.sources?.[0];
  sheet({ title: 'Km cancelled', body: `
    <div class="sh-odo">${J.odometer(km)}</div>
    <p class="sh-say">Shop food travels a long way.${eg ? ` A ${esc(eg.name.toLowerCase())} in ${esc(eg.to.name)} usually comes ${fmtN(eg.km)} km from ${esc(placeShort(eg.from.place))}, ${esc(eg.from.country)}.` : ''}</p>
    <p class="sh-say">Every time you pick your own, that trip doesn’t happen. We add up the km of the trips you cancelled.</p>
    ${next ? `<p class="sh-next">Next: <b>${esc(journeyLabel(next))}</b>, ${fmtN(next.km)} km</p>` : ''}
    <a class="b3 b3-wide b3-white" href="#/rewards">See your stickers</a>
    <p class="sh-src">${src?.url ? `Source: <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.publisher || src.title)}</a> · ` : ''}<a href="#/sources">How we count km</a></p>` });
}
// v2 names
export const seedSheet = kmSheet;
export const levelSheet = kmSheet;

// ================= the Stickers screen =================
export default async function stickersView(main) {
  let look = null; // trying a pot or hat on Pip
  const draw = () => {
    const B = stickerBook(), km = B.km, next = J.nextJourney(km), w = worn();
    const nextId = next?.id;
    const cell = (inner, how, cls = '', x = {}) => `<li class="sb-cell${cls}"${x.date === today() ? ' data-new' : ''}${x.date ? ` style="--r:${tilt(x.key)}deg"` : ''}>${inner}${how ? `<span class="sb-how">${esc(how)}</span>` : ''}</li>`;
    const plantsRow = B.plants.length ? B.plants.map((x) => {
      if (x.kind === 'home') return cell(x.date ? homeSticker(x.id, 96) : emptySticker(x.id, 96), x.date ? x.name : `Plant ${x.name.toLowerCase()}`, x.date ? '' : ' off', x);
      return cell(x.date ? twinSticker(x.id, 96) : emptySticker(x.id, 96), x.date ? `${x.name}’s twin` : x.how, x.date ? '' : ' off', x);
    }).join('') : cell(emptySticker('tomato', 96), 'Plant something to get its sticker', ' off');
    const earned = Object.keys(rewards().stickers).length;
    main.innerHTML = `
    <div class="page sb" data-tone="rewards">
      <header class="page-head"><h1>Stickers</h1><p class="sb-count">${earned} collected</p></header>
      <div class="sb-grid">
        <section class="c3 sb-odo" aria-labelledby="odo-t">
          <h2 id="odo-t">Km cancelled</h2>
          <div class="sb-odo-n">${J.odometer(km)}</div>
          ${next ? `<p class="sb-next">Next: <b>${esc(journeyLabel(next))}</b>, ${fmtN(next.km)} km</p>
          <div class="sb-route">${J.routeSvg(nextId, { w: 320, h: 180, crop: 'auto' })}</div>
          <p class="sb-left">${fmtN(Math.max(0, next.km - km))} km to go. Pick a harvest to cancel a trip.</p>` : '<p class="sb-next">Every journey in the data, cancelled.</p>'}
          <p class="sh-src"><a href="#/sources">How we count km</a></p>
        </section>
        <section class="sb-book" aria-label="Sticker book">
          <h2 class="sb-h">Your plants</h2>
          <ul class="sb-row">${plantsRow}</ul>
          <h2 class="sb-h">Streak stamps</h2>
          <ul class="sb-row">${B.streak.map((x) => cell(stampSvg(x.n, { empty: !x.date, size: 92 }), x.date ? dateShort(x.date) : x.how, x.date ? '' : ' off', x)).join('')}</ul>
          <h2 class="sb-h">Journeys cancelled</h2>
          <ul class="sb-row sb-trips">${B.trips.map((x) => cell(ticketHtml(x.j, { empty: !x.date }), x.date ? dateShort(x.date) : x.how, x.date ? '' : ' off', x)).join('')}</ul>
        </section>
        <section class="c3 sb-pip" aria-labelledby="pip-t">
          <h2 id="pip-t">Pip’s pots and hats</h2>
          <div class="sb-stage"><div class="sb-pipfig" id="sb-pip">${pip('wave', { size: 132, look: look || undefined })}</div><p class="sb-hint">Unlocked by km cancelled. Tap one to try it.</p></div>
          <ul class="sb-items">${PIP_ITEMS.map((it) => {
            const on = isUnlocked(it.id, km), worn_ = (it.kind === 'pot' ? w.pot?.id : w.hat) === it.id;
            const pic = it.kind === 'hat' ? hatArt(it.id, 44) : `<svg class="art swatch" width="44" height="44" viewBox="0 0 64 64" aria-hidden="true" style="stroke:none"><path d="M13 24h38l-5 30a3 3 0 0 1-3 2.5H21a3 3 0 0 1-3-2.5z" fill="${it.color}"/><rect x="9" y="15" width="46" height="11" rx="4" fill="${it.shade}"/></svg>`;
            return `<li class="si${on ? '' : ' locked'}${worn_ ? ' on' : ''}"><button class="si-art" type="button" data-try="${it.id}" aria-label="Try the ${esc(it.name)} on Pip">${pic}</button>
              <p class="si-txt"><b>${esc(it.name)}</b><span class="si-sub">${on ? (worn_ ? 'Wearing' : 'Unlocked') : `At ${fmtN(it.km)} km`}</span></p>
              ${on ? `<button class="b3 b3-sm b3-white" type="button" data-wear="${it.id}" aria-pressed="${worn_}">${worn_ ? 'Worn' : 'Wear'}</button>` : `<span class="si-lock">${fmtN(Math.max(0, it.km - km))} km to go</span>`}</li>`;
          }).join('')}</ul>
        </section>
      </div>
    </div>`;
  };
  draw();
  main.addEventListener('click', (e) => {
    const t = e.target.closest('[data-try]'), wr = e.target.closest('[data-wear]');
    if (wr) { const it = PIP_ITEMS.find((x) => x.id === wr.dataset.wear); wear(it.kind, (it.kind === 'pot' ? worn().pot?.id : worn().hat) === it.id ? null : it.id); play('toggle'); look = null; draw(); return; }
    if (t) {
      const it = PIP_ITEMS.find((x) => x.id === t.dataset.try), w = worn();
      look = { pot: it.kind === 'pot' ? it : w.pot, hat: it.kind === 'hat' ? it.id : w.hat };
      $('#sb-pip').innerHTML = pip('wow', { size: 132, look });
      $$('[data-try]', main).forEach((b) => b.closest('.si').classList.toggle('trying', b === t));
    }
  });
  // stickers earned today press themselves onto the page
  $$('.sb-cell[data-new]', main).forEach((c, k) => setTimeout(() => stickOn(c.firstElementChild), 200 + k * 120));
  const off = onReward((o, kind) => { if (kind === 'check' || kind === 'wear') draw(); });
  return { unmount() { off(); } };
}
export { MILESTONES };
