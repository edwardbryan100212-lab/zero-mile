// Garden (home of the app) and Snap (daily photo → on-device feedback → timeline).
import {
  $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, getPhoto, delPhoto, toast, ROOT,
  overallStreak, bestStreak, nextMilestone, MILESTONES, lastDays, photoDays, wateredToday, toggleWatered, logHarvest, harvestKg, logPhoto, stageName,
} from './core.js?v=3';
import { FACES } from './ascii.js?v=2';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const px = (name) => new URL(`img/px/${name}.png`, ROOT).href;
const urls = [];
const objURL = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
const freeURLs = () => { urls.splice(0).forEach((u) => URL.revokeObjectURL(u)); };
const GREENS = ['#163d24', '#1d4a2b', '#2e6b35', '#3d8f3a', '#5aa83f'];

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
function pillClass(m) { return m === 'poorly' ? 'bad' : m === 'thirsty' ? 'warn' : m === 'sleepy' ? 'sleep' : ''; }
const snappedToday = (e) => e.log.some((l) => l.date === today());

// ---------- a burst of pixel blocks: the celebration when a photo is logged ----------
export function burst(x, y) {
  if (reduce) return;
  const cols = ['#5aa83f', '#3d8f3a', '#f6c935', '#d0202c', '#ffffff'];
  for (let i = 0; i < 34; i++) {
    const d = document.createElement('i'); d.className = 'burst';
    const s = 6 + Math.round(Math.random() * 3) * 3; d.style.width = d.style.height = s + 'px';
    d.style.background = cols[i % cols.length]; d.style.left = x + 'px'; d.style.top = y + 'px';
    document.body.appendChild(d);
    const a = Math.random() * Math.PI * 2, v = 90 + Math.random() * 160;
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v - 120;
    d.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px, ${dy + 260}px)`, opacity: 0 }], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => d.remove();
  }
}

// ---------- share card for streak milestones ----------
function shareCard(n, plant, photoBlob) {
  return new Promise((resolve) => {
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    // dithered pixel-block field in the garden greens, drawn in blocks of 30
    const cols = ['#163d24', '#1d4a2b', '#2e6b35', '#3d8f3a'];
    for (let by = 0; by < H; by += 30) for (let bx = 0; bx < W; bx += 30) {
      const v = (Math.sin(bx * .006 + by * .004) + Math.sin(by * .009 - bx * .003) + 2) / 4 + (((bx / 30 + by / 30) % 2) ? .08 : -.08);
      x.fillStyle = cols[Math.max(0, Math.min(3, Math.floor(v * 4)))]; x.fillRect(bx, by, 30, 30);
    }
    x.fillStyle = '#f6c935'; x.font = '700 300px Bricolage Grotesque, sans-serif'; x.textBaseline = 'alphabetic';
    x.fillText(String(n), 80, 390);
    x.fillStyle = '#fff'; x.font = '600 76px Bricolage Grotesque, sans-serif';
    x.fillText('day streak', 80, 490);
    x.font = '500 50px Bricolage Grotesque, sans-serif'; x.fillText(`Growing ${plant.name.toLowerCase()}`, 80, 570);
    x.font = '700 56px Bricolage Grotesque, sans-serif'; x.fillText('Zero Mile', 80, H - 80);
    const done = () => c.toBlob((b) => resolve({ canvas: c, blob: b }), 'image/png');
    if (!photoBlob) return done();
    const img = new Image();
    img.onload = () => { const s = 560; const k = Math.max(s / img.width, s / img.height); const w = img.width * k, h = img.height * k;
      x.save(); x.beginPath(); x.rect(W - s - 80, 640, s, s); x.clip(); x.drawImage(img, W - s - 80 + (s - w) / 2, 640 + (s - h) / 2, w, h); x.restore(); done(); };
    img.onerror = done; img.src = URL.createObjectURL(photoBlob);
  });
}
async function celebrate(n, plant, blob) {
  const { canvas, blob: card } = await shareCard(n, plant, blob);
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ms-t"><h2 id="ms-t">${n} days in a row!</h2><p class="muted">Your robot pot levelled up. Share your streak card or save it.</p><div class="acts"><button class="btn btn-accent" id="ms-share">Share</button><a class="btn btn-soft" id="ms-save" download="zero-mile-${n}-day-streak.png">Save image</a><button class="btn btn-line" id="ms-close">Close</button></div></div>`;
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
  const after = overallStreak();
  return { res, blob, before, after };
}

// ================= GARDEN =================
export default async function garden(main) {
  await data();
  freeURLs();
  if (!state.garden.length) {
    main.innerHTML = `
    <div class="empty">
      <div class="empty-art" id="empty-art" style="width:100%"><img class="px" src="${px('seedling')}" alt="Small hands holding a tomato seedling, in pixel blocks" width="100" height="100"></div>
      <h1>Plant your first seed</h1>
      <p class="muted" style="max-width:40ch">Pick something to grow. Snap it once a day: the app checks the leaves right on your phone, your streak grows, and your robot pot shows how your plant feels.</p>
      <a class="btn btn-accent" href="#/find">Pick a plant</a>
    </div>`;
    const { ditherBg } = await import('./ditherbg.js?v=3');
    const bg = ditherBg($('#empty-art'), { mode: 'cells', colors: ['#cfe3bf', '#dcebcf', '#e6f2dc', '#eef6e8', '#f6faf2'], block: 7 });
    return { unmount() { bg.dispose(); } };
  }
  let entry = state.garden.find((e) => e.id === state.active) || state.garden[0];
  const n = overallStreak(), goal = nextMilestone(n), total = photoDays().size;
  const prevGoal = [0, ...MILESTONES].filter((m) => m <= n).pop() ?? 0;
  const snappedAny = state.garden.some(snappedToday);
  // a growth journal, not a scoreboard: never lead with a big zero
  const headline = n > 0
    ? `<div class="streak-row"><span class="streak-n">${n}</span><span class="streak-w">day<br>streak</span></div>
       <div class="goal"><span>${goal - n} more ${goal - n === 1 ? 'day' : 'days'} to your ${goal}-day badge${bestStreak() > n ? ` · best ${bestStreak()}` : ''}</span><div class="bar"><i style="transform:scaleX(${Math.min(1, (n - prevGoal) / Math.max(1, goal - prevGoal))})"></i></div></div>`
    : `<p class="streak-w" style="font-size:1.25rem;max-width:22ch">${total ? `${total} photo ${total === 1 ? 'day' : 'days'} in your journal. Snap today to start a new run.` : 'Snap your first photo to start your growth journal.'}</p>`;
  main.innerHTML = `
  <div class="g-grid">
    <div class="g-left" style="display:grid;gap:16px">
      <section class="hello" id="hello" aria-labelledby="g-title">
        <h1 id="g-title">${greeting()}</h1>
        ${headline}
        <div class="week" role="list" aria-label="The last seven days" id="week"></div>
        ${snappedAny ? '' : `<a class="btn btn-accent" href="#/snap/${entry.id}" style="justify-self:start"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Snap today’s photo</a>`}
      </section>
      <section class="pot-card" aria-label="Your plant in its robot pot">
        <div class="stage3d" id="pot-stage"></div>
        <div class="mood"><span class="pill" id="mood"><i></i><span></span></span><span class="pill" id="age"></span></div>
      </section>
      <section class="card flip" aria-labelledby="flip-t">
        <div class="section-title" style="margin-top:0"><h2 id="flip-t">Growth flipbook</h2><span class="label" id="flip-n"></span></div>
        <div class="flip-view" id="flip-view"><p class="muted">Snap a few days in a row and your photos play back here like a timelapse.</p></div>
        <div class="flip-acts" id="flip-acts" hidden><button class="btn btn-sm" id="flip-play" aria-pressed="false">Play</button><input type="range" id="flip-scrub" min="0" max="0" value="0" aria-label="Choose a day"><span class="label" id="flip-date"></span></div>
      </section>
    </div>
    <div>
      <div class="section-title"><h2>Your plants</h2><a class="link" href="#/find">Add a plant</a></div>
      <div class="plants" id="plants"></div>
      <input type="file" accept="image/*" class="vh" id="repair-in" aria-hidden="true" tabindex="-1">
    </div>
  </div>`;

  const [{ ditherBg }, { createViewer, plantThumb }, { makePot }] = await Promise.all([import('./ditherbg.js?v=3'), import('./viewer.js?v=3'), import('./pot3d.js?v=2')]);
  const bg = ditherBg($('#hello'), { mode: 'cells', colors: GREENS, block: 7, speed: .8 });
  const v = createViewer($('#pot-stage'), { controls: true, spin: false, background: '#eaf3e1' });
  let pot; v.onFrame = (dt) => pot?.tick(dt);

  function drawPot() {
    v.setPlant(entry.id, growthT(entry), { extraObject: (box) => { const size = box.getSize(new (box.min.constructor)()); pot = makePot(Math.max(.07, Math.max(size.x, size.z) * .32, size.y * .16)); return pot.group; } });
    pot.setMood(moodOf(entry)); v.stage.rotation.y = .6; v.kick();
    const m = moodOf(entry), p = plantById(entry.id);
    $('#mood').className = 'pill ' + pillClass(m); $('#mood span').textContent = `${p.name}: ${FACES[m].word.toLowerCase()}`;
    const age = dayDiff(entry.planted, today());
    $('#age').textContent = age === 0 ? 'Planted today' : `Day ${age + 1}`;
  }

  // the last 7 days: photo days filled, missed days can be fixed with a photo taken that day
  async function week() {
    const days = photoDays(), first = state.garden.map((e) => e.planted).sort()[0];
    const el = $('#week'); el.innerHTML = '';
    for (const d of lastDays(7)) {
      const dn = new Date(d + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' });
      const done = days.has(d), isToday = d === today(), missed = !done && !isToday && d >= first;
      const t = document.createElement(missed ? 'button' : 'div');
      t.className = `day${done ? ' done' : ''}${isToday ? ' today' : ''}${missed ? ' miss' : ''}`;
      t.setAttribute('role', 'listitem');
      t.setAttribute('aria-label', `${dn}${done ? ', photo taken' : missed ? ', no photo, tap to add one from that day' : ''}${isToday ? ', today' : ''}`);
      t.innerHTML = `${dn.slice(0, 2)}${missed ? '<span class="fix">+</span>' : ''}`;
      if (missed) t.addEventListener('click', () => { $('#repair-in').dataset.date = d; $('#repair-in').click(); });
      el.appendChild(t);
      if (done) {
        const l = state.garden.flatMap((e) => e.log).find((x) => x.date === d);
        const b = l && await getPhoto(l.key);
        if (b && t.isConnected) { const img = new Image(); img.alt = ''; img.src = objURL(b); t.appendChild(img); }
      }
    }
  }
  $('#repair-in').addEventListener('change', async (e) => {
    const f = e.target.files?.[0], d = e.target.dataset.date; e.target.value = '';
    if (!f || !d) return;
    await analyseAndLog(entry, f, d);
    toast('Added to your journal.');
    render();
  });

  async function cards() {
    const box = $('#plants');
    box.innerHTML = state.garden.map((e) => {
      const p = plantById(e.id); if (!p) return '';
      const snapped = snappedToday(e), w = wateredToday(e), kg = harvestKg(e);
      return `<article class="plant${e === entry ? ' active' : ''}" data-id="${e.id}">
        <button class="plant-art" data-pick aria-label="Show ${esc(p.name)} in the pot"><img alt="" data-thumb="${e.id}"></button>
        <div>
          <h3>${esc(p.name)}</h3>
          <p class="meta">Day ${dayDiff(e.planted, today()) + 1} · ${stageName(e, p)}${kg ? ` · ${fmt(kg, 2)} kg picked` : ''}</p>
          <span class="status ${snapped ? 'ok' : 'todo'}">${snapped ? 'Snapped today' : 'Needs today’s photo'}</span>
        </div>
        <div class="acts">
          <button class="btn btn-sm ${w ? '' : 'btn-soft'}" data-water aria-pressed="${w}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg><span>${w ? 'Watered' : 'Water'}</span></button>
          <a class="btn btn-sm btn-soft" href="#/snap/${e.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Snap</a>
          <button class="btn btn-sm btn-soft" data-pickup aria-expanded="false">Picked some</button>
          <a class="btn btn-sm btn-line" href="#/plant/${e.id}">Details</a>
        </div>
        <div class="harvest-chips" hidden>${[100, 250, 500, 1000].map((g) => `<button class="chip" data-g="${g}">${g < 1000 ? g + ' g' : '1 kg'}</button>`).join('')}</div>
      </article>`;
    }).join('');
    $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => { const id = b.closest('.plant').dataset.id; entry = state.garden.find((e) => e.id === id); state.active = id; save(); drawPot(); flipbook(); $$('.plant', box).forEach((c) => c.classList.toggle('active', c.dataset.id === id)); }));
    $$('[data-water]', box).forEach((b) => b.addEventListener('click', () => {
      const e = state.garden.find((x) => x.id === b.closest('.plant').dataset.id); const on = toggleWatered(e);
      b.setAttribute('aria-pressed', on); b.classList.toggle('btn-soft', !on); b.querySelector('span').textContent = on ? 'Watered' : 'Water';
      if (on) { const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); }
      if (e === entry) drawPot();
    }));
    $$('[data-pickup]', box).forEach((b) => b.addEventListener('click', () => { const h = b.closest('.plant').querySelector('.harvest-chips'); h.hidden = !h.hidden; b.setAttribute('aria-expanded', !h.hidden); }));
    $$('[data-g]', box).forEach((b) => b.addEventListener('click', () => {
      const e = state.garden.find((x) => x.id === b.closest('.plant').dataset.id); logHarvest(e, +b.dataset.g);
      const t = trip(plantById(e.id), state.region);
      toast(t ? `Logged. You skipped ${fmt(t.crowMi)} food miles.` : 'Harvest logged. Enjoy it!');
      const r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top); cards();
    }));
    for (const img of $$('[data-thumb]', box)) { if (!img.isConnected) return; img.src = await plantThumb(img.dataset.thumb); await new Promise((r) => setTimeout(r, 0)); }
  }

  // flip through this plant's own photos, oldest to newest
  let flipTimer = 0, frames = [];
  async function flipbook() {
    clearInterval(flipTimer); flipTimer = 0;
    const logs = [...entry.log].sort((a, b) => (a.date < b.date ? -1 : 1));
    $('#flip-n').textContent = logs.length ? `${logs.length} day${logs.length === 1 ? '' : 's'}` : '';
    const view = $('#flip-view'), acts = $('#flip-acts');
    if (logs.length < 2) { view.innerHTML = `<p class="muted">${logs.length ? 'One photo so far. Snap again tomorrow and it starts to play.' : 'Snap a few days in a row and your photos play back here like a timelapse.'}</p>`; acts.hidden = true; return; }
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
    const p = plantById(entry.id), st = stageName(entry, p);
    const said = entry.stagesSeen ||= [];
    const msg = { Sprout: `${p.name} has sprouted!`, Flowering: `First flowers on your ${p.name.toLowerCase()}!`, 'Ready to pick': `Your ${p.name.toLowerCase()} is ready to pick!` }[st];
    if (msg && !said.includes(st)) { said.push(st); save(); setTimeout(() => { toast(msg); const r = $('#pot-stage')?.getBoundingClientRect(); if (r) burst(r.left + r.width / 2, r.top + r.height / 2); }, 600); }
  }
  function render() { drawPot(); week(); cards(); flipbook(); stages(); }
  render();
  return { unmount() { clearInterval(flipTimer); bg.dispose(); v.dispose(); freeURLs(); } };
}

// ================= SNAP =================
export async function snapView(main, id) {
  await data();
  freeURLs();
  if (!state.garden.length) {
    main.innerHTML = `<div class="empty"><h1>Nothing to snap yet</h1><p class="muted">Add a plant to your garden first, then come back for its daily photo.</p><a class="btn btn-accent" href="#/find">Pick a plant</a></div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === id) || state.garden.find((e) => e.id === state.active) || state.garden[0];
  main.innerHTML = `
  <div class="page-head"><div><h1>Snap today</h1><p>Line your plant up with the faint picture of last time, so your photos make a growing timeline.</p></div></div>
  <div class="chips" role="group" aria-label="Which plant" id="which" style="margin-bottom:14px"></div>
  <div class="snap-grid">
    <div>
      <div class="frame" id="frame"><div class="corners" aria-hidden="true"></div><p class="hint" id="hint">Fill the frame with your plant</p></div>
      <div class="snap-actions" style="margin-top:12px">
        <label class="btn btn-accent" for="photo" id="snap-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>Take a photo</label>
        <input id="photo" class="vh" type="file" accept="image/*" capture="environment">
      </div>
      <label class="toggle"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}> Smart check: downloads a 90 MB model once and runs on your device. Nothing is uploaded.</label>
    </div>
    <div style="display:grid;gap:16px">
      <section class="card feedback" id="feedback" aria-live="polite" hidden></section>
      <section class="card"><div class="section-title" style="margin-top:0"><h2>Timeline</h2><span class="label" id="count"></span></div><div class="timeline" id="timeline"></div></section>
    </div>
  </div>`;
  const style = document.createElement('style'); style.textContent = '.snap-actions:has(#photo:focus-visible) #snap-btn { outline: 3px solid var(--ink); outline-offset: 3px; }'; main.appendChild(style);

  function chips() {
    $('#which').innerHTML = state.garden.map((e) => `<button class="chip" data-id="${e.id}" aria-pressed="${e === entry}">${esc(plantById(e.id)?.name || e.id)}${snappedToday(e) ? ' · done' : ''}</button>`).join('');
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
    t.innerHTML = logs.length ? logs.map((l) => `<figure data-k="${l.key}"><img alt="${esc(plantById(entry.id).name)} on ${l.date}"><figcaption>${new Date(l.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · ${l.score}${l.repaired ? ' · fixed' : ''}</figcaption></figure>`).join('') : '<p class="muted">Your first photo starts the timeline.</p>';
    for (const f of $$('[data-k]', t)) { const b = await getPhoto(f.dataset.k); if (b && f.isConnected) f.querySelector('img').src = objURL(b); }
  }
  function show(res) {
    const fb = $('#feedback'); fb.hidden = false; fb.removeAttribute('aria-busy');
    const m = res.m, pct = (x) => Math.round(x * 100);
    fb.innerHTML = `
      <div class="score"><b>${res.score}</b><div><h2 style="font-size:1.3rem">${res.score >= 70 ? 'Looking good' : res.score >= 50 ? 'Doing okay' : 'Needs a little help'}</h2><p class="muted">out of 100, from leaf colours${res.s ? ' and the smart check' : ''}</p></div></div>
      <div class="meter">
        <div><span>Green leaves</span><i><em style="width:${pct(m.green)}%"></em></i><span>${pct(m.green)}%</span></div>
        <div><span>Yellowing</span><i><em class="y" style="width:${pct(m.yellow)}%"></em></i><span>${pct(m.yellow)}%</span></div>
        <div><span>Dry or brown</span><i><em class="b" style="width:${pct(m.brown)}%"></em></i><span>${pct(m.brown)}%</span></div>
      </div>
      <ul class="notes">${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      <p class="label">A friendly guess made on your device, not a diagnosis.</p>`;
  }
  $('#smart').addEventListener('change', async (e) => { state.smartAI = e.target.checked; save(); if (state.smartAI) (await import('./analyze.js?v=2')).loadSmart().catch(() => toast('Couldn’t download the smart check. The colour check still works.')); });
  let busyBg = null;
  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const frame = $('#frame');
    $$('#frame .ghost, #frame .shot').forEach((x) => x.remove());
    const shot = new Image(); shot.className = 'shot'; shot.alt = 'Your photo'; shot.src = objURL(file); frame.prepend(shot); $('#hint').hidden = true;
    const busy = document.createElement('div'); busy.className = 'busy'; busy.innerHTML = '<p>Looking at your leaves</p>'; frame.appendChild(busy);
    const { ditherBg } = await import('./ditherbg.js?v=3');
    busyBg = ditherBg(busy, { mode: 'seeds', colors: ['#1d4a2b', '#2e6b35', '#5aa83f', '#9fd47f', '#f6c935'], block: 8, speed: 2.5 });
    $('#feedback').setAttribute('aria-busy', 'true');
    try {
      const { res, blob, before, after } = await analyseAndLog(entry, file, today(), (msg) => { busy.querySelector('p').textContent = msg; });
      if (!reduce) await new Promise((r) => setTimeout(r, 700)); // let the seeds drift for a moment
      busyBg.dispose(); busyBg = null; busy.remove();
      show(res);
      const r = $('#snap-btn').getBoundingClientRect(); burst(r.left + r.width / 2, r.top);
      toast(after > before ? (after === 1 ? 'Streak started! See you tomorrow.' : `${after} days in a row!`) : 'Photo saved to your timeline.');
      chips(); timeline();
      if (after > before && [7, 30, 100, 365].includes(after)) setTimeout(() => celebrate(after, plantById(entry.id), blob), reduce ? 0 : 900);
    } catch {
      busyBg?.dispose(); busyBg = null; busy.remove();
      const fb = $('#feedback'); fb.hidden = false; fb.removeAttribute('aria-busy');
      fb.innerHTML = '<h2 style="font-size:1.3rem">That photo didn’t work</h2><p>Try another one: a JPEG or PNG picture works best.</p>';
    }
  });
  chips(); ghost(); timeline();
  return { unmount() { busyBg?.dispose(); freeURLs(); } };
}

// used by the plant page
export async function removePlant(id) {
  const e = state.garden.find((x) => x.id === id); if (!e) return;
  await Promise.all(e.log.map((l) => delPhoto(l.key)));
  state.garden = state.garden.filter((x) => x !== e); state.active = state.garden[0]?.id || null; save();
}
