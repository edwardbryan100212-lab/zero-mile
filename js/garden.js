// Today (home of the app) and Photo (daily photo → on-device feedback → a full-screen celebration).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, addToGarden,
  overallStreak, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName, thumb,
  isTree, isFruitTree, treeAge, treePhotoDue, logHeight, treeSeason, bestTrees, dailyPlants, MONTH_NAMES,
  savedDays, earnSaver } from './core.js?v=9';
import { EASE, reduced, countAll, fillAll, confetti, haptic, helpBtn, bindHelp, pip, celebration, play, runFaces, pipPot } from './fun.js?v=9';
import { art, icon } from './art.js?v=9';
import { award, rewards, saversHeld, SAVER_MAX, journeyLabel, placeShort } from './rewards.js?v=9';
import { kmCancelled, nextJourney, journeyOf, odometer, routeSvg, stickerSvg } from './journey.js?v=1';
import { stampDay } from './rewards-view.js?v=9';
import * as Face from './face.js?v=9';
import { produceIcon } from './produce.js?v=9';
import { streakRisk, riskLine } from './onboard.js?v=9';
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
const moodWord = (m) => Face.moodWord?.(m) || WORDS[m] || WORDS.okay;
const RV = () => import('./rewards-view.js?v=9');

const urls = [];
const objURL = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const freeURLs = () => { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const changed = () => dispatchEvent(new Event('zm:garden'));

// small control glyphs for paper UI: the filled glyph family from js/art.js
const ICON = {
  photo: icon('camera', { size: 20, cls: 'gi' }),
  water: icon('water', { size: 20, cls: 'gi' }),
  check: icon('check', { size: 20, cls: 'gi' }),
  plus: icon('plus', { size: 20, cls: 'gi' }),
  more: icon('more', { size: 20, cls: 'gi' }),
};

// the season word for a month where you live (seasons are flipped south of the equator)
function seasonWord(m) {
  const k = state.region === 'AU' ? ((m + 5) % 12) + 1 : m;
  return k === 12 || k <= 2 ? 'winter' : k <= 5 ? 'spring' : k <= 8 ? 'summer' : 'autumn';
}
const treeOf = (e) => isTree(plantById(e.id));
const photoDone = (e) => (treeOf(e) ? !treePhotoDue(e).due : snappedToday(e));
function growthT(e) {
  const p = plantById(e.id), age = dayDiff(e.planted, today());
  if (isTree(p)) return Math.min(1, .3 + .7 * age / (365 * 8)); // planted as a young sapling, grown in about eight years
  const days = p?.grow?.days_to_harvest?.[1] || 120;
  return Math.max(.1, Math.min(1, .1 + age / days));
}
function moodOf(e) {
  const last = [...e.log].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!last) return wateredToday(e) ? 'happy' : 'new';
  if (last.date !== today()) return wateredToday(e) ? 'okay' : 'sleepy';
  return last.mood;
}
const snappedToday = (e) => e.log.some((l) => l.date === today());
let PHOTO = {}; // id → real photo (js/photos.js), so Today's tiles match Find
const tile = (p) => `<a class="tile c3" href="#/plant/${p.id}"><div class="tile-art${PHOTO[p.id] ? ' photo' : ''}"><img src="${PHOTO[p.id] || thumb(p.id)}" alt="" width="132" height="132" loading="lazy"></div><b>${esc(p.name)}</b></a>`;
const picOf = (id) => PHOTO[id] || thumb(id);
// a plant's small picture on Today: its flat produce symbol (js/produce.js); 3D stays on the plant page
const media = (id) => `<span class="pc-sym">${produceIcon(id, { size: 56, group: plantById(id)?.group })}</span>`;

// ---------- a few pixel sparkles: the small celebration when something is logged ----------
export function burst(x, y) { confetti(x, y, { count: 16, spread: .6 }); }

// ---------- share card for streak milestones ----------
function shareCard(n, plant, photoBlob) {
  return new Promise((resolve) => {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    // Pip's LCD: black screen, a faint pixel grid, green pixel type
    x.fillStyle = '#0c110d'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(98,242,126,.06)'; for (let gy = 0; gy < H; gy += 12) for (let gx = 0; gx < W; gx += 12) x.fillRect(gx, gy, 10, 10);
    x.fillStyle = '#62f27e'; x.shadowColor = 'rgba(98,242,126,.6)'; x.shadowBlur = 18;
    x.font = '300px Tiny5, "Pixelify Sans", ui-monospace, monospace'; x.fillText(String(n), 80, 400);
    x.font = '84px Tiny5, "Pixelify Sans", ui-monospace, monospace'; x.fillText('day streak', 80, 520);
    x.shadowBlur = 0; x.fillStyle = '#f6f3ea';
    x.font = '700 52px Nunito, ui-rounded, sans-serif'; x.fillText(`Growing ${plant.name.toLowerCase()}`, 80, 620);
    x.font = '700 64px "Bricolage Grotesque", Nunito, sans-serif'; x.fillText('Zero Mile', 80, H - 76);
    const done = () => c.toBlob((b) => resolve({ canvas: c, blob: b }), 'image/png');
    if (!photoBlob) return done();
    const img = new Image();
    img.onload = () => { const s = 520, k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
      x.save(); x.beginPath(); x.roundRect(W - s - 80, 700, s, s * .72, 16); x.clip(); x.drawImage(img, W - s - 80 + (s - w) / 2, 700 + (s * .72 - h) / 2, w, h); x.restore(); done(); };
    img.onerror = done; img.src = URL.createObjectURL(photoBlob);
  });
}
async function shareStreak(n, plant, blob) {
  const { blob: card } = await shareCard(n, plant, blob);
  const file = new File([card], `zero-mile-${n}-day-streak.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: 'Zero Mile', text: `${n} day growing streak` }).catch(() => {});
  const a = document.createElement('a'); a.href = URL.createObjectURL(card); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------- analyse a photo, log it and award it ----------
async function analyseAndLog(entry, file, date, onBusy) {
  const A = await import('./analyze.js?v=2');
  const before = overallStreak();
  const { blob, canvas } = await A.shrink(file);
  const m = A.colours(canvas);
  let s = null;
  if (state.smartAI) {
    try { s = await A.smart(canvas, (pr) => { if (pr.status === 'progress' && pr.progress) onBusy?.(`Downloading the smart check ${Math.floor(pr.progress / 25) * 25}%`); }); }
    catch { toast('Smart check unavailable, used the colour check.'); }
  }
  const prev = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1)).find((l) => l.date !== date);
  const res = { ...A.judge(m, s, plantById(entry.id), prev), m, s };
  await logPhoto(entry, date, blob, res);
  const after = overallStreak();
  const earned = after > before ? earnSaver() : false;
  // streak stamps and other stickers; a retaken photo of the same day earns nothing twice
  const out = award('photo', { date, id: entry.id });
  changed();
  return { res, blob, before, after, out, earned };
}

// Friendly headline for the photo: never lead with bad news; the tips on the result screen say what to do
const SNAP_LINE = { thriving: 'Looking amazing!', happy: 'Looking good!', okay: 'Growing along!', thirsty: 'Needs a drink?', poorly: 'Let\u2019s help it!', new: 'First photo!', sleepy: 'Growing along!' };
// ---------- the photo celebration: your photo once beside Pip's pot face, the streak stamped, then any stickers ----------
async function photoParty({ res, blob, before, after, out, earned }, plant) {
  const V = await RV();
  const more = V.rewardScreens(out);
  if (!(after > before) && !more.length && !earned) return false;
  const url = objURL(blob);
  const S = [{
    tone: 'paper', sound: 'done', face: res.mood === 'poorly' || res.mood === 'thirsty' ? 'okay' : 'thriving',
    photo: url, photoAlt: `Your photo of ${esc(plant.name)}`, title: 'Photo saved', big: esc(SNAP_LINE[res.mood] || 'Growing along!'),
  }];
  if (after > before) {
    const share = [7, 30, 50, 100, 365].includes(after);
    const days = lastDays(7), photos = photoDays(), kept = savedDays();
    S.push({
      tone: 'paper', sound: 'streak', title: after === 1 ? 'Streak started' : 'Streak up',
      big: `<b class="cele-num">${before}</b>`, count: { from: before, to: after }, sub: `day${after === 1 ? '' : 's'} in a row`,
      sticker: `<span class="ds-row cele-ds">${days.map((d) => stampDay(d, { photos, kept })).join('')}</span>`,
      extra: share ? `<div class="cele-extra"><button class="b3 b3-white" type="button" id="share-streak">${icon('share', { size: 18 })}Share</button></div>` : '',
      onShow(el) { el.querySelector('#share-streak')?.addEventListener('click', () => shareStreak(after, plant, blob)); },
    });
  }
  if (earned) S.push({ tone: 'paper', sound: 'quest', art: `<span class="cele-can">${icon('water', { size: 72, color: true })}</span>`, title: 'Watering can', big: `${saversHeld()} of ${SAVER_MAX}`, sub: 'It saves one missed day.' });
  S.push(...more);
  await celebration(S);
  return true;
}

// ================= TODAY =================

export default async function garden(main) {
  const D = await data();
  if (!Object.keys(PHOTO).length) PHOTO = await import('./photos.js?v=9').then((m) => m.photoThumbs()).catch(() => ({}));
  freeURLs();
  const fresh = !state.garden.length;
  let entry = state.garden.find((e) => e.id === state.active) || state.garden[0];
  const n = overallStreak();
  const daily = dailyPlants(), trees = state.garden.filter(treeOf);
  const done = daily.filter(snappedToday).length, allDone = daily.length > 0 && done === daily.length, anyToday = done > 0;
  const treesDue = trees.filter((e) => treePhotoDue(e).due).length;
  const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 6);

  // impact so far (same sums as the Impact screen)
  let co2g = 0, kg = 0;
  for (const e of state.garden) {
    const t = trip(plantById(e.id), state.region), k = harvestKg(e);
    kg += k; if (t) { co2g += Math.round(t.co2Transport * k * 1000); }
  }

  // Pip's face says how today is going: hello to a new grower, sleepy before today's photo, thriving after it, and
  // worried in the evening when the streak is at risk (streakRisk() and riskLine() come from js/onboard.js)
  const risk = !fresh && !anyToday && daily.length > 0 && streakRisk();
  const mood = fresh ? 'new' : anyToday ? 'thriving' : risk ? 'poorly' : !daily.length ? 'happy' : 'sleepy';
  const say = fresh ? 'Hi! I’m Pip' : anyToday ? (allDone ? 'All done today' : 'Nice one') : risk ? riskLine(n) : !daily.length ? 'Trees grow slowly' : 'Snap me today';
  const cta = fresh ? `<a class="b3 b3-solid" href="#/find">Pick a plant</a>`
    : !daily.length ? (treesDue ? `<a class="b3 b3-solid" href="#/snap">${ICON.photo}Seasonal photo</a>` : `<a class="b3" href="#/find">${ICON.plus}Add a plant</a>`)
    : allDone ? `<a class="b3 b3-white" href="#/snap">${ICON.photo}Snap another</a>` : `<a class="b3 b3-solid${risk ? ' pulse3' : ''}" href="#/snap">${ICON.photo}Take today’s photo</a>`;

  // the one score: km of shop trips cancelled by your harvests, and the next real journey to cancel
  const km = kmCancelled(), nx = nextJourney(km);
  const hero = `
    <section class="t-hero c3${risk ? ' at-risk' : ''}" id="hero" aria-labelledby="odo-t">
      <div class="th-pip">${pipPot(mood, 'th-pot')}<p class="th-say">${esc(say)}</p></div>
      <div class="th-main">
        <h2 id="odo-t" class="th-k">Km cancelled</h2>
        <button class="th-odo" type="button" data-sheet="km" aria-label="${fmt(km)} km cancelled. What is this?">${odometer(km)}</button>
        ${nx ? `<p class="th-next">Next: <b>${esc(journeyLabel(nx))}</b>, ${fmt(nx.km)} km</p>` : ''}
        ${fresh ? '<p class="th-lead">Every harvest cancels a real shop trip.</p>' : `
        <div class="th-streak"><button class="th-k th-sk" type="button" data-sheet="streak" aria-label="${n} day streak. What is this?">${n}-day streak</button><div class="ds-row" role="group" aria-label="This week" id="dots"></div></div>`}
        <div class="th-row">${cta}</div>
      </div>
    </section>`;

  // the next trip to cancel: the growing plant closest to its first harvest
  const ageOf = (e) => dayDiff(e.planted, today()) + 1;
  const near = state.garden.filter((e) => !treeOf(e) && journeyOf(e.id)).map((e) => {
    const p = plantById(e.id), d0 = p.grow?.days_to_harvest?.[0] || 60;
    return { e, p, j: journeyOf(e.id), left: d0 - ageOf(e) };
  }).sort((a, b) => a.left - b.left)[0];
  const nextTrip = near ? `
    <section class="t-next c3" aria-labelledby="next-t">
      <div class="sec-head"><h2 id="next-t">Next trip to cancel</h2><a class="sec-link" href="#/plant/${near.p.id}">${esc(near.p.name)}</a></div>
      <div class="tn-map">${routeSvg(near.p.id, { w: 320, h: 180, crop: 'auto' })}</div>
      <p class="tn-line"><b>${esc(placeShort(near.j.from.place))}, ${esc(near.j.from.country)} → ${esc(near.j.to.name)}</b><span>${fmt(near.j.km)} km by ${esc(near.j.mode.replace('+', ' and '))}</span></p>
      <p class="tn-when">${near.left > 0 ? `Your ${esc(near.p.name.toLowerCase())} could be ready in about ${near.left} day${near.left === 1 ? '' : 's'}.` : `Your ${esc(near.p.name.toLowerCase())} may be ready to pick.`}
        ${near.j.sources[0]?.url ? `<a class="tn-src" href="${esc(near.j.sources[0].url)}" target="_blank" rel="noopener">Source</a>` : ''}</p>
    </section>` : '';

  const hr = new Date().getHours();
  const greet = `
    <header class="t-greet">
      <h1>${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}</h1>
      <p class="t-date">${new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </header>`;
  const month = new Date().toLocaleDateString('en-IE', { month: 'long' });
  const links = `
    <nav class="t-links" aria-label="More for today">
      <a class="t-link c3" href="#/sow">${icon('sow', { size: 28, color: true })}<span><b>Sow this month</b><em>What to plant in ${month}</em></span>${icon('chevron', { size: 18, cls: 'ti-go' })}</a>
      <a class="t-link c3" href="#/impact">${icon('impact', { size: 28, color: true })}<span><b>Your impact</b><em>${fmt(co2g)} g CO₂ · ${fmt(kg, 1)} kg grown</em></span>${icon('chevron', { size: 18, cls: 'ti-go' })}</a>
      <a class="t-link c3" href="#/rewards">${icon('star', { size: 28, color: true })}<span><b>Stickers</b><em>${Object.keys(rewards().stickers).length} collected</em></span>${icon('chevron', { size: 18, cls: 'ti-go' })}</a>
    </nav>`;

  main.innerHTML = `
  <div class="page today" data-tone="today">
    <div class="tgrid${fresh ? ' is-fresh' : ''}${nextTrip ? ' has-next' : ''}">
      ${greet}
      ${hero}
      ${fresh ? '' : '<div class="t-slot" id="care-slot"></div>'}
      ${fresh ? `
      <section class="t-plants" aria-labelledby="easy-t">
        <div class="sec-head"><h2 id="easy-t">${icon('sprout', { size: 24, color: true })}Easy in a pot</h2><a class="sec-link" href="#/find">See all</a></div>
        <ul class="pcards">${easy.map((p) => `<li class="pcard c3 pc-pick"><a class="pc-media" href="#/plant/${p.id}" tabindex="-1" aria-hidden="true">${media(p.id)}</a><div class="pc-body"><a class="pc-name" href="#/plant/${p.id}"><b>${esc(p.name)}</b></a><span class="pc-sub">${esc(p.grow?.days_to_harvest ? `Ready in ${p.grow.days_to_harvest[0]}–${p.grow.days_to_harvest[1]} days` : 'Easy to grow')}</span></div></li>`).join('')}</ul>
      </section>` : `
      <section class="t-plants" aria-labelledby="plants-t">
        <div class="sec-head"><h2 id="plants-t">Your plants</h2><a class="sec-link" href="#/find">${icon('plus', { size: 18, color: true })}Add</a></div>
        <ul class="psts" id="plants"></ul>
        <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
      </section>`}
      ${nextTrip}
      ${links}
    </div>
  </div>`;
  const stopHero = runFaces($('#hero', main));
  // a slot under the hero for other features (care help, weather): they listen for zm:today
  dispatchEvent(new CustomEvent('zm:today', { detail: { slot: $("#care-slot", main), main } }));

  // this week as date stamps: a photo day is stamped, a day the watering can saved says SAVED, a missed day can be filled in
  function dots() {
    const el = $('#dots'); if (!el) return;
    const photos = photoDays(), kept = savedDays(), first = state.garden.map((e) => e.planted).sort()[0];
    el.innerHTML = lastDays(7).map((d) => stampDay(d, { photos, kept, first, repair: true })).join('');
    $$('[data-repair]', el).forEach((b) => b.addEventListener('click', () => { $('#repair-in').dataset.date = b.dataset.repair; $('#repair-in').click(); }));
  }
  $('#repair-in')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0], d = e.target.dataset.date; e.target.value = '';
    if (!f || !d) return;
    const r = await analyseAndLog(entry, f, d);
    if (!(await photoParty(r, plantById(entry.id)))) toast('Added to your journal.');
    dispatchEvent(new HashChangeEvent('hashchange')); // the router redraws Today
  });
  const onRw = () => { const o = $('.th-odo', main); if (o) o.innerHTML = odometer(kmCancelled()); };
  addEventListener('zm:rewards', onRw);

  // your plants as their home stickers: name, day and a small log button (a harvest cancels its shop twin's trip)
  function rows() {
    const box = $('#plants'); if (!box) return;
    box.innerHTML = state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const tree = isTree(p), ok = tree ? !treePhotoDue(e).due : snappedToday(e);
      const age = tree ? treeAge(e) : `Day ${ageOf(e)} · ${stageName(e, p)}`;
      return `<li class="pst c3${ok ? ' done' : ''}" data-id="${e.id}">
        <a class="pst-a" href="#/plant/${e.id}"><span class="pst-stk">${stickerSvg(e.id, { kind: 'home', size: 104, day: ageOf(e), tilt: true })}</span><b>${esc(p.name)}</b></a>
        <span class="pst-sub">${esc(age)}${ok ? `<span class="pst-ok">${icon('check', { size: 16, color: true })}<span class="vh">, ${tree ? 'season photo done' : 'photo done today'}</span></span>` : ''}</span>
        <button class="b3 b3-sm b3-white pst-log" type="button" data-more aria-expanded="false">${tree && !isFruitTree(p) ? 'Log height' : 'Log a harvest'}<span class="vh"> for ${esc(p.name)}</span></button>
        <div class="amounts" hidden>
          ${!tree || isFruitTree(p) ? `<p class="am-h">Picked</p><div class="am-row">${[100, 250, 500, 1000].map((g) => `<button class="b3 b3-white b3-sm" type="button" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>` : ''}
          ${tree ? `<form class="hform"><label for="h-${e.id}">Height</label><input id="h-${e.id}" type="number" inputmode="numeric" min="1" max="6000" step="1" placeholder="cm" required><button class="b3 b3-sm">Save</button></form>` : ''}
        </div>
      </li>`;
    }).join('') + `<li class="pst pst-add"><a href="#/find">${icon('plus')}<b>Add a plant</b><span>Each one is a new sticker</span></a></li>`;
    const idOf = (el) => el.closest('.pst').dataset.id, find = (id) => state.garden.find((x) => x.id === id);
    $$('[data-more]', box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.pst').querySelector('.amounts'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); if (!h.hidden) h.querySelector('input, button')?.focus(); }));
    $$('.hform', box).forEach((f) => f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const cm = Math.round(+f.querySelector('input').value); if (!(cm > 0)) return;
      const e = find(idOf(f)); logHeight(e, cm);
      toast(`${plantById(e.id).name}: ${fmt(cm)} cm`);
      const r = f.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); rows();
    }));
    $$('[data-g]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); logHarvest(e, +b.dataset.g); haptic(12);
      rows(); changed();
      const out = award('harvest', { id: e.id }); // the app shows the trip cancelling and the odometer rolling
      if (!(out.km > 0)) toast('Harvest logged!');
      onRw();
    }));
  }
  // say stages once each: first sprout, first flower, ready to pick, and each tree's birthday
  function stages() {
    if (fresh) return;
    for (const e of state.garden) {
      const p = plantById(e.id); if (!p) continue;
      const st = stageName(e, p), said = e.stagesSeen ||= [];
      let msg = null, key = null;
      if (isTree(p)) {
        const y = Math.floor(dayDiff(e.planted, today()) / 365);
        if (y >= 1 && !said.includes(`year-${y}`)) { key = `year-${y}`; msg = `${y} year${y === 1 ? '' : 's'} since you planted your ${p.name.toLowerCase()}!`; }
        else if (st === 'Fruiting age' && !said.includes(st)) { key = st; msg = `Your ${p.name.toLowerCase()} is old enough to fruit soon.`; }
      } else {
        msg = !said.includes(st) ? { Sprout: `${p.name} has sprouted!`, Flowering: `First flowers on your ${p.name.toLowerCase()}!`, 'Ready to pick': `Your ${p.name.toLowerCase()} is ready to pick!` }[st] : null;
        key = st;
      }
      if (msg) { said.push(key); save(); setTimeout(() => { toast(msg); const r = $(`.pst[data-id="${e.id}"]`)?.getBoundingClientRect(); if (r) confetti(r.left + r.width / 2, r.top + r.height / 3, { count: 12 }); }, 600); break; }
    }
  }
  dots(); rows(); stages();
  return { unmount() { removeEventListener('zm:rewards', onRw); stopHero(); freeURLs(); } };
}

// ================= PHOTO =================
export async function snapView(main, id) {
  const D = await data();
  freeURLs();
  if (!state.garden.length) {
    const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 8);
    main.innerHTML = `<div class="page">
      <header class="page-head"><h1>Photo</h1></header>
      <section class="c3 empty3">${pip('point', { size: 140 })}<p>Add a plant first</p><a class="b3" href="#/find">Pick a plant</a></section>
      <section class="c3"><div class="card-head"><h2>Easy to start</h2><a class="b3 b3-white b3-sm" href="#/find">All</a></div><div class="tiles">${easy.map((p) => tile(p)).join('')}</div></section>
    </div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === id) || state.garden.find((e) => e.id === state.active) || state.garden[0];
  const CHECKS = `<ul class="checks" aria-label="What the app looks at">
    <li><i style="--c:#23774a"></i><span>Green</span></li>
    <li><i style="--c:#d9a441"></i><span>Yellowing</span></li>
    <li><i style="--c:#a8522d"></i><span>Dry edges</span></li></ul>`;
  main.innerHTML = `
  <div class="page snap ombre" data-tone="find">
    <header class="page-head"><h1>Photo</h1></header>
    <div class="chips" role="group" aria-label="Which plant" id="which"></div>
    <div class="snap-grid">
      <div class="snap-col">
        <div class="frame" id="frame"><div class="corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="hint" id="hint">Fill the frame</p></div>
        <div class="snap-actions">
          <label class="b3 b3-wide b3-xl" for="photo" id="snap-btn">${ICON.photo}Take a photo</label>
          <input id="photo" class="vh" type="file" accept="image/*" capture="environment">
        </div>
      </div>
      <div class="snap-col">
        <section class="c3" id="feedback" aria-live="polite">
          <div class="card-head"><h2>We look at</h2>${helpBtn('check', 'How the photo check works')}</div>
          ${CHECKS}
          <label class="toggle"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}><span>Smart check (90 MB)</span></label>
        </section>
        <section class="c3"><div class="card-head"><h2>Timeline</h2><span class="tag" id="count"></span></div><div class="timeline" id="timeline" tabindex="0" role="region" aria-label="Photo timeline"></div></section>
        <section class="c3 snap-tips" aria-labelledby="tips-t"><h2 id="tips-t">Good photos</h2>
          <ul class="tips3">
            <li>${icon('sun', { size: 24, color: true })}<span><b>Daylight, no flash.</b> Colours read true.</span></li>
            <li>${icon('leaf', { size: 24, color: true })}<span><b>Leaves fill the frame.</b> Less pot, more plant.</span></li>
            <li>${icon('pin', { size: 24, color: true })}<span><b>Same spot each time.</b> The ghost of your last photo helps you line up.</span></li>
          </ul></section>
      </div>
    </div>
  </div>`;
  const help = { check: { title: 'How the photo check works', body: `${CHECKS}<p>It counts fresh green, yellowing leaves (too much water or hungry soil) and dry brown edges (thirsty or too much sun).</p><p>Everything runs on this device. Nothing is uploaded.</p>` } };
  bindHelp(main, help);

  function chips() {
    $('#which').innerHTML = state.garden.map((e) => `<button class="chip pchip" type="button" data-id="${e.id}" aria-pressed="${e === entry}"><img src="${thumb(e.id)}" alt="" width="28" height="28">${esc(plantById(e.id)?.name || e.id)}${photoDone(e) ? `<span class="chip-tick">${ICON.check}<span class="vh">, done</span></span>` : ''}</button>`).join('');
    $$('#which [data-id]').forEach((b) => b.addEventListener('click', () => { entry = state.garden.find((e) => e.id === b.dataset.id); state.active = entry.id; save(); chips(); ghost(); timeline(); $(`#which [data-id="${entry.id}"]`)?.focus(); }));
  }
  async function ghost() {
    $$('#frame .ghost, #frame .shot').forEach((x) => x.remove());
    const last = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const b = last && await getPhoto(last.key);
    $('#hint').hidden = false;
    if (b) { const g = new Image(); g.className = 'ghost'; g.alt = ''; g.src = objURL(b); $('#frame').prepend(g); $('#hint').textContent = treeOf(entry) ? 'Same spot as last season' : 'Line it up with last time'; }
    else $('#hint').textContent = treeOf(entry) ? 'Fit the whole tree in' : 'Fill the frame';
  }
  async function timeline() {
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1));
    $('#count').textContent = `${logs.length}`;
    const t = $('#timeline');
    t.innerHTML = logs.length ? logs.map((l) => `<figure data-k="${l.key}"><img alt="${esc(plantById(entry.id).name)} on ${l.date}"><figcaption>${new Date(l.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}<b>${l.score}</b></figcaption></figure>`).join('') : `<p class="empty-line">${art('camera', { size: 40 })}Your first photo starts it</p>`;
    for (const f of $$('[data-k]', t)) { const b = await getPhoto(f.dataset.k); if (b && f.isConnected) f.querySelector('img').src = objURL(b); }
  }
  let stopFace = () => {};
  function show(res) {
    const fb = $('#feedback'); fb.removeAttribute('aria-busy');
    const m = res.m, pct = (x) => Math.round(x * 100);
    fb.innerHTML = `
      <div class="score"><div class="score-face">${pipPot(res.mood || 'okay', 'score-pot')}</div><div><h2><b data-count="${res.score}">${res.score}</b><span class="vh"> out of 100. </span></h2><p class="score-word">${esc(moodWord(res.mood))}</p></div></div>
      <div class="meter">
        <div><span>Green</span><div class="bar3"><i data-fill="${m.green.toFixed(3)}"></i></div><b>${pct(m.green)}%</b></div>
        <div><span>Yellow</span><div class="bar3 y"><i data-fill="${m.yellow.toFixed(3)}"></i></div><b>${pct(m.yellow)}%</b></div>
        <div><span>Dry</span><div class="bar3 dry"><i data-fill="${m.brown.toFixed(3)}"></i></div><b>${pct(m.brown)}%</b></div>
      </div>
      <ul class="notes">${res.notes.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    countAll(fb); fillAll(fb);
    stopFace(); stopFace = runFaces(fb);
  }
  $('#smart').addEventListener('change', async (e) => { state.smartAI = e.target.checked; save(); if (state.smartAI) (await import('./analyze.js?v=2')).loadSmart().catch(() => toast('Couldn’t download the smart check. The colour check still works.')); });
  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const frame = $('#frame');
    $$('#frame .ghost, #frame .shot').forEach((x) => x.remove());
    const shot = new Image(); shot.className = 'shot'; shot.alt = 'Your photo'; shot.src = objURL(file); frame.prepend(shot); $('#hint').hidden = true;
    const busy = document.createElement('div'); busy.className = 'busy'; busy.innerHTML = '<p>Looking at your leaves</p>'; frame.appendChild(busy);
    $('#feedback').setAttribute('aria-busy', 'true');
    let r;
    try {
      r = await analyseAndLog(entry, file, today(), (msg) => { busy.querySelector('p').textContent = msg; });
    } catch {
      busy.remove();
      const fb = $('#feedback'); fb.removeAttribute('aria-busy');
      fb.innerHTML = `<div class="empty3">${pip('sad', { size: 110 })}<h2>That photo didn’t work</h2><p>Try a JPEG or PNG.</p></div>`;
      return;
    }
    if (!reduced()) await new Promise((x) => setTimeout(x, 400));
    busy.remove();
    show(r.res);
    chips(); timeline();
    if (!(await photoParty(r, plantById(entry.id)))) { const b = $('#snap-btn').getBoundingClientRect(); burst(b.left + b.width / 2, b.top); haptic(12); toast('Photo saved to your timeline.'); }
  });
  chips(); ghost(); timeline();
  return { unmount() { stopFace(); freeURLs(); } };
}

// used by the plant page
export async function removePlant(id) {
  const e = state.garden.find((x) => x.id === id); if (!e) return;
  await Promise.all(e.log.map((l) => delPhoto(l.key)));
  state.garden = state.garden.filter((x) => x !== e); state.active = state.garden[0]?.id || null; save();
  changed();
}
export { addToGarden };
