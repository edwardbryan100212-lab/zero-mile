// Zero Mile: the first run and the habit hooks.
// - Onboarding: shown once to a new grower (empty garden, not onboarded yet). Pip says hi, you pick what to grow,
//   a daily goal and where you live, then "Plant it!" adds the plant and lands on Today. "Skip" is always there.
// - Daily reminder: no server and no push, so it is a calendar file (.ics) with a daily repeating event that links
//   back to the Photo screen, plus a small nudge on Today.
// - Streak at risk: after 6pm, with a streak and no photo yet today, Today's hero turns into an evening sky.
// - Welcome back: after 2 or more days away, Pip says hello once.
import { $, $$, esc, data, state, save, today, dayDiff, addToGarden, plantById, overallStreak, photoDays, bestTrees, toast } from './core.js?v=9';
import { EASE, reduced, pip, haptic, stickOn, sheet } from './fun.js?v=10';
import { stickerSvg, journeyOf, routeSvg, routeAnimate, odometer, odometerRoll, modeWord } from './journey.js?v=1';
import { placeShort } from './rewards.js?v=9';
import { produceIcon } from './produce.js?v=9';

// ---------- streak at risk (used by the Today hero in js/garden.js) ----------
export const RISK_HOUR = 18;
export function streakRisk(now = new Date()) {
  const n = overallStreak();
  return n > 0 && now.getHours() >= RISK_HOUR && !photoDays().has(today(now));
}
export const riskLine = (n) => `Your ${n}-day streak needs a photo!`;

// simple line icons for the paper UI (1.75px stroke, DESIGN.md v2)
const LINE = {
  cal: '<svg class="li" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  back: '<svg class="li" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  check: '<svg class="li" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg class="li" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

const fmtN = (n) => Number(n).toLocaleString('en-IE');

// ---------- goals ----------
export const GOALS = [
  { id: 'casual', label: 'Casual', sub: 'Photo most days', lcd: '5 PHOTOS/WK' },
  { id: 'regular', label: 'Regular', sub: 'Photo every day', lcd: '1 PHOTO/DAY' },
  { id: 'super', label: 'Super grower', sub: 'Photo + water daily', lcd: 'PHOTO+WATER' },
];

// ---------- the reminder: a daily calendar event ----------
const pad = (n) => String(n).padStart(2, '0');
const showTime = (t) => String(t).replace(/^0(?=\d)/, ''); // 8:00, not 08:00
const stamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const local = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
export const photoURL = () => location.href.split('#')[0] + '#/snap';
export function icsText(time = '18:00', now = new Date()) {
  const [h, m] = time.split(':').map(Number);
  const start = new Date(now); start.setHours(h, m, 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1); // the first one is the next time that comes round
  const end = new Date(start.getTime() + 15 * 60e3);
  const url = photoURL();
  // floating local times (no time zone), so it rings at the same clock time wherever you are
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zero Mile//Daily photo reminder//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:zeromile-daily-${local(start)}@zero-mile`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${local(start)}`,
    `DTEND:${local(end)}`,
    'RRULE:FREQ=DAILY',
    'SUMMARY:Snap your plant with Pip',
    `DESCRIPTION:Take today's photo to keep your streak growing.\\n${url}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Snap your plant with Pip', 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
export function downloadReminder(time) {
  const blob = new Blob([icsText(time)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'zero-mile-reminder.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  state.reminder = time; save();
  toast('Open the file to add it to your calendar');
}
const timeOpts = (sel) => Array.from({ length: 15 }, (_, i) => `${pad(i + 7)}:00`)
  .map((t) => `<option value="${t}"${t === sel ? ' selected' : ''}>${showTime(t)}</option>`).join(''); // 8:00, not 08:00
export function reminderBlock(id = 'rem') {
  const t = state.reminder || '18:00';
  return `<div class="rem3" data-rem>
    <label class="rem3-t" for="${id}-time">${LINE.cal}<span>Remind me every day</span></label>
    <div class="rem3-row"><span class="rem3-sel"><select id="${id}-time" aria-label="Time">${timeOpts(t)}</select></span>
    <button class="obtn" type="button" data-rem-go>${state.reminder ? 'Update' : 'Add to calendar'}</button></div>
  </div>`;
}
export function bindReminder(root) {
  $$('[data-rem]', root).forEach((box) => $('[data-rem-go]', box).addEventListener('click', () => {
    downloadReminder($('select', box).value);
    $('[data-rem-go]', box).innerHTML = `${LINE.check}Added`;
    box.classList.add('done');
  }));
}

// ---------- onboarding ----------
export const needsOnboarding = () => !state.garden.length && !state.onboarded;

const CHOICES = [
  { key: 'tomato', label: 'Tomatoes', id: 'tomato' },
  { key: 'strawberry', label: 'Strawberries', id: 'strawberry' },
  { key: 'herbs', label: 'Herbs', id: 'basil' },
  { key: 'salad', label: 'Salad', id: 'lettuce' },
  { key: 'tree', label: 'A tree', id: null }, // the best tree where you live
];
const treeId = (region) => bestTrees(region)[0]?.id || 'oak';

let open = null, starting = false;
export async function onboard() {
  if (open || starting) return open;
  starting = true;
  const D = await data();
  const { photoOf } = await import('./photos.js?v=9');
  const pics = {};
  await Promise.all(CHOICES.map(async (c) => {
    const id = c.id || treeId(state.region), p = plantById(id);
    const ph = await photoOf(id, p?.group === 'tree' ? 'tree' : 'plant').catch(() => null) || await photoOf(id, 'harvest').catch(() => null);
    pics[c.key] = ph?.src || '';
  }));
  const pick = { grow: null, goal: state.goal || 'regular', region: state.region }; // a sensible goal is ready, so Next is live
  const STEPS = ['hi', 'grow', 'goal', 'where', 'twin', 'done']; // twin is skipped for plants with no shop route (woodland trees)
  let i = 0;

  const ob = document.createElement('div');
  ob.className = 'ob'; ob.setAttribute('role', 'dialog'); ob.setAttribute('aria-modal', 'true'); ob.setAttribute('aria-labelledby', 'ob-t');
  ob.innerHTML = `<div class="ob-top">
      <button class="ob-back obtn-2 obtn-sq" type="button" aria-label="Back">${LINE.back}</button>
      <div class="bar3 ob-bar" role="progressbar" aria-label="Steps" aria-valuemin="1" aria-valuemax="${STEPS.length}"><i></i></div>
      <button class="ob-skip obtn-q" type="button">Skip</button>
    </div>
    <div class="ob-stage"></div>`;
  document.body.appendChild(ob);
  document.documentElement.classList.add('ob-on');
  const stage = $('.ob-stage', ob);
  const behind = $$('.shell, .tabbar, .skip'); // the app underneath is inert while Pip talks
  behind.forEach((x) => { x.inert = true; x.setAttribute('aria-hidden', 'true'); });
  let done;
  open = new Promise((r) => { done = r; });

  const card = (c) => `<button class="ob-card c3${pick.grow === c.key ? ' on' : ''}" type="button" data-grow="${c.key}" aria-pressed="${pick.grow === c.key}">
      <span class="ob-ph">${pics[c.key] ? `<img src="${esc(pics[c.key])}" alt="" loading="eager" decoding="async">` : ''}</span><b>${c.label}</b><i class="ob-tick">${LINE.check}</i></button>`;
  const goalCard = (g) => `<button class="ob-goal c3${pick.goal === g.id ? ' on' : ''}" type="button" data-goal="${g.id}" aria-pressed="${pick.goal === g.id}">
      <i class="ob-radio" aria-hidden="true"></i><span><b>${g.label}</b><small>${g.sub}</small></span></button>`;
  const regionBtn = ([k, r]) => `<button class="ob-reg c3${pick.region === k ? ' on' : ''}" type="button" data-region="${k}" aria-pressed="${pick.region === k}"><i class="ob-radio" aria-hidden="true"></i><b>${esc(r.name)}</b></button>`;
  const chosen = () => CHOICES.find((c) => c.key === pick.grow);
  const plantId = () => chosen()?.id || treeId(pick.region);

  const view = {
    hi: () => `<div class="ob-hi">
        <div class="ob-pip">${pip('wave', { size: 200 })}</div>
        <p class="ob-say" aria-hidden="true">Hi! I’m Pip</p>
        <h1 id="ob-t" tabindex="-1">Let’s grow food together</h1>
        <p class="ob-lead">A photo a day keeps your plant growing.</p>
      </div>
      <div class="ob-foot"><button class="obtn obtn-xl" type="button" data-next>Let’s go</button></div>`,
    grow: () => `<div class="ob-head"><h1 id="ob-t" tabindex="-1">What will you grow?</h1></div>
      <div class="ob-cards">${CHOICES.map(card).join('')}</div>
      <div class="ob-foot"><button class="obtn obtn-xl" type="button" data-next${pick.grow ? '' : ' aria-disabled="true"'}>Next</button></div>`,
    goal: () => `<div class="ob-head"><h1 id="ob-t" tabindex="-1">Your daily goal</h1></div>
      <div class="ob-stamp" aria-hidden="true"><span id="ob-goal-px">${esc(GOALS.find((g) => g.id === pick.goal)?.lcd || 'PICK ONE')}</span></div>
      <div class="ob-goals">${GOALS.map(goalCard).join('')}</div>
      <div class="ob-foot"><button class="obtn obtn-xl" type="button" data-next${pick.goal ? '' : ' aria-disabled="true"'}>Next</button></div>`,
    where: () => `<div class="ob-head"><h1 id="ob-t" tabindex="-1">Where do you live?</h1></div>
      <div class="ob-regs">${Object.entries(D.regions).map(regionBtn).join('')}</div>
      <div class="ob-foot"><button class="obtn obtn-xl" type="button" data-next>Next</button></div>`,
    // the shop twin: where the shop version of this plant really comes from, for the country you picked
    twin: () => {
      const id = plantId(), p = plantById(id), j = journeyOf(id, pick.region);
      state.region = pick.region; // the shop sticker reads the region
      const name = (p?.name || 'plant').toLowerCase();
      return `<div class="ob-head"><h1 id="ob-t" tabindex="-1">Meet its shop twin</h1>
        <p class="ob-lead">In ${esc(D.regions[pick.region]?.name || 'your country')}, a shop ${esc(name)} comes from <b>${esc(placeShort(j.from.place))}, ${esc(j.from.country)}</b>, ${esc(modeWord(j.mode))}.</p></div>
      <div class="ob-twin">
        <div class="ob-tw-map" aria-hidden="true">${routeSvg(id, { w: 320, h: 168, region: pick.region, crop: 'auto', progress: 0 })}</div>
        <p class="ob-tw-km" role="img" aria-label="${fmtN(j.km)} km">${odometer(0, { digits: Math.max(3, String(j.km).length) })}</p>
        <div class="ob-tw-pair">
          <figure>${stickerSvg(id, { kind: 'shop', size: 108, tilt: true })}<figcaption>The shop one</figcaption></figure>
          <span class="ob-vs" aria-hidden="true">vs</span>
          <figure>${stickerSvg(id, { kind: 'home', size: 108, day: 1, tilt: true })}<figcaption>Yours, 0 km</figcaption></figure>
        </div>
        <p class="ob-tw-note">Every harvest you log cancels one of those trips.</p>
      </div>
      <div class="ob-foot"><button class="obtn obtn-xl" type="button" data-plant>Plant it</button></div>`;
    },
    done: () => {
      const p = plantById(plantId());
      return `<div class="ob-done">
        ${pics[pick.grow] ? `<img class="ob-pic" src="${esc(pics[pick.grow])}" alt="" width="220" height="165">` : ''}
        <h1 id="ob-t" tabindex="-1">Planted</h1>
        <p class="ob-lead">${p ? `<span class="ob-sym" style="display:inline-flex;vertical-align:-6px;margin-right:6px">${produceIcon(p.id, { size: 28, group: p.group })}</span>` : ''}${esc(p?.name || 'Your plant')} is in your garden.</p>
        ${p ? `<div class="ob-stick"><span class="ob-stk">${stickerSvg(p.id, { kind: 'home', size: 132, day: 1, tilt: true })}</span><p>Your first sticker: grown at home, 0 km</p></div>` : ''}
        <div class="ob-rem">${reminderBlock('ob-rem')}</div>
      </div>
      <div class="ob-foot"><button class="obtn obtn-xl obtn-2" type="button" data-finish>Go to my garden</button></div>`;
    },
  };

  function show(dir = 1) {
    const name = STEPS[i];
    const old = $('.ob-step', ob);
    const el = document.createElement('div');
    el.className = `ob-step ob-s-${name}`;
    el.innerHTML = view[name]();
    stage.appendChild(el);
    $('.ob-bar > i', ob).style.setProperty('--p', `${((i + 1) / STEPS.length) * 100}%`);
    $('.ob-bar', ob).setAttribute('aria-valuenow', i + 1);
    $('.ob-back', ob).hidden = i === 0 || name === 'done';
    $('.ob-skip', ob).hidden = name === 'done';
    if (!reduced()) {
      el.animate([{ transform: `translateX(${dir * 40}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: EASE });
      if (old) old.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 30}%)`, opacity: 0 }], { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = () => old.remove();
    } else old?.remove();
    bind(el);
    const stk = $('.ob-stk', el); if (stk) stickOn(stk, { delay: 380 }); // the first sticker is pressed on
    if (name === 'twin') { // the route draws in from the origin while the km roll up to the real distance
      const j = journeyOf(plantId(), pick.region);
      setTimeout(() => { routeAnimate($('.ob-tw-map svg', el), { progress: [0, 1], ms: 1400 }); odometerRoll($('.ob-tw-km .odo', el), 0, j.km); }, reduced() ? 0 : 300);
      $('.ob-tw-km .odo', el)?.removeAttribute('role'); $('.ob-tw-km .odo', el)?.setAttribute('aria-hidden', 'true');
    }
    $('#ob-t', el)?.focus({ preventScroll: true });
  }
  const go = (d) => {
    let k = Math.max(0, Math.min(STEPS.length - 1, i + d));
    if (STEPS[k] === 'twin' && !journeyOf(plantId(), pick.region)) { // no shop route: plant straight from "where"
      if (d > 0) { i = k; plant(); return; }
      k = Math.max(0, k - 1);
    }
    i = k; show(d);
  };

  function bind(el) {
    $('[data-next]', el)?.addEventListener('click', (e) => {
      if (e.currentTarget.getAttribute('aria-disabled') === 'true') { nudge(e.currentTarget); return; }
      haptic(8); go(1);
    });
    $$('[data-grow]', el).forEach((b) => b.addEventListener('click', () => { pick.grow = b.dataset.grow; select(el, '[data-grow]', b); haptic(8); }));
    $$('[data-goal]', el).forEach((b) => b.addEventListener('click', () => {
      pick.goal = b.dataset.goal; select(el, '[data-goal]', b); haptic(8);
      const px = $('#ob-goal-px', el); if (px) px.textContent = GOALS.find((g) => g.id === pick.goal).lcd;
    }));
    $$('[data-region]', el).forEach((b) => b.addEventListener('click', () => { pick.region = b.dataset.region; select(el, '[data-region]', b); haptic(8); }));
    $('[data-plant]', el)?.addEventListener('click', plant);
    $('[data-finish]', el)?.addEventListener('click', () => close(true));
    bindReminder(el);
  }
  function select(el, sel, b) {
    $$(sel, el).forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
    $('[data-next]', el)?.removeAttribute('aria-disabled');
    if (!reduced()) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.98)', offset: .4 }, { transform: 'scale(1)' }], { duration: 200, easing: EASE });
  }
  function nudge(b) {
    if (reduced()) return;
    b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: EASE });
  }
  function plant() {
    state.region = pick.region; state.goal = pick.goal || 'regular'; state.onboarded = today();
    state.lastOpen = today();
    addToGarden(plantId()); // fires zm:added, so the app gives its home sticker
    dispatchEvent(new Event('zm:garden'));
    haptic([10, 40, 14]);
    go(1);
  }
  function close(planted) {
    removeEventListener('keydown', onKey);
    if (!planted) { state.onboarded = today(); state.lastOpen = today(); save(); }
    const end = () => {
      ob.remove(); document.documentElement.classList.remove('ob-on'); open = null; starting = false;
      behind.forEach((x) => { x.inert = false; x.removeAttribute('aria-hidden'); });
      if (location.hash && location.hash !== '#/') location.hash = '#/';
      else dispatchEvent(new HashChangeEvent('hashchange'));
      done(planted);
    };
    if (reduced()) return end();
    ob.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = end;
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { close(STEPS[i] === 'done'); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not([hidden]), select, [href]', ob).filter((x) => x.offsetParent && !x.closest('[aria-hidden="true"]'));
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  addEventListener('keydown', onKey);
  $('.ob-skip', ob).addEventListener('click', () => close(false));
  $('.ob-back', ob).addEventListener('click', () => go(-1));
  show(1);
  return open;
}

// ---------- welcome back (2 or more days away), said once ----------
export function welcomeBack() {
  const last = state.lastOpen, now = today();
  state.lastOpen = now; save();
  if (!last || !state.garden.length || dayDiff(last, now) < 2) return false;
  const away = dayDiff(last, now);
  const el = document.createElement('div');
  el.className = 'wb'; el.setAttribute('role', 'status');
  el.innerHTML = `<button class="wb-in" type="button" aria-label="Welcome back! Close">${pip('wave', { size: 64 })}
    <span><b>Welcome back!</b><small>${away > 6 ? 'I missed you!' : 'Your plants missed you!'}</small></span></button>`;
  document.body.appendChild(el);
  const bye = () => {
    if (!el.isConnected) return;
    if (reduced()) return el.remove();
    el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(24px)' }], { duration: 220, easing: EASE, fill: 'forwards' }).onfinish = () => el.remove();
  };
  if (!reduced()) el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE });
  $('.wb-in', el).addEventListener('click', bye);
  setTimeout(bye, 6000);
  return true;
}

// ---------- the reminder nudge on Today (until you add one or close it) ----------
export function todayNudge(main) {
  if (!state.garden.length || state.reminder || state.remNudgeOff === today() || state.remNudgeOff === 'never') return;
  const hero = $('#hero', main); if (!hero || $('.nudge3', main)) return;
  const box = document.createElement('section');
  box.className = 'nudge3'; box.setAttribute('aria-label', 'Daily reminder');
  box.innerHTML = `${reminderBlock('nudge')}
    <button class="nudge3-x" type="button" aria-label="Not now">${LINE.x}</button>`;
  hero.after(box);
  bindReminder(box);
  $('[data-rem-go]', box).addEventListener('click', () => setTimeout(() => box.remove(), 1400));
  $('.nudge3-x', box).addEventListener('click', () => {
    state.remNudgeOff = state.remNudgeSeen ? 'never' : today(); state.remNudgeSeen = true; save(); box.remove();
  });
}

// ---------- Today: one line in the hero with your photo time (8:00, not 08:00) and a way to change it ----------
// Hidden while the nudge card above is still asking; after that it says "No photo time yet · Set one".
export function reminderLine(el) {
  if (!el || !state.garden.length) return;
  const nudging = !state.reminder && state.remNudgeOff !== today() && state.remNudgeOff !== 'never';
  if (nudging) { el.hidden = true; return; }
  const t = state.reminder;
  el.innerHTML = `${LINE.cal}<span>${t ? `Photo time <b>${esc(showTime(t))}</b>` : 'No photo time yet'}</span><button class="th-rem-b" type="button">${t ? 'Change' : 'Set one'}<span class="vh"> the daily photo time</span></button>`;
  el.hidden = false;
  $('button', el).addEventListener('click', () => {
    const s = sheet({ title: 'Photo time', body: `<p class="rem-lead">Pick a time. Zero Mile makes a daily calendar event that opens the photo screen.</p>${reminderBlock('rl')}` });
    $('[data-rem-go]', s.el)?.addEventListener('click', () => setTimeout(() => { reminderLine(el); s.close(); }, 900));
    bindReminder(s.el);
  });
}

// ---------- Settings (About screen): the same reminder row ----------
export function settingsRow(main) {
  const set = $('.ab3-set', main); if (!set || $('[data-rem]', set)) return;
  const row = document.createElement('div');
  row.className = 'row3 rem3-set';
  row.innerHTML = reminderBlock('set');
  const anchor = $$('.row3', set)[1] || $('h2', set);
  anchor.after(row);
  bindReminder(row);
}

// ---------- photo time: once a day, after your reminder time, if there is no photo yet ----------
export function photoTimeNudge() {
  const t = state.reminder; if (!t || !state.garden.length) return;
  const [h, m] = t.split(':').map(Number), now = new Date();
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  if (photoDays().has(today()) || state.remToast === today()) return;
  state.remToast = today(); save();
  setTimeout(() => toast('Photo time! Pip is waiting'), 1200);
}
