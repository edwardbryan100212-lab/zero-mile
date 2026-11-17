// Today (home of the app) and Photo (daily photo → on-device feedback → timeline).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, ROOT, addToGarden,
  overallStreak, bestStreak, nextMilestone, MILESTONES, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName, thumb,
  isTree, isFruitTree, treeAge, treePhotoDue, logHeight, lastHeight, treeSeason, bestTrees, dailyPlants, MONTH_NAMES, treeLine,
  savedDays, saverReady, earnSaver, BADGES, streakLevel } from './core.js?v=9';
import { EASE, reduced, countUp, countAll, fillAll, confetti, haptic, sheet, helpBtn, bindHelp, ART, badge, sprout } from './fun.js?v=9';
import * as Face from './face.js?v=9';
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
const moodWord = (m) => Face.moodWord?.(m) || WORDS[m] || WORDS.okay;

const urls = [];
const objURL = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const freeURLs = () => { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const changed = () => dispatchEvent(new Event('zm:garden'));

const ICON = {
  photo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  water: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
  basket: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16l-1.5 9h-13z"/><path d="M8 10l4-6 4 6"/></svg>',
  seed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V11"/><path d="M12 13c-4 0-6-2.5-6-6 4 0 6 2.5 6 6zm0-2c0-4 2.5-6 6-6 0 4-2.5 6-6 6z"/></svg>',
  tree: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-6"/><path d="M12 15c-4.5 0-7-2.6-7-6a7 7 0 0 1 14 0c0 3.4-2.5 6-7 6z"/><path d="M12 12l-2.5-2M12 13l3-3"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8v18H8z"/><path d="M8 7h4M8 11h3M8 15h4M8 19h3"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
};

function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
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
// what to sow this month where you live (southern hemisphere for Australia)
function sowNow(D) {
  const m = new Date().getMonth() + 1, south = state.region === 'AU';
  return D.plants.filter((p) => {
    const g = p.grow || {};
    const months = south ? (g.sow_months_south || []) : [...(g.sow_months_north || []), ...(g.plant_months_north || [])];
    return !isTree(p) && months.includes(m); // trees have their own card
  });
}
const tile = (p, sub) => `<a class="tile" href="#/plant/${p.id}"><div class="tile-art"><img src="${thumb(p.id)}" alt="" width="132" height="132" loading="lazy"></div><b>${esc(p.name)}</b><span>${esc(sub)}</span></a>`;
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : p.group === 'tree' ? 'A tree for years' : 'Next season'; };

// ---------- a small burst of leaves: the celebration when something is logged ----------
export function burst(x, y) { confetti(x, y, { count: 16, spread: .8 }); }

// ---------- share card for streak milestones ----------
function shareCard(n, plant, photoBlob) {
  return new Promise((resolve) => {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#1d4a2b'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.06)'; for (let i = 0; i < W; i += 36) x.fillRect(i, 0, 14, H); // quiet fluted ribs
    x.fillStyle = '#f2c94c'; x.font = '700 300px Bricolage Grotesque, sans-serif'; x.fillText(String(n), 80, 390);
    x.fillStyle = '#fff'; x.font = '600 76px Bricolage Grotesque, sans-serif'; x.fillText('day streak', 80, 490);
    x.font = '500 50px sans-serif'; x.fillText(`Growing ${plant.name.toLowerCase()}`, 80, 570);
    x.font = '700 56px Bricolage Grotesque, sans-serif'; x.fillText('Zero Mile', 80, H - 80);
    const done = () => c.toBlob((b) => resolve({ canvas: c, blob: b }), 'image/png');
    if (!photoBlob) return done();
    const img = new Image();
    img.onload = () => { const s = 560, k = Math.max(s / img.width, s / img.height), w = img.width * k, h = img.height * k;
      x.save(); x.beginPath(); x.roundRect(W - s - 80, 640, s, s, 40); x.clip(); x.drawImage(img, W - s - 80 + (s - w) / 2, 640 + (s - h) / 2, w, h); x.restore(); done(); };
    img.onerror = done; img.src = URL.createObjectURL(photoBlob);
  });
}
async function celebrate(n, plant, blob) {
  const { canvas, blob: card } = await shareCard(n, plant, blob);
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ms-t"><h2 id="ms-t">${n} days in a row!</h2><p class="muted">Your robot pot is very proud. Share your card or save it.</p><div class="acts"><button class="btn" id="ms-share">Share</button><a class="btn btn-soft" id="ms-save" download="zero-mile-${n}-day-streak.png">Save picture</a><button class="btn btn-plain" id="ms-close">Close</button></div></div>`;
  bg.querySelector('.sheet').insertBefore(canvas, bg.querySelector('.acts'));
  document.body.appendChild(bg);
  const a = bg.querySelector('#ms-save'); a.href = URL.createObjectURL(card);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { bg.remove(); URL.revokeObjectURL(a.href); removeEventListener('keydown', onKey); };
  addEventListener('keydown', onKey);
  bg.querySelector('#ms-close').addEventListener('click', close);
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  const file = new File([card], `zero-mile-${n}-day-streak.png`, { type: 'image/png' });
  const sh = bg.querySelector('#ms-share');
  if (!navigator.canShare?.({ files: [file] })) sh.remove();
  else sh.addEventListener('click', () => navigator.share({ files: [file], title: 'Zero Mile', text: `${n} day growing streak` }).catch(() => {}));
  bg.querySelector('#ms-close').focus();
}

// ---------- analyse a photo and log it ----------
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
  changed();
  return { res, blob, before, after: overallStreak() };
}

// ================= TODAY =================
// The plant moods, drawn live by the shared face renderer (js/face.js) on small canvases
function faceLoop(canvases) {
  let raf = 0, stopped = false, last = 0;
  const items = [];
  import('./face.js?v=9').then(({ drawFace }) => {
    if (stopped) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of canvases) {
      const s = c.clientWidth || 56; c.width = Math.round(s * dpr); c.height = Math.round(s * dpr);
      items.push({ c, ctx: c.getContext('2d'), mood: c.dataset.mood || 'okay', phase: Math.random() * 6 });
    }
    const draw = (t) => { for (const it of items) { if (!it.c.isConnected) continue; it.ctx.clearRect(0, 0, it.c.width, it.c.height); drawFace(it.ctx, it.c.width, it.c.height, it.mood, t + it.phase, { bg: false }); } };
    if (reduced()) { draw(0); return; }
    const tick = (now) => { if (stopped) return; if (now - last > 66) { last = now; draw(now / 1000); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }).catch(() => {});
  return () => { stopped = true; cancelAnimationFrame(raf); };
}
const shortDay = (d) => new Date(d + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' });

const HELP = {
  streak: () => ({ title: 'How your streak works', body: `<div class="help-rows">
    <p>${ART.camera('help-art')}<span><b>One photo a day</b> of any plant keeps it going.</span></p>
    <p>${sprout(4).replace('class="art sprout"', 'class="art sprout help-art"')}<span><b>Your sprout grows</b> at every badge.</span></p>
    <p>${badge(7, true).replace('class="art badge on"', 'class="art badge on help-art"')}<span><b>Badges</b> at 3, 7, 14, 30, 50 and 100 days.</span></p>
    <p>${ART.can('help-art')}<span><b>Watering can</b>: a 7-day run earns one. It saves your streak if you miss a day (once a week).</span></p>
    <p>${ART.tree('help-art')}<span><b>Trees</b> need a photo each season, not each day.</span></p></div>` }),
};

export default async function garden(main) {
  const D = await data();
  freeURLs();
  const fresh = !state.garden.length;
  let entry = state.garden.find((e) => e.id === state.active) || state.garden[0];
  const n = overallStreak(), best = bestStreak(), goal = nextMilestone(n);
  const prevGoal = [0, ...MILESTONES].filter((m) => m <= n).pop() ?? 0;
  const daily = dailyPlants(), trees = state.garden.filter(treeOf);
  const done = daily.filter(snappedToday).length, allDone = daily.length > 0 && done === daily.length;
  const treesDue = trees.filter((e) => treePhotoDue(e).due).length;
  const month = MONTHS[new Date().getMonth()];
  const sow = sowNow(D).slice(0, 14);
  const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 12);
  const dateText = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
  const saver = saverReady();

  // impact so far (same sums as the Impact screen)
  let miles = 0, co2g = 0, kg = 0;
  for (const e of state.garden) {
    const t = trip(plantById(e.id), state.region), k = harvestKg(e);
    kg += k; if (t) { miles += Math.round(t.crowMi * (e.harvests || []).length); co2g += Math.round(t.co2Transport * k * 1000); }
  }

  const cta = fresh ? `<a class="btn" href="#/find">${ICON.seed}Pick a plant</a>`
    : !daily.length ? (treesDue ? `<a class="btn" href="#/snap">${ICON.photo}Seasonal photo</a>` : `<a class="btn btn-soft" href="#/find">${ICON.seed}Add a food plant</a>`)
    : allDone ? `<span class="pill ok big">${ICON.check}All done today</span>` : `<a class="btn" href="#/snap">${ICON.photo}Take today’s photo</a>`;
  const kicker = fresh ? 'Your streak starts here' : !daily.length ? 'Trees grow slowly' : allDone ? 'See you tomorrow' : n ? 'Keep it going' : 'Start today';
  const streakCard = `
    <section class="d-streak" id="hero" aria-labelledby="streak-t">
      <div class="st-art" aria-hidden="true">${sprout(streakLevel(n))}</div>
      <div class="st-body">
        <p class="st-kicker">${kicker}</p>
        <h2 id="streak-t" class="st-num"><b data-count="${n}">${n}</b><span>day streak</span></h2>
        ${n > 0 ? `<div class="st-goal"><div class="progress"><i data-fill="${Math.min(1, (n - prevGoal) / Math.max(1, goal - prevGoal)).toFixed(3)}"></i></div><span>${goal - n} to the ${goal}-day badge</span></div>` : ''}
        ${fresh ? '' : `<div class="dots" role="group" aria-label="This week" id="dots"></div>`}
        <div class="row">${cta}
          <button class="saver${saver ? ' on' : ''}" type="button" data-help="streak" aria-label="${saver ? 'Watering can ready: it saves your streak if you miss a day' : 'Watering can: earn one with a 7-day streak'}">${ART.can('', saver)}<span>${saver ? 'Saver ready' : 'Saver at 7'}</span></button>
        </div>
      </div>
    </section>`;

  const stats = `
    <section class="d-stats" aria-label="Your impact so far">
      <a class="stat" href="#/impact">${ART.lorry()}<b data-count="${miles}">${fmt(miles)}</b><span>food miles skipped</span></a>
      <a class="stat" href="#/impact">${ART.cloud()}<b data-count="${co2g}" data-suffix=" g">${fmt(co2g)} g</b><span>travel CO2 saved</span></a>
      <a class="stat" href="#/impact">${ART.tree()}<b data-count="${trees.length}">${trees.length}</b><span>trees planted</span></a>
      <a class="stat" href="#/impact">${ART.basket()}<b data-count="${kg.toFixed(1)}" data-dec="1">${fmt(kg, 1)}</b><span>kg grown</span></a>
    </section>`;

  const badges = `
    <section class="card d-badges" aria-labelledby="badge-t">
      <div class="card-head"><h2 id="badge-t">Badges</h2>${helpBtn('streak', 'How streaks work')}</div>
      <ul class="badges">${BADGES.map((b) => `<li class="${best >= b ? 'on' : ''}">${badge(b, best >= b)}<span>${b} days<span class="vh">${best >= b ? ', earned' : ', not yet'}</span></span></li>`).join('')}</ul>
    </section>`;

  // the seasonal tree card: one big picture, one line, a few trees to tap
  const s = treeSeason(), m = new Date().getMonth() + 1, bt = bestTrees().slice(0, 5), top = bt[0];
  const treeCard = top ? `
    <section class="d-tree" aria-labelledby="tree-t">
      <div class="tree-body">
        <p class="st-kicker">${ICON.tree}${s ? (s.on ? 'Planting season' : `From ${MONTH_NAMES[s.next - 1]}`) : 'Trees'}</p>
        <h2 id="tree-t">${s?.on ? `Plant a tree this ${seasonWord(m)}` : 'Plant a tree'}</h2>
        <ul class="tree-picks">${bt.slice(1).map((p) => `<li><a href="#/plant/${p.id}"><img src="${thumb(p.id)}" alt="" width="56" height="56" loading="lazy"><span>${esc(p.name)}</span></a></li>`).join('')}</ul>
        <div class="row"><a class="btn btn-white btn-sm" href="#/find/trees">All trees</a>${trees.length ? `<span class="pill">${ICON.tree}${trees.length} growing</span>` : ''}</div>
      </div>
      <a class="tree-pic" href="#/plant/${top.id}" aria-label="${esc(top.name)}"><img src="${thumb(top.id)}" alt="" width="220" height="220"><span>${esc(top.name)}</span></a>
    </section>` : '';

  const steps = `
    <section class="card d-how" aria-labelledby="how-t">
      <div class="card-head"><h2 id="how-t">How it works</h2></div>
      <ol class="how4">
        <li>${ART.seed()}<b>Pick a plant</b></li>
        <li>${ART.camera()}<b>A photo a day</b></li>
        <li>${ART.basket()}<b>Eat it</b></li>
        <li>${ART.tree()}<b>Plant a tree</b></li>
      </ol>
    </section>`;

  main.innerHTML = `
  <div class="page">
    <header class="page-head"><p class="date">${dateText}</p><h1>${greeting()}</h1></header>
    <div class="dash${fresh ? ' is-fresh' : ''}">
      ${streakCard}
      ${fresh ? '' : `
      <section class="card d-pot pot" aria-label="Your plant in its robot pot">
        <div class="stage3d" id="pot-stage"></div>
        <div class="pot-info"><div class="pot-top"><h2 id="pot-name">${esc(plantById(entry.id).name)}</h2><span class="pill" id="pot-age"></span></div><p class="pot-mood" id="pot-mood"></p></div>
      </section>`}
      ${stats}
      ${fresh ? steps : `
      <section class="card d-plants" aria-labelledby="plants-t">
        <div class="card-head"><h2 id="plants-t">Your plants</h2><a href="#/find">${ICON.plus}Add</a></div>
        <ul class="ptiles" id="plants"></ul>
        <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
      </section>`}
      ${badges}
      ${treeCard}
      ${fresh ? `
      <section class="card d-sow" aria-labelledby="easy-t">
        <div class="card-head"><h2 id="easy-t">Easy in a pot</h2><a href="#/find">See all</a></div>
        <div class="tiles">${easy.map((p) => tile(p, daysText(p))).join('')}</div>
      </section>` : ''}
      <section class="card d-sow" aria-labelledby="sow-t">
        <div class="card-head"><h2 id="sow-t">Sow in ${month}</h2><a href="#/find">All plants</a></div>
        ${sow.length ? `<div class="tiles">${sow.map((p) => tile(p, daysText(p))).join('')}</div>` : `<p class="muted">${ART.sun('inline-art')}Herbs on a sunny windowsill.</p>`}
      </section>
      ${fresh ? '' : `
      <section class="card d-flip" aria-labelledby="flip-t">
        <div class="card-head"><h2 id="flip-t">Flipbook</h2><span class="muted small" id="flip-n"></span></div>
        <div class="flip-view" id="flip-view"></div>
        <div class="flip-acts" id="flip-acts" hidden><button class="btn btn-sm btn-soft" id="flip-play" aria-pressed="false">Play</button><input type="range" id="flip-scrub" min="0" max="0" value="0" aria-label="Choose a day"><span class="muted small" id="flip-date"></span></div>
      </section>`}
    </div>
  </div>`;

  bindHelp(main, HELP);
  countAll(main); fillAll(main);
  // green fluted glass behind the streak card
  const { fluted } = await import('./fluted.js?v=9');
  const bg = fluted($('#hero'));
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
      $('#pot-mood').textContent = due.due ? 'Time for a seasonal photo' : `Next photo in ${due.days} days`;
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
      const say = `${dn}${did ? ', photo taken' : sav ? ', saved by the watering can' : missed ? ', no photo, tap to add one from that day' : ''}${isToday ? ', today' : ''}`;
      if (missed) { t.setAttribute('aria-label', say); t.innerHTML = `<i>${ICON.plus}</i>${dn.slice(0, 3)}`; }
      else t.innerHTML = `<span class="vh">${say}</span><i aria-hidden="true">${sav ? ART.can() : ''}</i><span aria-hidden="true">${dn.slice(0, 3)}</span>`;
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
    await analyseAndLog(entry, f, d);
    toast('Added to your journal.');
    render();
  });

  // one tile per plant: picture, mood face, day count, one-tap Photo and Water
  function rows() {
    const box = $('#plants'); if (!box) return;
    stopFaces();
    box.innerHTML = state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const tree = isTree(p), w = wateredToday(e), md = moodOf(e);
      const ok = tree ? !treePhotoDue(e).due : snappedToday(e);
      const age = tree ? treeAge(e) : `Day ${dayDiff(e.planted, today()) + 1}`;
      return `<li class="ptile${e === entry ? ' active' : ''}${ok ? ' done' : ''}" data-id="${e.id}">
        <div class="pt-art"><a href="#/plant/${e.id}" aria-label="${esc(p.name)}"><img src="${thumb(e.id)}" alt="" width="120" height="120"></a>
          <button class="pt-face" data-pick aria-label="${esc(p.name)} feels: ${esc(moodWord(md))}. Show in the robot pot"><canvas data-mood="${md}"></canvas></button>
          ${ok ? `<span class="pt-tick" aria-hidden="true">${ICON.check}</span>` : ''}</div>
        <div class="pt-name"><b>${esc(p.name)}</b><span>${age}</span></div>
        <div class="pt-acts">
          ${ok ? `<span class="pt-btn is-done">${ICON.check}<span>${tree ? 'Photo ok' : 'Done'}</span></span>` : `<a class="pt-btn go" href="#/snap/${e.id}">${ICON.photo}<span>Photo</span></a>`}
          <button class="pt-btn water${w ? ' on' : ''}" data-water aria-pressed="${w}">${ICON.water}<span>${w ? 'Watered' : 'Water'}</span></button>
          ${tree ? `<button class="pt-btn icon" data-height aria-expanded="false" aria-label="Log height">${ICON.ruler}</button>` : ''}
          ${!tree || isFruitTree(p) ? `<button class="pt-btn icon" data-pickup aria-expanded="false" aria-label="Picked some">${ICON.basket}</button>` : ''}
        </div>
        ${tree ? `<form class="amounts hform" hidden><label for="h-${e.id}">Height</label><input id="h-${e.id}" type="number" inputmode="numeric" min="1" max="6000" step="1" placeholder="cm" required><button class="btn btn-sm">Save</button></form>` : ''}
        <div class="amounts pick" hidden>${[100, 250, 500, 1000].map((g) => `<button class="chip" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>
      </li>`;
    }).join('');
    stopFaces = faceLoop($$('canvas[data-mood]', box));
    const idOf = (el) => el.closest('.ptile').dataset.id, find = (id) => state.garden.find((x) => x.id === id);
    $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => {
      const id = idOf(b); entry = find(id); state.active = id; save(); drawPot(); flipbook();
      $$('.ptile', box).forEach((c) => c.classList.toggle('active', c.dataset.id === id));
      if (matchMedia('(max-width: 999px)').matches) $('#pot-stage')?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    }));
    $$('[data-water]', box).forEach((b) => b.addEventListener('click', () => {
      const e = find(idOf(b)); const on = toggleWatered(e);
      b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); b.querySelector('span').textContent = on ? 'Watered' : 'Water';
      if (on) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); haptic(10); drops(b); }
      if (e === entry) drawPot();
    }));
    const toggle = (sel, panel) => $$(sel, box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.ptile').querySelector(panel); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); if (!h.hidden) h.querySelector('input, button')?.focus(); }));
    toggle('[data-pickup]', '.pick'); toggle('[data-height]', '.hform');
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
      toast(t ? `You skipped ${fmt(t.crowMi)} food miles!` : 'Harvest logged. Enjoy it!');
      const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); haptic(12); rows();
    }));
  }

  // flip through this plant's own photos, oldest to newest
  let flipTimer = 0, frames = [];
  async function flipbook() {
    if (!$('#flip-view')) return;
    clearInterval(flipTimer); flipTimer = 0;
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? -1 : 1));
    $('#flip-n').textContent = logs.length ? `${logs.length} day${logs.length === 1 ? '' : 's'}` : '';
    const view = $('#flip-view'), acts = $('#flip-acts');
    if (logs.length < 2) {
      const b = logs[0] && await getPhoto(logs[0].key);
      view.innerHTML = b ? `<img src="${objURL(b)}" alt="Your first photo">` : `<p>${ART.camera('inline-art')}Your photos play here</p>`;
      acts.hidden = true; return;
    }
    frames = [];
    for (const l of logs) { const b = await getPhoto(l.key); if (b) frames.push({ url: objURL(b), date: l.date }); }
    if (!frames.length) { view.innerHTML = `<p>${ART.camera("inline-art")}Your photos play here</p>`; acts.hidden = true; return; }
    view.innerHTML = `<img id="flip-img" alt="">`; acts.hidden = false;
    const scrub = $('#flip-scrub'); scrub.max = frames.length - 1;
    const showF = (i) => { const f = frames[i]; $('#flip-img').src = f.url; $('#flip-img').alt = `${plantById(entry.id).name} on ${f.date}`; $('#flip-date').textContent = new Date(f.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }); scrub.value = i; };
    showF(frames.length - 1);
    const play = $('#flip-play');
    const stop = () => { clearInterval(flipTimer); flipTimer = 0; play.setAttribute('aria-pressed', 'false'); play.textContent = 'Play'; };
    scrub.oninput = () => { stop(); showF(+scrub.value); };
    play.onclick = () => {
      if (flipTimer) return stop();
      let i = 0; play.setAttribute('aria-pressed', 'true'); play.textContent = 'Pause'; showF(0);
      flipTimer = setInterval(() => { i++; if (i >= frames.length) return stop(); showF(i); }, reduced() ? 900 : 260);
    };
  }
  // celebrate stages, once each: first sprout, first flower, ready to pick
  function stages() {
    if (fresh) return;
    const p = plantById(entry.id), st = stageName(entry, p);
    const said = entry.stagesSeen ||= [];
    const pop = () => { const r = $('#pot-stage')?.getBoundingClientRect(); if (r) confetti(r.left + r.width / 2, r.top + r.height / 2, { count: 28 }); };
    if (isTree(p)) {
      const y = Math.floor(dayDiff(entry.planted, today()) / 365), key = `year-${y}`;
      const msg = y >= 1 && !said.includes(key) ? `${y} year${y === 1 ? '' : 's'} since you planted your ${p.name.toLowerCase()}! Time for a birthday photo.` : st === 'Fruiting age' && !said.includes(st) ? `Your ${p.name.toLowerCase()} is old enough to fruit soon.` : null;
      if (msg) { said.push(y >= 1 && !said.includes(key) ? key : st); save(); setTimeout(() => { toast(msg); pop(); }, 600); }
      return;
    }
    const msg = { Sprout: `${p.name} has sprouted!`, Flowering: `First flowers on your ${p.name.toLowerCase()}!`, 'Ready to pick': `Your ${p.name.toLowerCase()} is ready to pick!` }[st];
    if (msg && !said.includes(st)) { said.push(st); save(); setTimeout(() => { toast(msg); pop(); }, 600); }
  }
  function render() { drawPot(); dots(); rows(); flipbook(); stages(); }
  render();
  return { unmount() { clearInterval(flipTimer); stopFaces(); bg.dispose(); v?.dispose(); freeURLs(); } };
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

// ---------- the big moment: today's photo moved the streak on ----------
function streakParty(before, after, plant, blob, earned) {
  const lvl = streakLevel(after), grew = lvl > streakLevel(before), isBadge = BADGES.includes(after);
  const { el, close } = sheet({ title: after === 1 ? 'Streak started!' : `${after} days in a row!`, label: 'Close', body: `
    <div class="party">
      <div class="party-art${grew ? ' grew' : ''}">${sprout(lvl)}</div>
      <p class="party-num" aria-hidden="true"><b id="party-n">${before}</b><span>day streak</span></p>
      ${isBadge ? `<div class="party-badge">${badge(after, true)}<span>New badge!</span></div>` : ''}
      ${earned ? `<div class="party-badge">${ART.can()}<span>You earned a watering can</span></div>` : ''}
      <div class="acts">${[7, 30, 100, 365].includes(after) ? '<button class="btn btn-soft" id="party-share" type="button">Share card</button>' : ''}<button class="btn" id="party-ok" type="button">Yay!</button></div>
    </div>` });
  const r = el.getBoundingClientRect();
  setTimeout(() => { countUp(el.querySelector('#party-n'), after, { from: before, dur: 700 }); confetti(r.left + r.width / 2, r.top + 80, { count: 46 }); haptic([14, 60, 22]); }, reduced() ? 0 : 260);
  el.querySelector('#party-ok').addEventListener('click', close);
  el.querySelector('#party-share')?.addEventListener('click', () => { close(); setTimeout(() => celebrate(after, plant, blob), 220); });
}

// ================= PHOTO =================
export async function snapView(main, id) {
  const D = await data();
  freeURLs();
  if (!state.garden.length) {
    const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 10);
    main.innerHTML = `<div class="page">
      <header class="page-head"><h1>Daily photo</h1></header>
      <section class="card empty-pic">${ART.camera()}<p>Add a plant first, then snap it here each day.</p><a class="btn" href="#/find">${ICON.seed}Pick a plant</a></section>
      <section class="card"><div class="card-head"><h2>Easy to start</h2><a href="#/find">See all</a></div><div class="tiles">${easy.map((p) => `<a class="tile" href="#/plant/${p.id}"><div class="tile-art"><img src="${thumb(p.id)}" alt="" width="132" height="132"></div><b>${esc(p.name)}</b></a>`).join('')}</div></section>
    </div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === id) || state.garden.find((e) => e.id === state.active) || state.garden[0];
  const CHECKS = `<ul class="checks" aria-label="What the app looks at">
    <li>${ART.leaf('', '#5aa83f')}<span>Green</span></li>
    <li>${ART.leaf('', '#e8c23a')}<span>Yellowing</span></li>
    <li>${ART.leaf('', '#a8743f')}<span>Dry edges</span></li></ul>`;
  main.innerHTML = `
  <div class="page">
    <header class="page-head"><h1>Daily photo</h1><p class="muted" id="snap-sub"></p></header>
    <div class="chips" role="group" aria-label="Which plant" id="which"></div>
    <div class="snap-grid">
      <div style="display:grid;gap:12px">
        <div class="frame" id="frame"><div class="corners" aria-hidden="true"></div><p class="hint" id="hint">Fill the frame with your plant</p></div>
        <div class="snap-actions">
          <label class="btn btn-wide" for="photo" id="snap-btn">${ICON.photo}Take a photo</label>
          <input id="photo" class="vh" type="file" accept="image/*" capture="environment">
        </div>
      </div>
      <div style="display:grid;gap:16px">
        <section class="card" id="feedback" aria-live="polite">
          <div class="card-head"><h2>We look at</h2>${helpBtn('check', 'How the photo check works')}</div>
          ${CHECKS}
          <label class="toggle" style="margin-top:12px"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}><span>Smart check (90 MB, on this device)</span></label>
        </section>
        <section class="card"><div class="card-head"><h2>Timeline</h2><span class="muted small" id="count"></span></div><div class="timeline" id="timeline"></div></section>
      </div>
    </div>
  </div>`;
  const style = document.createElement('style'); style.textContent = '.snap-actions:has(#photo:focus-visible) #snap-btn { outline: 3px solid var(--green); outline-offset: 3px; }'; main.appendChild(style);
  const help = { check: { title: 'How the photo check works', body: `${CHECKS}<p>It counts fresh green, yellowing leaves (too much water or hungry soil) and dry brown edges (thirsty or too much sun).</p><p>Everything runs on this device. Nothing is uploaded. The smart check downloads a 90 MB model once.</p><p class="muted small">A friendly guess, not a plant doctor.</p>` } };
  bindHelp(main, help);

  function chips() {
    $('#which').innerHTML = state.garden.map((e) => `<button class="chip pchip" data-id="${e.id}" aria-pressed="${e === entry}"><img src="${thumb(e.id)}" alt="" width="28" height="28">${esc(plantById(e.id)?.name || e.id)}${photoDone(e) ? `<span class="chip-tick">${ICON.check}<span class="vh">, done</span></span>` : ''}</button>`).join('');
    $('#snap-sub').textContent = treeOf(entry) ? 'One photo each season, from the same spot.' : 'Line it up with last time.';
    $$('#which [data-id]').forEach((b) => b.addEventListener('click', () => { entry = state.garden.find((e) => e.id === b.dataset.id); state.active = entry.id; save(); chips(); ghost(); timeline(); $(`#which [data-id="${entry.id}"]`)?.focus(); }));
  }
  async function ghost() {
    $$('#frame .ghost, #frame .shot').forEach((x) => x.remove());
    const last = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const b = last && await getPhoto(last.key);
    $('#hint').hidden = false;
    if (b) { const g = new Image(); g.className = 'ghost'; g.alt = ''; g.src = objURL(b); $('#frame').prepend(g); $('#hint').textContent = treeOf(entry) ? 'Stand where you stood last season' : 'Line it up with last time'; }
    else $('#hint').textContent = treeOf(entry) ? 'Fit the whole tree in the frame' : 'Fill the frame with your plant';
  }
  async function timeline() {
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1));
    $('#count').textContent = `${logs.length} photo${logs.length === 1 ? '' : 's'}`;
    const t = $('#timeline');
    t.innerHTML = logs.length ? logs.map((l) => `<figure data-k="${l.key}"><img alt="${esc(plantById(entry.id).name)} on ${l.date}"><figcaption>${new Date(l.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · ${l.score}${l.repaired ? ' · added later' : ''}</figcaption></figure>`).join('') : `<p class="muted empty-line">${ART.camera('inline-art')}Your first photo starts it</p>`;
    for (const f of $$('[data-k]', t)) { const b = await getPhoto(f.dataset.k); if (b && f.isConnected) f.querySelector('img').src = objURL(b); }
  }
  let stopFace = () => {};
  function show(res) {
    const fb = $('#feedback'); fb.removeAttribute('aria-busy');
    const m = res.m, pct = (x) => Math.round(x * 100);
    fb.innerHTML = `
      <div class="score"><div class="score-face"><canvas data-mood="${res.mood || 'okay'}"></canvas></div><div><h2><b data-count="${res.score}">${res.score}</b><span class="vh"> out of 100. </span></h2><p class="score-word">${esc(moodWord(res.mood))}</p></div></div>
      <div class="meter">
        <div><span>${ART.leaf('', '#5aa83f')}Green</span><i><em data-fill="${m.green.toFixed(3)}"></em></i><span>${pct(m.green)}%</span></div>
        <div><span>${ART.leaf('', '#e8c23a')}Yellow</span><i><em class="y" data-fill="${m.yellow.toFixed(3)}"></em></i><span>${pct(m.yellow)}%</span></div>
        <div><span>${ART.leaf('', '#a8743f')}Dry</span><i><em class="b" data-fill="${m.brown.toFixed(3)}"></em></i><span>${pct(m.brown)}%</span></div>
      </div>
      <ul class="notes">${res.notes.slice(0, 2).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="muted small">A friendly guess, made on your device.</p>`;
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
    try {
      const { res, blob, before, after } = await analyseAndLog(entry, file, today(), (msg) => { busy.querySelector('p').textContent = msg; });
      if (!reduced()) await new Promise((r) => setTimeout(r, 500));
      busy.remove();
      show(res);
      chips(); timeline();
      if (after > before) { const earned = earnSaver(); changed(); streakParty(before, after, plantById(entry.id), blob, earned); }
      else { const r = $('#snap-btn').getBoundingClientRect(); burst(r.left + r.width / 2, r.top); haptic(12); toast('Photo saved to your timeline.'); }
    } catch {
      busy.remove();
      const fb = $('#feedback'); fb.removeAttribute('aria-busy');
      fb.innerHTML = `<div class="empty-pic">${ART.camera()}<h2>That photo didn’t work</h2><p>Try a JPEG or PNG picture.</p></div>`;
    }
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
