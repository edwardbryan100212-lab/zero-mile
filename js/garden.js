// Today (home of the app) and Photo (daily photo → on-device feedback → timeline).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, ROOT, addToGarden,
  overallStreak, bestStreak, nextMilestone, MILESTONES, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName, thumb } from './core.js?v=5';
import { FACES } from './ascii.js?v=2';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
};

function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
function growthT(e) {
  const p = plantById(e.id), age = dayDiff(e.planted, today());
  const days = p?.grow?.days_to_harvest?.[1] || (p?.group === 'tree' ? 365 * 4 : 120);
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
    return months.includes(m);
  });
}
const tile = (p, sub) => `<a class="tile" href="#/plant/${p.id}"><div class="tile-art"><img src="${thumb(p.id)}" alt="" width="132" height="132" loading="lazy"></div><b>${esc(p.name)}</b><span>${esc(sub)}</span></a>`;
const daysText = (p) => { const d = p.grow?.days_to_harvest; return d ? `${d[0]}–${d[1]} days` : p.group === 'tree' ? 'A tree for years' : 'Next season'; };

// ---------- a small burst of leaves: the celebration when something is logged ----------
export function burst(x, y) {
  if (reduce) return;
  const cols = ['#2f7d32', '#5aa83f', '#9fd47f', '#f2c94c'];
  for (let i = 0; i < 22; i++) {
    const d = document.createElement('i'); d.className = 'burst';
    const s = 7 + Math.random() * 6; d.style.width = s + 'px'; d.style.height = s * 1.6 + 'px'; d.style.borderRadius = '50% 0';
    d.style.background = cols[i % cols.length]; d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d);
    const a = Math.random() * Math.PI * 2, v = 70 + Math.random() * 120;
    d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 140}px) rotate(${(Math.random() - .5) * 540}deg)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
  }
}

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
export default async function garden(main) {
  const D = await data();
  freeURLs();
  const fresh = !state.garden.length;
  let entry = state.garden.find((e) => e.id === state.active) || state.garden[0];
  const n = overallStreak(), goal = nextMilestone(n), total = photoDays().size;
  const prevGoal = [0, ...MILESTONES].filter((m) => m <= n).pop() ?? 0;
  const done = state.garden.filter(snappedToday).length;
  const month = MONTHS[new Date().getMonth()];
  const sow = sowNow(D).slice(0, 14);
  const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 12);
  const dateText = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });

  // impact so far (same sums as the Impact screen)
  const picks = state.garden.reduce((s, e) => s + (e.harvests || []).length, 0);
  const kg = state.garden.reduce((s, e) => s + harvestKg(e), 0);
  const miles = state.garden.reduce((s, e) => { const t = trip(plantById(e.id), state.region); return s + (t ? t.crowMi * (e.harvests || []).length : 0); }, 0);

  const heroPlate = fresh
    ? `<h2>Let’s grow something</h2>
       <p class="muted">Pick a plant, take one photo a day, and eat what you grow. It’s free and your photos stay on this device.</p>
       <div class="row"><a class="btn" href="#/find">${ICON.seed}Pick your first plant</a></div>`
    : `<h2>${n > 0 ? `${n} day streak` : total ? 'Start a new run today' : 'Take your first photo'}</h2>
       <p class="muted">${done === state.garden.length ? `All ${done === 1 ? 'your plant has' : `${done} plants have`} today’s photo. Lovely!` : `${done} of ${state.garden.length} ${state.garden.length === 1 ? 'plant has' : 'plants have'} today’s photo.`}${n > 0 ? ` ${goal - n} more ${goal - n === 1 ? 'day' : 'days'} to your ${goal}-day badge.` : ''}</p>
       <div class="dots" role="list" aria-label="The last seven days" id="dots"></div>
       ${n > 0 ? `<div class="progress" aria-hidden="true"><i style="transform:scaleX(${Math.min(1, (n - prevGoal) / Math.max(1, goal - prevGoal))})"></i></div>` : ''}
       <div class="row">${done < state.garden.length ? `<a class="btn" href="#/snap">${ICON.photo}Take today’s photo</a>` : `<a class="btn btn-soft" href="#/snap">${ICON.photo}Take another photo</a>`}${bestStreak() > n ? `<span class="pill">Best: ${bestStreak()} days</span>` : ''}</div>`;

  main.innerHTML = `
  <div class="page">
    <header class="page-head"><p class="date">${dateText}</p><h1>${greeting()}</h1></header>
    <div class="today">
      <div class="today-main">
        <section class="hero" id="hero" aria-label="Today"><div class="hero-plate">${heroPlate}</div></section>
        ${fresh ? `
        <section class="card rise" aria-labelledby="how-t">
          <div class="card-head"><h2 id="how-t">How it works</h2></div>
          <div class="steps">
            <div class="step">${ICON.seed}<h3>Pick a plant</h3><p>See it fully grown in 3D first, from basil to an apple tree.</p></div>
            <div class="step">${ICON.photo}<h3>A photo a day</h3><p>The app looks at the leaves on your device and tells you how it’s doing.</p></div>
            <div class="step">${ICON.basket}<h3>Eat it</h3><p>Log what you pick and see the food miles you skipped.</p></div>
          </div>
        </section>
        <section class="card rise" aria-labelledby="easy-t">
          <div class="card-head"><h2 id="easy-t">Easy to start in a pot</h2><a href="#/find">See all</a></div>
          <div class="tiles">${easy.map((p) => tile(p, daysText(p))).join('')}</div>
        </section>` : `
        <section class="card" aria-labelledby="plants-t">
          <div class="card-head"><h2 id="plants-t">Your plants</h2><a href="#/find">Add a plant</a></div>
          <div id="plants"></div>
          <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
        </section>`}
        <section class="card rise" aria-labelledby="sow-t">
          <div class="card-head"><h2 id="sow-t">Sow in ${month}</h2><a href="#/find">All plants</a></div>
          ${sow.length ? `<div class="tiles">${sow.map((p) => tile(p, daysText(p))).join('')}</div>` : `<p class="muted">A quiet month outside. Herbs on a sunny windowsill still grow well.</p>`}
        </section>
        ${fresh ? '' : `
        <section class="card rise" aria-labelledby="flip-t">
          <div class="card-head"><h2 id="flip-t">Growth flipbook</h2><span class="muted small" id="flip-n"></span></div>
          <div class="flip-view" id="flip-view"></div>
          <div class="flip-acts" id="flip-acts" hidden><button class="btn btn-sm btn-soft" id="flip-play" aria-pressed="false">Play</button><input type="range" id="flip-scrub" min="0" max="0" value="0" aria-label="Choose a day"><span class="muted small" id="flip-date"></span></div>
        </section>`}
      </div>
      <aside class="today-side" aria-label="Your robot pot and impact">
        <section class="card pot" aria-label="Your plant in its robot pot">
          <div class="stage3d" id="pot-stage"></div>
          <div class="pot-info">
            <div class="pot-top"><h2 id="pot-name">${fresh ? 'Your robot pot' : esc(plantById(entry.id).name)}</h2><span class="pill" id="pot-age"></span></div>
            <p class="muted" id="pot-mood"></p>
            <div class="tip" id="pot-tip"></div>
          </div>
        </section>
        <section class="card" aria-labelledby="imp-t">
          <div class="card-head"><h2 id="imp-t">Your impact</h2><a href="#/impact">More</a></div>
          <div class="mini">
            <div><b>${fmt(miles)}</b><span>food miles skipped</span></div>
            <div><b>${fmt(kg, kg && kg < 10 ? 1 : 0)}</b><span>kg grown</span></div>
            <div><b>${total}</b><span>photo days</span></div>
          </div>
        </section>
      </aside>
    </div>
  </div>`;

  // green fluted glass behind the welcome card
  const { fluted } = await import('./fluted.js?v=5');
  const bg = fluted($('#hero'));
  const [{ createViewer }, { makePot }] = await Promise.all([import('./viewer.js?v=5'), import('./pot3d.js?v=2')]);
  const v = createViewer($('#pot-stage'), { controls: true, spin: false });
  let pot; v.onFrame = (dt) => pot?.tick(dt);

  function drawPot() {
    const id = fresh ? 'tomato' : entry.id, t = fresh ? .16 : growthT(entry);
    v.setPlant(id, t, { extraObject: (box) => { const size = box.getSize(new (box.min.constructor)()); pot = makePot(Math.max(.07, Math.max(size.x, size.z) * .32, size.y * .16)); return pot.group; } });
    const m = fresh ? 'new' : moodOf(entry); pot.setMood(m); v.stage.rotation.y = .6; v.kick();
    if (fresh) {
      $('#pot-age').textContent = 'Waiting';
      $('#pot-mood').textContent = 'Its face shows how your plant feels after each photo.';
      $('#pot-tip').innerHTML = '<b>Tip</b>Herbs like basil and mint are the easiest start on a windowsill.';
      return;
    }
    const p = plantById(entry.id), age = dayDiff(entry.planted, today());
    $('#pot-name').textContent = p.name;
    $('#pot-age').textContent = age === 0 ? 'Planted today' : `Day ${age + 1} · ${stageName(entry, p)}`;
    $('#pot-mood').textContent = `Feeling: ${FACES[m].word.toLowerCase()}.`;
    const tips = p.grow?.tips || [];
    $('#pot-tip').innerHTML = tips.length ? `<b>Tip for ${esc(p.name.toLowerCase())}</b>${esc(tips[new Date().getDate() % tips.length])}` : '<b>Tip</b>Turn the pot a little each week so it grows straight.';
  }

  // the last 7 days: photo days filled, missed days can be filled with a photo taken that day
  async function dots() {
    const el = $('#dots'); if (!el) return;
    const days = photoDays(), first = state.garden.map((e) => e.planted).sort()[0];
    el.innerHTML = '';
    for (const d of lastDays(7)) {
      const dn = new Date(d + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' });
      const did = days.has(d), isToday = d === today(), missed = !did && !isToday && d >= first;
      const t = document.createElement(missed ? 'button' : 'div');
      t.className = `dot${did ? ' done' : ''}${isToday ? ' is-today' : ''}${missed ? ' miss' : ''}`;
      t.setAttribute('role', 'listitem');
      t.setAttribute('aria-label', `${dn}${did ? ', photo taken' : missed ? ', no photo, tap to add one from that day' : ''}${isToday ? ', today' : ''}`);
      t.innerHTML = `<i>${missed ? '+' : ''}</i>${dn.slice(0, 3)}`;
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

  function rows() {
    const box = $('#plants'); if (!box) return;
    box.innerHTML = `<ul class="list">${state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const snapped = snappedToday(e), w = wateredToday(e), k = harvestKg(e);
      return `<li class="prow${e === entry ? ' active' : ''}" data-id="${e.id}">
        <button class="prow-art" data-pick aria-label="Show ${esc(p.name)} in the robot pot"><img src="${thumb(e.id)}" alt="" width="64" height="64"></button>
        <div>
          <div class="prow-top"><h3><a href="#/plant/${e.id}">${esc(p.name)}</a></h3><span class="pill ${snapped ? 'ok' : 'todo'}">${snapped ? 'Photo done' : 'Needs a photo'}</span></div>
          <p class="meta">Day ${dayDiff(e.planted, today()) + 1} · ${stageName(e, p)}${k ? ` · ${fmt(k, 2)} kg picked` : ''}</p>
        </div>
        <div class="prow-acts">
          ${snapped ? '' : `<a class="btn btn-sm" href="#/snap/${e.id}">${ICON.photo}Photo</a>`}
          <button class="btn btn-sm ${w ? 'btn-soft' : 'btn-plain'}" data-water aria-pressed="${w}">${ICON.water}<span>${w ? 'Watered' : 'Water'}</span></button>
          <button class="btn btn-sm btn-plain" data-pickup aria-expanded="false">${ICON.basket}Picked some</button>
        </div>
        <div class="amounts" hidden><span class="muted small">How much?</span>${[100, 250, 500, 1000].map((g) => `<button class="chip" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>
      </li>`;
    }).join('')}</ul>`;
    $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => { const id = b.closest('.prow').dataset.id; entry = state.garden.find((e) => e.id === id); state.active = id; save(); drawPot(); flipbook(); $$('.prow', box).forEach((c) => c.classList.toggle('active', c.dataset.id === id)); }));
    $$('[data-water]', box).forEach((b) => b.addEventListener('click', () => {
      const e = state.garden.find((x) => x.id === b.closest('.prow').dataset.id); const on = toggleWatered(e);
      b.setAttribute('aria-pressed', on); b.classList.toggle('btn-soft', on); b.classList.toggle('btn-plain', !on); b.querySelector('span').textContent = on ? 'Watered' : 'Water';
      if (on) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); }
      if (e === entry) drawPot();
    }));
    $$('[data-pickup]', box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.prow').querySelector('.amounts'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); }));
    $$('[data-g]', box).forEach((b) => b.addEventListener('click', () => {
      const e = state.garden.find((x) => x.id === b.closest('.prow').dataset.id); logHarvest(e, +b.dataset.g);
      const t = trip(plantById(e.id), state.region);
      toast(t ? `Logged. You skipped ${fmt(t.crowMi)} food miles.` : 'Harvest logged. Enjoy it!');
      const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); rows();
    }));
  }

  // flip through this plant's own photos, oldest to newest
  let flipTimer = 0, frames = [];
  async function flipbook() {
    if (!$('#flip-view')) return;
    clearInterval(flipTimer); flipTimer = 0;
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? -1 : 1));
    $('#flip-n').textContent = logs.length ? `${logs.length} day${logs.length === 1 ? '' : 's'} of ${plantById(entry.id).name.toLowerCase()}` : '';
    const view = $('#flip-view'), acts = $('#flip-acts');
    if (logs.length < 2) {
      const b = logs[0] && await getPhoto(logs[0].key);
      view.innerHTML = b ? `<img src="${objURL(b)}" alt="Your first photo">` : `<p>Take a photo each day and they play back here like a time-lapse.</p>`;
      acts.hidden = true; return;
    }
    frames = [];
    for (const l of logs) { const b = await getPhoto(l.key); if (b) frames.push({ url: objURL(b), date: l.date }); }
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
      flipTimer = setInterval(() => { i++; if (i >= frames.length) return stop(); showF(i); }, reduce ? 900 : 260);
    };
  }
  // celebrate stages, once each: first sprout, first flower, ready to pick
  function stages() {
    if (fresh) return;
    const p = plantById(entry.id), st = stageName(entry, p);
    const said = entry.stagesSeen ||= [];
    const msg = { Sprout: `${p.name} has sprouted!`, Flowering: `First flowers on your ${p.name.toLowerCase()}!`, 'Ready to pick': `Your ${p.name.toLowerCase()} is ready to pick!` }[st];
    if (msg && !said.includes(st)) { said.push(st); save(); setTimeout(() => { toast(msg); const r = $('#pot-stage')?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2); }, 600); }
  }
  function render() { drawPot(); dots(); rows(); flipbook(); stages(); }
  render();
  return { unmount() { clearInterval(flipTimer); bg.dispose(); v.dispose(); freeURLs(); } };
}

// ================= PHOTO =================
export async function snapView(main, id) {
  const D = await data();
  freeURLs();
  if (!state.garden.length) {
    const easy = D.plants.filter((p) => p.grow?.difficulty === 'easy' && p.grow?.container_ok).slice(0, 10);
    main.innerHTML = `<div class="page">
      <header class="page-head"><h1>Daily photo</h1><p class="muted">Add a plant to your garden first. Then come back here once a day to take its photo.</p></header>
      <section class="card"><div class="card-head"><h2>Easy plants to start with</h2><a href="#/find">See all</a></div><div class="tiles">${easy.map((p) => `<a class="tile" href="#/plant/${p.id}"><div class="tile-art"><img src="${thumb(p.id)}" alt="" width="132" height="132"></div><b>${esc(p.name)}</b></a>`).join('')}</div></section>
    </div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === id) || state.garden.find((e) => e.id === state.active) || state.garden[0];
  main.innerHTML = `
  <div class="page">
    <header class="page-head"><h1>Daily photo</h1><p class="muted">Line your plant up with the faint picture from last time, so your photos make a time-lapse.</p></header>
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
          <h2>What the app checks</h2>
          <ul class="notes" style="margin-top:10px">
            <li>How much of the plant is fresh green</li>
            <li>Leaves turning yellow (too much water or hungry soil)</li>
            <li>Dry brown edges (thirsty or too much sun)</li>
          </ul>
          <label class="toggle" style="margin-top:12px"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}> Smart check: downloads a 90 MB model once and runs on your device. Nothing is uploaded.</label>
        </section>
        <section class="card"><div class="card-head"><h2>Timeline</h2><span class="muted small" id="count"></span></div><div class="timeline" id="timeline"></div></section>
      </div>
    </div>
  </div>`;
  const style = document.createElement('style'); style.textContent = '.snap-actions:has(#photo:focus-visible) #snap-btn { outline: 3px solid var(--green); outline-offset: 3px; }'; main.appendChild(style);

  function chips() {
    $('#which').innerHTML = state.garden.map((e) => `<button class="chip" data-id="${e.id}" aria-pressed="${e === entry}">${esc(plantById(e.id)?.name || e.id)}${snappedToday(e) ? ' ✓' : ''}</button>`).join('');
    $$('#which [data-id]').forEach((b) => b.addEventListener('click', () => { entry = state.garden.find((e) => e.id === b.dataset.id); state.active = entry.id; save(); chips(); ghost(); timeline(); $(`#which [data-id="${entry.id}"]`)?.focus(); }));
  }
  async function ghost() {
    $$('#frame .ghost, #frame .shot').forEach((x) => x.remove());
    const last = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const b = last && await getPhoto(last.key);
    $('#hint').hidden = false;
    if (b) { const g = new Image(); g.className = 'ghost'; g.alt = ''; g.src = objURL(b); $('#frame').prepend(g); $('#hint').textContent = 'Line it up with last time'; }
    else $('#hint').textContent = 'Fill the frame with your plant';
  }
  async function timeline() {
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? 1 : -1));
    $('#count').textContent = `${logs.length} photo${logs.length === 1 ? '' : 's'}`;
    const t = $('#timeline');
    t.innerHTML = logs.length ? logs.map((l) => `<figure data-k="${l.key}"><img alt="${esc(plantById(entry.id).name)} on ${l.date}"><figcaption>${new Date(l.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · ${l.score}${l.repaired ? ' · added later' : ''}</figcaption></figure>`).join('') : '<p class="muted">Your first photo starts the timeline.</p>';
    for (const f of $$('[data-k]', t)) { const b = await getPhoto(f.dataset.k); if (b && f.isConnected) f.querySelector('img').src = objURL(b); }
  }
  function show(res) {
    const fb = $('#feedback'); fb.removeAttribute('aria-busy');
    const m = res.m, pct = (x) => Math.round(x * 100);
    fb.innerHTML = `
      <div class="score"><b>${res.score}</b><div><h2>${res.score >= 70 ? 'Looking good' : res.score >= 50 ? 'Doing okay' : 'Needs a little help'}</h2><p class="muted small">out of 100, from the leaf colours${res.s ? ' and the smart check' : ''}</p></div></div>
      <div class="meter">
        <div><span>Green leaves</span><i><em style="width:${pct(m.green)}%"></em></i><span>${pct(m.green)}%</span></div>
        <div><span>Yellowing</span><i><em class="y" style="width:${pct(m.yellow)}%"></em></i><span>${pct(m.yellow)}%</span></div>
        <div><span>Dry or brown</span><i><em class="b" style="width:${pct(m.brown)}%"></em></i><span>${pct(m.brown)}%</span></div>
      </div>
      <ul class="notes">${res.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="muted small" style="margin-top:10px">A friendly guess made on your device, not a diagnosis.</p>`;
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
      if (!reduce) await new Promise((r) => setTimeout(r, 500));
      busy.remove();
      show(res);
      const r = $('#snap-btn').getBoundingClientRect(); burst(r.left + r.width / 2, r.top);
      toast(after > before ? (after === 1 ? 'Streak started! See you tomorrow.' : `${after} days in a row!`) : 'Photo saved to your timeline.');
      chips(); timeline();
      if (after > before && [7, 30, 100, 365].includes(after)) setTimeout(() => celebrate(after, plantById(entry.id), blob), reduce ? 0 : 900);
    } catch {
      busy.remove();
      const fb = $('#feedback'); fb.removeAttribute('aria-busy');
      fb.innerHTML = '<h2>That photo didn’t work</h2><p>Try another one: a JPEG or PNG picture works best.</p>';
    }
  });
  chips(); ghost(); timeline();
  return { unmount() { freeURLs(); } };
}

// used by the plant page
export async function removePlant(id) {
  const e = state.garden.find((x) => x.id === id); if (!e) return;
  await Promise.all(e.log.map((l) => delPhoto(l.key)));
  state.garden = state.garden.filter((x) => x !== e); state.active = state.garden[0]?.id || null; save();
  changed();
}
export { addToGarden };
