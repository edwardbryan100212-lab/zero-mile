// Today (home of the app) and Photo (daily photo → on-device feedback → a full-screen celebration).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, addToGarden,
  overallStreak, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName, thumb,
  isTree, isFruitTree, treeAge, treePhotoDue, logHeight, treeSeason, bestTrees, dailyPlants, MONTH_NAMES,
  savedDays, earnSaver } from './core.js?v=9';
import { EASE, reduced, countUp, countAll, fillAll, confetti, haptic, helpBtn, bindHelp, pip, pop, floatGain, celebration } from './fun.js?v=9';
import { art } from './art.js?v=9';
import { award, dailyQuests, rewards, level, onReward, saversHeld, SAVER_MAX } from './rewards.js?v=9';
import * as Face from './face.js?v=9';
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
const moodWord = (m) => Face.moodWord?.(m) || WORDS[m] || WORDS.okay;
const RV = () => import('./rewards-view.js?v=9');

const urls = [];
const objURL = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const freeURLs = () => { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const changed = () => dispatchEvent(new Event('zm:garden'));

// small control glyphs, filled and chunky (pictures come from art())
const ICON = {
  photo: '<svg class="gi" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8a2 2 0 0 1 2-2h2l1.6-2.4h6.8L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.6" r="3.8" fill="var(--cut, #fff)"/></svg>',
  water: '<svg class="gi" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5s7 7.6 7 12.2a7 7 0 0 1-14 0c0-4.6 7-12.2 7-12.2z"/></svg>',
  check: '<svg class="gi gi-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg class="gi gi-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  more: '<svg class="gi" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>',
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

// ---------- a small burst of leaves: the celebration when something is logged ----------
export function burst(x, y) { confetti(x, y, { count: 16, spread: .8 }); }

// ---------- share card for streak milestones ----------
function shareCard(n, plant, photoBlob) {
  return new Promise((resolve) => {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#3fae49'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#2b8a34'; x.fillRect(0, H - 200, W, 200);
    x.fillStyle = '#ffc531'; x.beginPath(); x.arc(220, 300, 130, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = '900 300px Nunito, ui-rounded, sans-serif'; x.fillText(String(n), 400, 400);
    x.font = '900 84px Nunito, ui-rounded, sans-serif'; x.fillText('day streak', 80, 560);
    x.font = '800 52px Nunito, ui-rounded, sans-serif'; x.fillText(`Growing ${plant.name.toLowerCase()}`, 80, 640);
    x.font = '900 64px Nunito, ui-rounded, sans-serif'; x.fillText('Zero Mile', 80, H - 76);
    const done = () => c.toBlob((b) => resolve({ canvas: c, blob: b }), 'image/png');
    if (!photoBlob) return done();
    const img = new Image();
    img.onload = () => { const s = 520, k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
      x.save(); x.beginPath(); x.roundRect(W - s - 80, 700, s, s * .72, 40); x.clip(); x.drawImage(img, W - s - 80 + (s - w) / 2, 700 + (s * .72 - h) / 2, w, h); x.restore(); done(); };
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
  // XP, quests, chests and badges; a retaken photo of the same day earns nothing twice
  const lv0 = level();
  const out = award('photo', { date, id: entry.id });
  changed();
  return { res, blob, before, after, out, earned, lv0 };
}

// Friendly headline for the photo: never lead with bad news; the tips on the result screen say what to do
const SNAP_LINE = { thriving: 'Looking amazing!', happy: 'Looking good!', okay: 'Growing along!', thirsty: 'Needs a drink?', poorly: 'Let\u2019s help it!', new: 'First photo!', sleepy: 'Growing along!' };
// ---------- the photo celebration: Pip cheers, XP counts up, the sun grows, then quests, chests, badges, level ----------
async function photoParty({ res, blob, before, after, out, earned, lv0 }, plant) {
  const V = await RV();
  const qxp = (out.quests || []).reduce((a, q) => a + q.xp, 0), xp = out.xp - qxp;
  const big = after > before || xp > 0 || out.quests.length || out.unlocked.length || out.levelUp || out.chest || out.milestones.length;
  if (!big) return false;
  const url = objURL(blob);
  const lv1 = level(lv0.xp + xp);
  const S = [{
    tone: 'leaf', title: 'Great snap!', big: esc(SNAP_LINE[res.mood] || 'Growing along!'),
    art: `<div class="snap-pol"><img src="${url}" alt="Your photo of ${esc(plant.name)}"></div><div class="cele-pip">${pip('cheer', { size: 120 })}</div>`,
  }];
  if (xp > 0) S.push({
    tone: 'sky', title: 'XP earned', art: art('xp-bolt', { size: 140 }), big: `<b id="cx-n">+0</b> XP`,
    extra: `<div class="cele-extra"><div class="cele-lvl"><span>Level ${lv1.n}</span>${`<div class="bar3" style="--c:var(--sun)"><i style="width:${(lv0.n === lv1.n ? lv0.p : 0) * 100}%"></i></div>`}</div></div>`,
    onShow(el) {
      countUp(el.querySelector('#cx-n'), xp, { dur: 800, suffix: '' }); setTimeout(() => { const b = el.querySelector('#cx-n'); if (b) b.textContent = `+${xp}`; }, reduced() ? 0 : 820);
      const bar = el.querySelector('.cele-lvl .bar3'), fill = bar.firstElementChild;
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${lv1.p * 100}%`; if (!reduced()) setTimeout(() => bar.classList.add('shine'), 500); }));
    },
  });
  if (after > before) {
    const share = [7, 30, 50, 100, 365].includes(after);
    S.push({
      tone: 'night', title: after === 1 ? 'Streak started!' : 'Streak up!', art: `<div class="sun-grow">${art('streak-sun', { size: 170 })}</div>`, big: `<b id="cs-n">${before}</b>`, sub: 'day streak',
      extra: share ? `<div class="cele-extra"><button class="b3 b3-sun" type="button" id="share-streak">Share my streak</button></div>` : '',
      onShow(el) {
        const sun = el.querySelector('.sun-grow');
        if (!reduced()) sun.animate([{ transform: 'scale(.7)' }, { transform: 'scale(1.12)', offset: .6 }, { transform: 'scale(1)' }], { duration: 760, delay: 200, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' });
        setTimeout(() => countUp(el.querySelector('#cs-n'), after, { from: before, dur: 600 }), reduced() ? 0 : 380);
        el.querySelector('#share-streak')?.addEventListener('click', () => shareStreak(after, plant, blob));
      },
    });
  }
  if (earned) S.push({ tone: 'sky', title: 'Streak saver!', art: art('can-freeze', { size: 150 }), big: `${saversHeld()}/${SAVER_MAX}`, sub: 'cans held' });
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
  streak: () => ({ title: 'How it works', body: `<ul class="help-rows">
    <li>${art('camera', { size: 48 })}<span><b>One photo a day</b> keeps your streak.</span></li>
    <li>${art('quest-photo', { size: 48 })}<span><b>3 quests</b> a day. Finish all 3 for a chest.</span></li>
    <li>${art('chest', { size: 48 })}<span><b>Streak chests</b> at 3, 7, 14, 30, 50, 100 and 365 days.</span></li>
    <li>${art('can-freeze', { size: 48 })}<span><b>Watering can</b> saves a missed day. Earn one each 7 days, or buy one for 50 seeds.</span></li>
    <li>${art('tree', { size: 48 })}<span><b>Trees</b> need a photo each season.</span></li></ul>` }),
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
  const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 8);
  const hour = new Date().getHours();

  // impact so far (same sums as the Impact screen)
  let miles = 0, co2g = 0, kg = 0;
  for (const e of state.garden) {
    const t = trip(plantById(e.id), state.region), k = harvestKg(e);
    kg += k; if (t) { miles += Math.round(t.crowMi * (e.harvests || []).length); co2g += Math.round(t.co2Transport * k * 1000); }
  }

  // Pip's mood: waving to a new grower, sleepy before today's photo, cheering after it, sad when the streak is at risk
  const pose = fresh ? 'wave' : anyToday ? 'cheer' : n > 0 && hour >= 18 ? 'sad' : !daily.length ? 'proud' : 'sleepy';
  const say = fresh ? 'Hi! I’m Pip' : anyToday ? (allDone ? 'All done!' : 'Yay!') : n > 0 && hour >= 18 ? 'Don’t lose it!' : !daily.length ? 'Trees grow slowly' : 'Snap me!';
  const cta = fresh ? `<a class="b3 b3-sun b3-wide" href="#/find">${art('quest-learn', { size: 26 })}Pick a plant</a>`
    : !daily.length ? (treesDue ? `<a class="b3 b3-sun b3-wide" href="#/snap">${ICON.photo}Seasonal photo</a>` : `<a class="b3 b3-white b3-wide" href="#/find">${ICON.plus}Add a plant</a>`)
    : allDone ? `<span class="done-pill">${ICON.check}Done today</span>` : `<a class="b3 b3-sun b3-wide" href="#/snap">${ICON.photo}Take photo</a>`;
  const cans = saversHeld();

  const hero = `
    <section class="d-hero" id="hero" aria-labelledby="streak-t">
      <div class="hero-pip"><span class="bubble">${say}</span>${pip(pose, { size: 168, mood: pose === 'sad' ? 'sad' : 'happy' })}</div>
      <div class="hero-main">
        <h1 id="streak-t" class="hero-num">${art('streak-sun', { size: 76, cls: anyToday ? 'lit' : 'dim' })}<span><b data-count="${n}">${n}</b><em>day streak</em></span></h1>
        ${fresh ? '' : `<div class="dots" role="group" aria-label="This week" id="dots"></div>`}
        <div class="hero-row">${cta}${fresh ? '' : `<button class="cans" type="button" data-help="streak" aria-label="Watering cans: ${cans} of ${SAVER_MAX}. How it works">${[0, 1].map((k) => `<span class="${k < cans ? 'on' : ''}">${art('can-freeze', { size: 30 })}</span>`).join('')}</button>`}</div>
      </div>
    </section>`;

  const questCard = () => {
    const qs = dailyQuests(), d = rewards().days[today()] || {}, nDone = qs.filter((q) => q.done).length;
    const chest = d.chest === 'ready' ? `<button class="q-chest shake" type="button" data-chest="day:${today()}" aria-label="Open your daily chest">${art('chest', { size: 56 })}</button>`
      : d.chest === 'open' ? `<span class="q-chest" role="img" aria-label="Daily chest opened">${art('chest-open', { size: 56 })}</span>`
        : `<span class="q-chest locked" role="img" aria-label="Daily chest: ${nDone} of 3 quests done">${art('chest', { size: 56, cls: 'locked' })}<i>${nDone}/3</i></span>`;
    return `<div class="card-head"><h2 id="quest-t">Daily quests</h2>${chest}</div>
      <ul class="quests">${qs.map((q) => `<li class="quest${q.done ? ' done' : ''}">
        <span class="q-art">${art(q.art, { size: 48 })}</span>
        <div class="q-body"><p class="q-top"><b>${esc(q.label)}</b><span class="q-n" aria-hidden="true">${q.have}/${q.need}</span></p><div class="bar3" style="--c:var(${q.done ? '--leaf' : '--sun'})" role="progressbar" aria-label="${esc(q.label)}" aria-valuemin="0" aria-valuemax="${q.need}" aria-valuenow="${q.have}"><i data-fill="${(q.have / q.need).toFixed(3)}"></i></div></div>
        <span class="q-pay">${q.done ? `<span class="q-tick">${ICON.check}</span>` : `${art('xp-bolt', { size: 22 })}<b>${q.xp}</b>`}</span></li>`).join('')}</ul>`;
  };

  const stats = `
    <section class="d-stats" aria-label="Your impact so far">
      <a class="chip3 c-sky" href="#/impact">${art('lorry', { size: 44 })}<b data-count="${miles}">${fmt(miles)}</b><span>food miles</span></a>
      <a class="chip3 c-leaf" href="#/impact">${art('cloud-co2', { size: 44 })}<b data-count="${co2g}" data-suffix=" g">${fmt(co2g)} g</b><span>CO₂ saved</span></a>
      <a class="chip3 c-leaf" href="#/impact">${art('tree', { size: 44 })}<b data-count="${trees.length}">${trees.length}</b><span>trees</span></a>
      <a class="chip3 c-tomato" href="#/impact">${art('basket', { size: 44 })}<b data-count="${kg.toFixed(1)}" data-dec="1">${fmt(kg, 1)}</b><span>kg grown</span></a>
    </section>`;

  // the seasonal tree card: one big picture, a few trees to tap
  const s = treeSeason(), m = new Date().getMonth() + 1, bt = bestTrees().slice(0, 4), top = bt[0];
  const treeCard = top ? `
    <section class="c3 d-tree" aria-labelledby="tree-t">
      <div class="tree-body">
        <p class="tree-when">${art('calendar', { size: 26 })}${s ? (s.on ? 'Planting season' : `From ${MONTH_NAMES[s.next - 1]}`) : 'Trees'}</p>
        <h2 id="tree-t">${s?.on ? `Plant a tree this ${seasonWord(m)}` : 'Plant a tree'}</h2>
        <ul class="tree-picks">${bt.slice(1).map((p) => `<li><a href="#/plant/${p.id}" aria-label="${esc(p.name)}"><img src="${thumb(p.id)}" alt="" width="64" height="64" loading="lazy"></a></li>`).join('')}</ul>
        <a class="b3 b3-white" href="#/find/trees">All trees</a>
      </div>
      <a class="tree-pic" href="#/plant/${top.id}" aria-label="${esc(top.name)}"><img src="${thumb(top.id)}" alt="" width="220" height="220"><span>${esc(top.name)}</span></a>
    </section>` : '';

  const V = await RV();
  main.innerHTML = `
  <div class="page today">
    <div class="dash${fresh ? ' is-fresh' : ''}">
      ${hero}
      <section class="c3 d-quests" id="quests" aria-labelledby="quest-t">${questCard()}</section>
      ${fresh ? '' : `
      <section class="c3 d-pot" aria-label="Your plant in its pot">
        <div class="stage3d" id="pot-stage"></div>
        <div class="pot-info"><h2 id="pot-name">${esc(plantById(entry.id).name)}</h2><span class="tag" id="pot-age"></span><p class="pot-mood" id="pot-mood"></p></div>
      </section>
      <section class="c3 d-plants" aria-labelledby="plants-t">
        <div class="card-head"><h2 id="plants-t">Your plants</h2><a class="b3 b3-white b3-sm" href="#/find">${ICON.plus}Add</a></div>
        <ul class="ptiles" id="plants"></ul>
        <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
      </section>`}
      <section class="c3 d-path" aria-labelledby="path-t">
        <div class="card-head"><h2 id="path-t">Streak chests</h2>${helpBtn('streak', 'How streaks work')}</div>
        <div id="mpath">${V.milestonePath(n, { compact: true })}</div>
      </section>
      ${stats}
      ${treeCard}
      ${fresh ? `
      <section class="c3 d-sow" aria-labelledby="easy-t">
        <div class="card-head"><h2 id="easy-t">Easy in a pot</h2><a class="b3 b3-white b3-sm" href="#/find">All</a></div>
        <div class="tiles">${easy.map((p) => tile(p)).join('')}</div>
      </section>` : ''}
    </div>
  </div>`;

  bindHelp(main, HELP);
  countAll(main); fillAll(main);
  pop($('.hero-pip .pipw', main), { delay: 120 });
  // green fluted glass behind the streak hero (the only place it stays)
  const { fluted } = await import('./fluted.js?v=9');
  const bg = fluted($('#hero'));

  // chests: today's (in the quest card) and the streak ones (on the path)
  const bindChests = (root) => $$('[data-chest]', root).forEach((b) => b.addEventListener('click', async () => {
    await V.openChestFlow(b.dataset.chest); refreshGame();
  }));
  function refreshGame() {
    const q = $('#quests'); if (!q) return;
    q.innerHTML = questCard(); fillAll(q); bindChests(q);
    const p = $('#mpath'); if (p) { p.innerHTML = V.milestonePath(overallStreak(), { compact: true }); bindChests(p); }
  }
  bindChests(main);
  const offReward = onReward((o, kind) => { if (kind !== 'photo') setTimeout(refreshGame, 0); });
  addEventListener('zm:rewards', refreshGame);

  let v = null, pot = null, stopFaces = () => {};
  if (!fresh) {
    const [{ createViewer }, { makePot }] = await Promise.all([import('./viewer.js?v=9'), import('./pot3d.js?v=2'), import('./trees3d.js?v=9')]);
    v = createViewer($('#pot-stage'), { controls: true, spin: false });
    v.onFrame = (dt) => pot?.tick(dt);
    garden.makePot = makePot;
  }

  function drawPot() {
    if (!v) return;
    const id = entry.id, t = growthT(entry), tree = treeOf(entry);
    pot = null;
    if (tree) v.setPlant(id, t);
    else v.setPlant(id, t, { extraObject: (box) => { const size = box.getSize(new (box.min.constructor)()); pot = garden.makePot(Math.max(.07, Math.max(size.x, size.z) * .32, size.y * .16)); return pot.group; } });
    const md = moodOf(entry); pot?.setMood(md); v.stage.rotation.y = .6; v.kick();
    const p = plantById(entry.id), age = dayDiff(entry.planted, today());
    $('#pot-name').textContent = p.name;
    if (tree) {
      const due = treePhotoDue(entry);
      $('#pot-age').textContent = treeAge(entry);
      $('#pot-mood').textContent = due.due ? 'Seasonal photo due' : `Next photo in ${due.days} days`;
      return;
    }
    $('#pot-age').textContent = age === 0 ? 'Planted today' : `Day ${age + 1}`;
    $('#pot-mood').textContent = `${moodWord(md)} · ${stageName(entry, p)}`;
  }

  // this week: photo days show the photo, a day saved by the watering can shows the can, a missed day can be filled in
  async function dots() {
    const el = $('#dots'); if (!el) return;
    const days = photoDays(), kept = savedDays(), first = state.garden.map((e) => e.planted).sort()[0];
    el.innerHTML = '';
    for (const d of lastDays(7)) {
      const dn = shortDay(d);
      const did = days.has(d), sav = !did && kept.has(d), isToday = d === today(), missed = !did && !sav && !isToday && d >= first;
      const t = document.createElement(missed ? 'button' : 'div');
      t.className = `dot${did ? ' done' : ''}${sav ? ' kept' : ''}${isToday ? ' is-today' : ''}${missed ? ' miss' : ''}`;
      const sayD = `${dn}${did ? ', photo taken' : sav ? ', saved by the watering can' : missed ? ', no photo, tap to add one from that day' : ''}${isToday ? ', today' : ''}`;
      if (missed) { t.type = 'button'; t.setAttribute('aria-label', sayD); t.innerHTML = `<i>${ICON.plus}</i><span>${dn.slice(0, 1)}</span>`; }
      else t.innerHTML = `<span class="vh">${sayD}</span><i aria-hidden="true">${sav ? art('can-freeze', { size: 26 }) : ''}</i><span aria-hidden="true">${dn.slice(0, 1)}</span>`;
      if (missed) t.addEventListener('click', () => { $('#repair-in').dataset.date = d; $('#repair-in').click(); });
      el.appendChild(t);
      if (did) {
        const l = state.garden.flatMap((e) => e.log).find((x) => x.date === d);
        const b = l && await getPhoto(l.key);
        if (b && t.isConnected) { const img = new Image(); img.alt = ''; img.src = objURL(b); t.querySelector('i').appendChild(img); }
      }
    }
  }
  $('#repair-in')?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0], d = e.target.dataset.date; e.target.value = '';
    if (!f || !d) return;
    const r = await analyseAndLog(entry, f, d);
    if (!(await photoParty(r, plantById(entry.id)))) toast('Added to your journal.');
    dispatchEvent(new HashChangeEvent('hashchange')); // the router redraws Today
  });

  // one tile per plant: Pip's face for its mood, day count, one-tap Photo and Water
  function rows() {
    const box = $('#plants'); if (!box) return;
    stopFaces();
    box.innerHTML = state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const tree = isTree(p), w = wateredToday(e), md = moodOf(e);
      const ok = tree ? !treePhotoDue(e).due : snappedToday(e);
      const age = tree ? treeAge(e) : `Day ${dayDiff(e.planted, today()) + 1}`;
      return `<li class="ptile${e === entry ? ' active' : ''}${ok ? ' done' : ''}" data-id="${e.id}">
        <button class="pt-face" type="button" data-pick aria-label="${esc(p.name)} feels: ${esc(moodWord(md))}. Show in the pot"><canvas data-mood="${md}"></canvas><img src="${thumb(e.id)}" alt="" width="44" height="44" loading="lazy"></button>
        <a class="pt-name" href="#/plant/${e.id}"><b>${esc(p.name)}</b><span>${age}</span></a>
        <div class="pt-acts">
          ${ok ? `<span class="pt-ok" role="img" aria-label="${tree ? 'Seasonal photo done' : 'Photo done today'}">${ICON.check}</span>` : `<a class="b3 b3-sun b3-sq" href="#/snap/${e.id}" aria-label="Photo of ${esc(p.name)}">${ICON.photo}</a>`}
          <button class="b3 b3-sq ${w ? 'b3-sky' : 'b3-white'} water" type="button" data-water aria-pressed="${w}" aria-label="${w ? 'Watered' : 'Water'} ${esc(p.name)}">${ICON.water}</button>
          ${`<button class="b3 b3-white b3-sq" type="button" data-more aria-expanded="false" aria-label="Log ${tree ? 'height or harvest' : 'a harvest'} for ${esc(p.name)}">${ICON.more}</button>`}
        </div>
        <div class="amounts" hidden>
          ${!tree || isFruitTree(p) ? `<p class="am-h">${art('basket', { size: 28 })}Picked</p><div class="am-row">${[100, 250, 500, 1000].map((g) => `<button class="b3 b3-white b3-sm" type="button" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>` : ''}
          ${tree ? `<form class="hform"><label for="h-${e.id}">Height</label><input id="h-${e.id}" type="number" inputmode="numeric" min="1" max="6000" step="1" placeholder="cm" required><button class="b3 b3-sm">Save</button></form>` : ''}
        </div>
      </li>`;
    }).join('');
    stopFaces = faceLoop($$('canvas[data-mood]', box));
    const idOf = (el) => el.closest('.ptile').dataset.id, find = (id) => state.garden.find((x) => x.id === id);
    $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => {
      const id = idOf(b); entry = find(id); state.active = id; save(); drawPot();
      $$('.ptile', box).forEach((c) => c.classList.toggle('active', c.dataset.id === id));
      if (matchMedia('(max-width: 999px)').matches) $('#pot-stage')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    }));
    $$('[data-water]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); const on = toggleWatered(e);
      b.setAttribute('aria-pressed', on); b.classList.toggle('b3-sky', on); b.classList.toggle('b3-white', !on);
      b.setAttribute('aria-label', `${on ? 'Watered' : 'Water'} ${plantById(e.id).name}`);
      if (on) { haptic(10); drops(b); const out = award('water', { id: e.id }); if (out.xp) floatGain(b, `+${out.xp - out.quests.reduce((a, q) => a + q.xp, 0)} XP`, 'sky'); }
      if (e === entry) drawPot();
    }));
    $$('[data-more]', box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.ptile').querySelector('.amounts'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); if (!h.hidden) h.querySelector('input, button')?.focus(); }));
    $$('.hform', box).forEach((f) => f.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const cm = Math.round(+f.querySelector('input').value); if (!(cm > 0)) return;
      const e = find(idOf(f)); logHeight(e, cm);
      toast(`${plantById(e.id).name}: ${fmt(cm)} cm`);
      const r = f.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); rows(); if (e === entry) drawPot();
    }));
    $$('[data-g]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); logHarvest(e, +b.dataset.g);
      const t = trip(plantById(e.id), state.region);
      toast(t ? `${fmt(t.crowMi)} food miles skipped!` : 'Harvest logged!');
      const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); haptic(12);
      award('harvest', { id: e.id }); rows(); changed();
    }));
  }
  // celebrate stages, once each: first sprout, first flower, ready to pick
  function stages() {
    if (fresh) return;
    const p = plantById(entry.id), st = stageName(entry, p);
    const said = entry.stagesSeen ||= [];
    const party = () => { const r = $('#pot-stage')?.getBoundingClientRect(); if (r) confetti(r.left + r.width / 2, r.top + r.height / 2, { count: 28 }); };
    if (isTree(p)) {
      const y = Math.floor(dayDiff(entry.planted, today()) / 365), key = `year-${y}`;
      const msg = y >= 1 && !said.includes(key) ? `${y} year${y === 1 ? '' : 's'} since you planted your ${p.name.toLowerCase()}!` : st === 'Fruiting age' && !said.includes(st) ? `Your ${p.name.toLowerCase()} is old enough to fruit soon.` : null;
      if (msg) { said.push(y >= 1 && !said.includes(key) ? key : st); save(); setTimeout(() => { toast(msg); party(); }, 600); }
      return;
    }
    const msg = { Sprout: `${p.name} has sprouted!`, Flowering: `First flowers on your ${p.name.toLowerCase()}!`, 'Ready to pick': `Your ${p.name.toLowerCase()} is ready to pick!` }[st];
    if (msg && !said.includes(st)) { said.push(st); save(); setTimeout(() => { toast(msg); party(); }, 600); }
  }
  drawPot(); dots(); rows(); stages();
  return { unmount() { offReward(); removeEventListener('zm:rewards', refreshGame); stopFaces(); bg.dispose(); v?.dispose(); freeURLs(); } };
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
      <section class="c3 empty3">${pip('point', { size: 140 })}<p>Add a plant first</p><a class="b3 b3-sun" href="#/find">Pick a plant</a></section>
      <section class="c3"><div class="card-head"><h2>Easy to start</h2><a class="b3 b3-white b3-sm" href="#/find">All</a></div><div class="tiles">${easy.map((p) => tile(p)).join('')}</div></section>
    </div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === id) || state.garden.find((e) => e.id === state.active) || state.garden[0];
  const CHECKS = `<ul class="checks" aria-label="What the app looks at">
    <li><i style="--c:#3fae49"></i><span>Green</span></li>
    <li><i style="--c:#ffc531"></i><span>Yellowing</span></li>
    <li><i style="--c:#c4653d"></i><span>Dry edges</span></li></ul>`;
  main.innerHTML = `
  <div class="page snap">
    <header class="page-head"><h1>Photo</h1></header>
    <div class="chips" role="group" aria-label="Which plant" id="which"></div>
    <div class="snap-grid">
      <div class="snap-col">
        <div class="frame" id="frame"><div class="corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="hint" id="hint">Fill the frame</p><div class="frame-pip" aria-hidden="true">${pip('point', { size: 92 })}</div></div>
        <div class="snap-actions">
          <label class="b3 b3-sun b3-wide b3-xl" for="photo" id="snap-btn">${ICON.photo}Take a photo</label>
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
        <div><span>Green</span><div class="bar3" style="--c:var(--leaf)"><i data-fill="${m.green.toFixed(3)}"></i></div><b>${pct(m.green)}%</b></div>
        <div><span>Yellow</span><div class="bar3" style="--c:var(--sun)"><i data-fill="${m.yellow.toFixed(3)}"></i></div><b>${pct(m.yellow)}%</b></div>
        <div><span>Dry</span><div class="bar3" style="--c:var(--pot-d)"><i data-fill="${m.brown.toFixed(3)}"></i></div><b>${pct(m.brown)}%</b></div>
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
