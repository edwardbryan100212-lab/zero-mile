// Today (home of the app) and Photo (daily photo → on-device feedback → a full-screen celebration).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, addToGarden,
  overallStreak, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName, thumb,
  isTree, isFruitTree, treeAge, treePhotoDue, logHeight, treeSeason, bestTrees, dailyPlants, MONTH_NAMES,
  savedDays, earnSaver } from './core.js?v=9';
import { EASE, reduced, countUp, countAll, fillAll, confetti, haptic, helpBtn, bindHelp, pip, pop, floatGain, celebration, play, faceCanvas, runFaces } from './fun.js?v=9';
import { art, icon } from './art.js?v=9';
import { award, dailyQuests, rewards, level, onReward, saversHeld, SAVER_MAX } from './rewards.js?v=9';
import * as Face from './face.js?v=9';
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
  // XP, quests, milestones and badges; a retaken photo of the same day earns nothing twice
  const lv0 = level();
  const out = award('photo', { date, id: entry.id });
  changed();
  return { res, blob, before, after, out, earned, lv0 };
}

// Friendly headline for the photo: never lead with bad news; the tips on the result screen say what to do
const SNAP_LINE = { thriving: 'Looking amazing!', happy: 'Looking good!', okay: 'Growing along!', thirsty: 'Needs a drink?', poorly: 'Let\u2019s help it!', new: 'First photo!', sleepy: 'Growing along!' };
// ---------- the photo celebration on Pip's LCD: your photo once, the XP ticking up, the streak, then the rest ----------
async function photoParty({ res, blob, before, after, out, earned, lv0 }, plant) {
  const V = await RV();
  const qxp = (out.quests || []).reduce((a, q) => a + q.xp, 0), xp = out.xp - qxp;
  const big = after > before || xp > 0 || out.quests.length || out.unlocked.length || out.levelUp || out.bonus || out.milestones.length;
  if (!big) return false;
  const url = objURL(blob);
  const lv1 = level(lv0.xp + xp);
  const S = [{
    tone: 'leaf', sound: 'done', face: res.mood === 'poorly' || res.mood === 'thirsty' ? 'okay' : 'thriving',
    photo: url, photoAlt: `Your photo of ${esc(plant.name)}`, title: 'Photo saved', big: esc(SNAP_LINE[res.mood] || 'Growing along!'),
    sub: xp > 0 ? `+${xp} XP` : '',
    extra: xp > 0 ? `<div class="cele-extra"><div class="cele-lvl"><span>LV ${lv1.n}</span><div class="bar3"><i style="width:${(lv0.n === lv1.n ? lv0.p : 0) * 100}%"></i></div></div></div>` : '',
    onShow(el) {
      const fill = el.querySelector('.cele-lvl .bar3 > i'); if (!fill) return;
      setTimeout(() => { fill.style.width = `${lv1.p * 100}%`; }, reduced() ? 0 : 420);
    },
  }];
  if (after > before) {
    const share = [7, 30, 50, 100, 365].includes(after);
    S.push({
      tone: 'night', sound: 'streak', art: art('streak-sun', { size: 96 }), title: after === 1 ? 'Streak started' : 'Streak up',
      big: `<b class="cele-num">${before}</b>`, count: { from: before, to: after }, sub: 'day streak',
      extra: share ? `<div class="cele-extra"><button class="b3 b3-px" type="button" id="share-streak">${icon('share', { size: 18 })}Share</button></div>` : '',
      onShow(el) { el.querySelector('#share-streak')?.addEventListener('click', () => shareStreak(after, plant, blob)); },
    });
  }
  if (earned) S.push({ tone: 'sky', sound: 'quest', art: art('can-freeze', { size: 96 }), title: 'Watering can', big: `${saversHeld()} of ${SAVER_MAX}`, sub: 'it saves a missed day' });
  S.push(...V.rewardScreens(out));
  await celebration(S);
  return true;
}

// ================= TODAY =================
// The plant faces: Pip's LCD screen, drawn live by the shared face renderer (js/face.js) on small canvases
function faceLoop(canvases) {
  let raf = 0, stopped = false, last = 0;
  const items = [];
  import('./face.js?v=9').then(({ drawFace }) => {
    if (stopped) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of canvases) {
      const w = c.clientWidth || 64, h = c.clientHeight || w; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      items.push({ c, ctx: c.getContext('2d'), mood: c.dataset.mood || 'okay', phase: Math.random() * 6 });
    }
    const draw = (t) => { for (const it of items) { if (!it.c.isConnected) continue; it.ctx.clearRect(0, 0, it.c.width, it.c.height); drawFace(it.ctx, it.c.width, it.c.height, it.mood, t + it.phase); } };
    if (reduced()) { draw(0); return; }
    const tick = (now) => { if (stopped) return; if (now - last > 66) { last = now; draw(now / 1000); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }).catch(() => {});
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
const shortDay = (d) => new Date(d + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' });

const HELP = {
  streak: () => ({ title: 'How streaks work', body: `<ul class="help-rows">
    <li>${icon('camera')}<span><b>One photo a day</b> keeps your streak.</span></li>
    <li>${icon('check')}<span><b>3 quests a day.</b> Finish all 3 for bonus seeds.</span></li>
    <li>${icon('sun')}<span><b>Milestones</b> at 3, 7, 14, 30, 50, 100 and 365 days give a badge and seeds.</span></li>
    <li>${icon('water')}<span><b>A watering can</b> saves a missed day. Earn one every 7 days, or buy one for 50 seeds.</span></li>
    <li>${icon('tree')}<span><b>Trees</b> need a photo each season.</span></li></ul>` }),
};

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
  let miles = 0, co2g = 0, kg = 0;
  for (const e of state.garden) {
    const t = trip(plantById(e.id), state.region), k = harvestKg(e);
    kg += k; if (t) { miles += Math.round(t.crowMi * (e.harvests || []).length); co2g += Math.round(t.co2Transport * k * 1000); }
  }

  // Pip's face says how today is going: hello to a new grower, sleepy before today's photo, thriving after it, and
  // worried in the evening when the streak is at risk (streakRisk() and riskLine() come from js/onboard.js)
  const risk = !fresh && !anyToday && daily.length > 0 && streakRisk();
  const mood = fresh ? 'new' : anyToday ? 'thriving' : risk ? 'poorly' : !daily.length ? 'happy' : 'sleepy';
  const say = fresh ? 'Hi! I’m Pip' : anyToday ? (allDone ? 'All done today' : 'Nice one') : risk ? riskLine(n) : !daily.length ? 'Trees grow slowly' : 'Snap me today';
  const cta = fresh ? `<a class="b3 b3-solid" href="#/find">Pick a plant</a>`
    : !daily.length ? (treesDue ? `<a class="b3 b3-solid" href="#/snap">${ICON.photo}Seasonal photo</a>` : `<a class="b3" href="#/find">${ICON.plus}Add a plant</a>`)
    : allDone ? `<a class="b3" href="#/snap">${ICON.photo}Snap another</a>` : `<a class="b3 b3-solid${risk ? ' pulse3' : ''}" href="#/snap">${ICON.photo}Take today’s photo</a>`;
  const cans = saversHeld();

  const hero = `
    <section class="t-hero lcd${risk ? ' at-risk' : ''}" id="hero" aria-labelledby="streak-t">
      <div class="th-face">${faceCanvas(mood, 'th-pxface')}<p class="th-say">${esc(say)}</p></div>
      <div class="th-main">
        <h1 id="streak-t" class="th-num"><b data-count="${n}">${n}</b><span>day streak</span></h1>
        ${fresh ? '<p class="th-lead">One photo a day grows your streak.</p>' : '<div class="pxweek" role="group" aria-label="This week" id="dots"></div>'}
        <div class="th-row">${cta}${fresh ? '' : `<button class="th-cans" type="button" data-help="streak" aria-label="Watering cans: ${cans} of ${SAVER_MAX}. How streaks work">${[0, 1].map((k) => `<span class="${k < cans ? 'on' : ''}">${art('can-freeze', { size: 16 })}</span>`).join('')}</button>`}</div>
      </div>
    </section>`;

  const questCard = () => {
    const qs = dailyQuests(), d = rewards().days[today()] || {}, nDone = qs.filter((q) => q.done).length;
    return `<div class="lq-head"><h2 id="quest-t" class="lcd-h">Quests</h2><span class="lq-n" aria-label="${nDone} of 3 done">${nDone}/3</span></div>
      <ul class="lquests">${qs.map((q) => `<li class="${q.done ? 'done' : ''}">
        ${art(q.done ? 'check' : q.art, { size: 16 })}
        <span class="lq-label">${esc(q.label)}</span>
        <span class="lq-pay">${q.done ? 'Done' : q.need > 1 ? `${q.have}/${q.need}` : `+${q.xp} XP`}</span>
        <span class="vh">${q.done ? ', done' : `, ${q.have} of ${q.need}`}</span></li>`).join('')}</ul>
      <p class="lq-bonus${d.bonus || d.chest ? ' got' : ''}">${art('seed-gem', { size: 16 })}${d.bonus ? `+${d.bonus} seeds for all 3` : d.chest ? 'Bonus collected' : 'All 3: bonus seeds'}</p>`;
  };

  const impact = `
    <a class="t-impact c3" href="#/impact" aria-label="Your impact: ${fmt(miles)} food miles, ${fmt(co2g)} grams of CO2 saved, ${fmt(kg, 1)} kilograms grown, ${trees.length} trees. Open Impact">
      <span><b data-count="${miles}">${fmt(miles)}</b> food miles</span>
      <span><b data-count="${co2g}" data-suffix=" g">${fmt(co2g)} g</b> CO₂ saved</span>
      <span><b data-count="${kg.toFixed(1)}" data-dec="1">${fmt(kg, 1)}</b> kg grown</span>
      <span><b>${trees.length}</b> ${trees.length === 1 ? 'tree' : 'trees'}</span>
      ${icon('chevron', { size: 18, cls: 'ti-go' })}
    </a>`;

  main.innerHTML = `
  <div class="page today ombre" data-tone="today">
    <div class="tgrid${fresh ? ' is-fresh' : ''}">
      ${hero}
      <section class="t-quests lcd" id="quests" aria-labelledby="quest-t">${questCard()}</section>
      <div class="t-slot" id="care-slot"></div>
      ${fresh ? `
      <section class="t-plants" aria-labelledby="easy-t">
        <div class="sec-head"><h2 id="easy-t">Easy in a pot</h2><a class="sec-link" href="#/find">See all</a></div>
        <ul class="pcards">${easy.map((p) => `<li class="pcard c3 pc-pick"><a class="pc-pic" href="#/plant/${p.id}" tabindex="-1" aria-hidden="true"><img src="${picOf(p.id)}" alt="" width="320" height="240" loading="lazy"></a><div class="pc-body"><a class="pc-name" href="#/plant/${p.id}"><b>${esc(p.name)}</b></a><span class="pc-sub">${esc(p.grow?.days_to_harvest ? `Ready in ${p.grow.days_to_harvest[0]}–${p.grow.days_to_harvest[1]} days` : 'Easy to grow')}</span></div></li>`).join('')}</ul>
      </section>` : `
      <section class="t-plants" aria-labelledby="plants-t">
        <div class="sec-head"><h2 id="plants-t">Your plants</h2><a class="sec-link" href="#/find">${ICON.plus}Add</a></div>
        <ul class="pcards" id="plants"></ul>
        <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
      </section>
      ${impact}`}
    </div>
  </div>`;

  bindHelp(main, HELP);
  countAll(main); fillAll(main);
  const stopHero = runFaces($('#hero', main));
  // a slot under the hero for other features (care help, weather): they listen for zm:today
  dispatchEvent(new CustomEvent('zm:today', { detail: { slot: $("#care-slot", main), main } }));

  function refreshGame() {
    const q = $('#quests'); if (!q) return;
    q.innerHTML = questCard();
  }
  const offReward = onReward((o, kind) => { if (kind !== 'photo') setTimeout(refreshGame, 0); });
  addEventListener('zm:rewards', refreshGame);

  // this week as pixel dots: lit for a photo, half-lit for a day the watering can saved, a missed day can be filled in
  function dots() {
    const el = $('#dots'); if (!el) return;
    const days = photoDays(), kept = savedDays(), first = state.garden.map((e) => e.planted).sort()[0];
    el.innerHTML = '';
    for (const d of lastDays(7)) {
      const dn = shortDay(d);
      const did = days.has(d), sav = !did && kept.has(d), isToday = d === today(), missed = !did && !sav && !isToday && d >= first;
      const t = document.createElement(missed ? 'button' : 'div');
      t.className = `pxd${did ? ' did' : ''}${sav ? ' sav' : ''}${isToday ? ' tdy' : ''}${missed ? ' miss' : ''}`;
      const sayD = `${dn}${did ? ', photo taken' : sav ? ', saved by the watering can' : missed ? ', no photo, tap to add one from that day' : ''}${isToday ? ', today' : ''}`;
      if (missed) { t.type = 'button'; t.setAttribute('aria-label', sayD); }
      t.innerHTML = `${missed ? '' : `<span class="vh">${sayD}</span>`}<i aria-hidden="true">${missed ? art('plus', { size: 16 }) : ''}</i><span aria-hidden="true">${dn.slice(0, 1)}</span>`;
      if (missed) t.addEventListener('click', () => { $('#repair-in').dataset.date = d; $('#repair-in').click(); });
      el.appendChild(t);
    }
  }
  $('#repair-in')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0], d = e.target.dataset.date; e.target.value = '';
    if (!f || !d) return;
    const r = await analyseAndLog(entry, f, d);
    if (!(await photoParty(r, plantById(entry.id)))) toast('Added to your journal.');
    dispatchEvent(new HashChangeEvent('hashchange')); // the router redraws Today
  });

  // one card per plant: your latest photo (or a real reference photo), Pip's mood on a tiny LCD, Photo / Water / more
  let stopFaces = () => {};
  function rows() {
    const box = $('#plants'); if (!box) return;
    stopFaces();
    box.innerHTML = state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const tree = isTree(p), w = wateredToday(e), md = moodOf(e);
      const ok = tree ? !treePhotoDue(e).due : snappedToday(e);
      const age = tree ? treeAge(e) : `Day ${dayDiff(e.planted, today()) + 1} · ${stageName(e, p)}`;
      return `<li class="pcard c3${ok ? ' done' : ''}" data-id="${e.id}">
        <a class="pc-pic" href="#/plant/${e.id}" tabindex="-1" aria-hidden="true"><img src="${picOf(e.id)}" alt="" width="320" height="240" loading="lazy" data-ref></a>
        <span class="pc-mood lcd" title="${esc(moodWord(md))}">${faceCanvas(md)}<span class="vh">${esc(p.name)} feels: ${esc(moodWord(md))}</span></span>
        <div class="pc-body"><a class="pc-name" href="#/plant/${e.id}"><b>${esc(p.name)}</b></a><span class="pc-sub">${esc(age)}</span></div>
        <div class="pc-acts">
          ${ok ? `<span class="pc-ok">${ICON.check}${tree ? 'Season done' : 'Photo done'}</span>` : `<a class="b3 b3-sm" href="#/snap/${e.id}">${ICON.photo}Photo</a>`}
          <button class="b3 b3-sm b3-white pc-water" type="button" data-water aria-pressed="${w}">${ICON.water}<span>${w ? 'Watered' : 'Water'}</span><span class="vh"> ${esc(p.name)}</span></button>
          <button class="b3 b3-sm b3-white b3-sq" type="button" data-more aria-expanded="false" aria-label="Log ${tree ? 'height or harvest' : 'a harvest'} for ${esc(p.name)}">${ICON.more}</button>
        </div>
        <div class="amounts" hidden>
          ${!tree || isFruitTree(p) ? `<p class="am-h">Picked</p><div class="am-row">${[100, 250, 500, 1000].map((g) => `<button class="b3 b3-white b3-sm" type="button" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>` : ''}
          ${tree ? `<form class="hform"><label for="h-${e.id}">Height</label><input id="h-${e.id}" type="number" inputmode="numeric" min="1" max="6000" step="1" placeholder="cm" required><button class="b3 b3-sm">Save</button></form>` : ''}
        </div>
      </li>`;
    }).join('') + `<li><a class="pc-add" href="#/find">${icon('plus')}Add a plant<span>Herbs, veg, fruit or a tree</span></a></li>`;
    stopFaces = runFaces(box);
    // your own latest photo replaces the reference picture
    for (const li of $$('.pcard[data-id]', box)) {
      const e = state.garden.find((x) => x.id === li.dataset.id), last = [...e.log].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      if (last) getPhoto(last.key).then((b) => { if (b && li.isConnected) { const img = li.querySelector('[data-ref]'); img.src = objURL(b); img.closest('.pc-pic').classList.add('own'); } }).catch(() => {});
    }
    const idOf = (el) => el.closest('.pcard').dataset.id, find = (id) => state.garden.find((x) => x.id === id);
    $$('[data-water]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); const on = toggleWatered(e);
      b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = on ? 'Watered' : 'Water';
      play(on ? 'water' : 'toggle');
      if (on) { haptic(10); drops(b); const out = award('water', { id: e.id }); if (out.xp) floatGain(b, `+${out.xp - out.quests.reduce((a, q) => a + q.xp, 0)} XP`, 'sky'); }
    }));
    $$('[data-more]', box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.pcard').querySelector('.amounts'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); if (!h.hidden) h.querySelector('input, button')?.focus(); }));
    $$('.hform', box).forEach((f) => f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const cm = Math.round(+f.querySelector('input').value); if (!(cm > 0)) return;
      const e = find(idOf(f)); logHeight(e, cm);
      toast(`${plantById(e.id).name}: ${fmt(cm)} cm`);
      const r = f.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); rows();
    }));
    $$('[data-g]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); logHarvest(e, +b.dataset.g);
      const t = trip(plantById(e.id), state.region);
      toast(t ? `${fmt(t.crowMi)} food miles skipped!` : 'Harvest logged!');
      const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); haptic(12);
      award('harvest', { id: e.id }); rows(); changed();
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
      if (msg) { said.push(key); save(); setTimeout(() => { toast(msg); const r = $(`.pcard[data-id="${e.id}"]`)?.getBoundingClientRect(); if (r) confetti(r.left + r.width / 2, r.top + r.height / 3, { count: 24 }); }, 600); break; }
    }
  }
  dots(); rows(); stages();
  return { unmount() { offReward(); removeEventListener('zm:rewards', refreshGame); stopFaces(); stopHero(); freeURLs(); } };
}
// three water drops falling from the Water button
function drops(b) {
  if (reduced()) return;
  const r = b.getBoundingClientRect();
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('i'); d.className = 'drop'; d.setAttribute('aria-hidden', 'true');
    d.style.left = `${r.left + r.width * (.3 + i * .2)}px`; d.style.top = `${r.top - 6}px`;
    document.body.appendChild(d);
    d.animate([{ transform: 'translateY(-10px) scale(.6)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1, offset: .3 }, { transform: 'translateY(26px) scale(.8)', opacity: 0 }], { duration: 600, delay: i * 70, easing: EASE }).onfinish = () => d.remove();
  }
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
      <div class="score"><div class="score-face"><canvas data-mood="${res.mood || 'okay'}"></canvas></div><div><h2><b data-count="${res.score}">${res.score}</b><span class="vh"> out of 100. </span></h2><p class="score-word">${esc(moodWord(res.mood))}</p></div></div>
      <div class="meter">
        <div><span>Green</span><div class="bar3"><i data-fill="${m.green.toFixed(3)}"></i></div><b>${pct(m.green)}%</b></div>
        <div><span>Yellow</span><div class="bar3 y"><i data-fill="${m.yellow.toFixed(3)}"></i></div><b>${pct(m.yellow)}%</b></div>
        <div><span>Dry</span><div class="bar3 dry"><i data-fill="${m.brown.toFixed(3)}"></i></div><b>${pct(m.brown)}%</b></div>
      </div>
      <ul class="notes">${res.notes.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    countAll(fb); fillAll(fb);
    stopFace(); stopFace = faceLoop($$('canvas[data-mood]', fb));
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
