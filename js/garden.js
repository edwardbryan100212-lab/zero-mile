// My garden: the plant in a robot pot, the daily photo streak, on-device feedback and what you have saved.
import { $, $$, esc, fmt, data, plantById, trip, state, save, today, dayDiff, streakOf, putPhoto, getPhoto, delPhoto, toast, updateBar } from './app.js?v=2';
import { FACES, SPROUT, SPIN } from './ascii.js?v=2';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export default async function garden(main) {
  const D = await data();
  if (!state.garden.length) {
    main.innerHTML = `<div class="view"><div class="no-plants">
      <pre class="ascii" aria-hidden="true">${SPROUT}</pre>
      <h1 style="font-size:var(--step-head)">Your garden is empty</h1>
      <p>Pick a plant to grow. Then snap it once a day: the app checks the leaves and your robot pot shows how it feels.</p>
      <a class="btn btn-accent" href="#/find">Pick my first plant</a></div></div>`;
    return;
  }
  let entry = state.garden.find((e) => e.id === state.active) || state.garden[0];
  const urls = [];
  const objURL = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };

  main.innerHTML = `
  <div class="view">
    <div class="garden">
      <div class="pot-stage">
        <div class="stage3d" id="pot-stage"></div>
        <div class="mood"><span id="mood-line"></span><small id="age-line"></small></div>
      </div>
      <div>
        <div class="plant-tabs chips" role="group" aria-label="Your plants" id="tabs"></div>
        <h1 class="vh">My garden</h1>
        <div class="streak"><b id="streak">0</b><span id="streak-word">day streak</span></div>
        <div class="week" id="week" role="list" aria-label="This week’s photos"></div>
        <div class="snap">
          <label class="btn btn-accent" for="photo" id="snap-btn">Snap today’s photo</label>
          <input id="photo" class="vh" type="file" accept="image/*" capture="environment">
          <label class="ai-toggle"><input type="checkbox" id="smart"${state.smartAI ? ' checked' : ''}> Smart check (downloads a 90 MB model once, runs on your device)</label>
        </div>
        <div class="feedback" id="feedback" aria-live="polite" hidden></div>
        <div class="savings" id="savings"></div>
        <div class="history"><h2>Photo diary</h2><div class="strip" id="strip"></div></div>
        <p style="margin-top:28px"><button class="btn btn-quiet" id="remove">Remove this plant</button></p>
      </div>
    </div>
  </div>`;

  const [{ createViewer }, { makePot }, A] = await Promise.all([import('./viewer.js?v=2'), import('./pot3d.js?v=2'), import('./analyze.js?v=2')]);
  const v = createViewer($('#pot-stage'), { controls: true, spin: false, background: '#1d4a2b' });
  let pot;
  v.onFrame = (dt) => pot?.tick(dt);

  function growthT(e) {
    const p = plantById(e.id), age = dayDiff(e.planted, today());
    const days = p.grow?.days_to_harvest?.[1] || (p.group === 'tree' ? 365 * 4 : 120);
    return Math.max(.1, Math.min(1, .1 + age / days));
  }
  function moodOf(e) {
    const last = [...e.log].sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (!last) return 'new';
    if (last.date !== today()) return 'sleepy';
    return last.mood;
  }
  function drawPot() {
    const t = growthT(entry);
    v.setPlant(entry.id, t, {
      extraObject: (box) => {
        const size = box.getSize(new (box.min.constructor)());
        pot = makePot(Math.max(.07, Math.max(size.x, size.z) * .32, size.y * .16));
        return pot.group;
      },
    });
    pot.setMood(moodOf(entry));
    v.stage.rotation.y = .6; // turn the face toward the camera
    v.kick();
  }

  let renderId = 0;
  async function render() {
    const my = ++renderId;
    const p = plantById(entry.id);
    $('#tabs').innerHTML = state.garden.map((e) => `<button class="chip" data-id="${e.id}" aria-pressed="${e === entry}">${esc(plantById(e.id).name)}</button>`).join('') + `<a class="chip" href="#/find" style="display:inline-flex;align-items:center;text-decoration:none">Add a plant</a>`;
    $$('#tabs [data-id]').forEach((b) => b.addEventListener('click', async () => { const id = b.dataset.id; entry = state.garden.find((e) => e.id === id); state.active = id; save(); drawPot(); await render(); $(`#tabs [data-id="${id}"]`)?.focus(); }));
    const mood = moodOf(entry), f = FACES[mood];
    $('#mood-line').textContent = `${p.name}: ${f.word}`;
    const age = dayDiff(entry.planted, today());
    $('#age-line').textContent = age === 0 ? 'Planted today' : `Day ${age + 1} since planting`;
    const n = streakOf(entry);
    $('#streak').textContent = n;
    $('#streak-word').textContent = n === 1 ? 'day streak' : 'day streak';
    const snapped = entry.log.some((l) => l.date === today());
    $('#snap-btn').textContent = snapped ? 'Snap again today' : 'Snap today’s photo';
    // the last seven days
    const wk = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); wk.push(today(d)); }
    $('#week').innerHTML = wk.map((d) => { const l = entry.log.find((x) => x.date === d); const dn = new Date(d + 'T12:00').toLocaleDateString('en-IE', { weekday: 'short' }); return `<div role="listitem" aria-label="${dn}${l ? ', photo taken' : ', no photo'}${d === today() ? ', today' : ''}" class="${l ? 'done' : ''}${d === today() ? ' today' : ''}" data-day="${d}" title="${d}">${l ? '' : dn}</div>`; }).join('');
    for (const el of $$('#week [data-day]')) { const l = entry.log.find((x) => x.date === el.dataset.day); if (l) { const b = await getPhoto(l.key); if (my !== renderId) return; if (b) el.innerHTML = `<img src="${objURL(b)}" alt="Photo from ${esc(el.dataset.day)}">`; } }
    // savings so far: each photo day you grew instead of shipped
    const tr = trip(p, state.region);
    $('#savings').innerHTML = `
      <div class="stat"><b>${entry.log.length}</b><span>photos in your diary</span></div>
      <div class="stat"><b>${tr ? fmt(tr.crowMi) : '—'}</b><span>air miles saved on every ${esc(p.name.toLowerCase())} you pick, vs the shop one</span></div>
      <div class="stat"><b>${tr ? fmt(tr.co2Transport * 1000) + ' g' : p.tree ? fmt(Array.isArray(p.tree.co2_kg_per_year) ? p.tree.co2_kg_per_year[0] : p.tree.co2_kg_per_year) + ' kg' : '—'}</b><span>${tr ? 'transport CO2e saved per kilo you grow' : 'CO2 a mature tree soaks up each year'}</span></div>`;
    const logs = [...entry.log].sort((a, b) => a.date < b.date ? 1 : -1);
    $('#strip').innerHTML = logs.length ? logs.map((l) => `<figure data-k="${l.key}"><img alt="Photo from ${l.date}"><figcaption>${new Date(l.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })} · ${l.score}</figcaption></figure>`).join('') : '<p>No photos yet. Your first snap starts the streak.</p>';
    for (const fig of $$('#strip [data-k]')) { const b = await getPhoto(fig.dataset.k); if (my !== renderId) return; if (b) fig.querySelector('img').src = objURL(b); }
    updateBar();
  }

  function showFeedback(res, imgURL, prevStreak) {
    const fb = $('#feedback'); fb.hidden = false; fb.removeAttribute('aria-busy');
    const m = res.m;
    fb.innerHTML = `
      <h2>${res.score >= 70 ? 'Looking good' : res.score >= 50 ? 'Doing okay' : 'Needs a little help'} · ${res.score}/100</h2>
      <div class="grid"><img src="${imgURL}" alt="Today’s photo">
        <div class="meter">
          <div><span>Green leaves</span><i><em style="width:${Math.round(m.green * 100)}%"></em></i><span>${Math.round(m.green * 100)}%</span></div>
          <div><span>Yellowing</span><i><em class="y" style="width:${Math.round(m.yellow * 100)}%"></em></i><span>${Math.round(m.yellow * 100)}%</span></div>
          <div><span>Dry or brown</span><i><em class="b" style="width:${Math.round(m.brown * 100)}%"></em></i><span>${Math.round(m.brown * 100)}%</span></div>
          ${res.s ? `<p class="cite">Smart check: ${Object.entries(res.s).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, x]) => `${k} ${Math.round(x * 100)}%`).join(', ')}</p>` : ''}
        </div></div>
      <ul>${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      <p class="cite">Checked on your device from leaf colours${res.s ? ' and a CLIP vision model' : ''}. It’s a friendly guess, not a diagnosis.</p>`;
    const n = streakOf(entry);
    if (n > prevStreak) toast(n === 1 ? 'Streak started! See you tomorrow.' : `${n} days in a row!`);
  }

  $('#smart').addEventListener('change', (e) => { state.smartAI = e.target.checked; save(); if (state.smartAI) A.loadSmart().catch(() => toast('Couldn’t download the smart check. Colour check still works.')); });
  $('#photo').addEventListener('change', async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const fb = $('#feedback'); fb.hidden = false;
    fb.setAttribute('aria-busy', 'true'); fb.innerHTML = '<h2>Looking at your leaves <span aria-hidden="true" id="spin"></span></h2>';
    let i = 0, lastPct = -25; const spin = setInterval(() => { const s = $('#spin'); if (s) s.textContent = SPIN[i++ % SPIN.length]; }, 160);
    try {
      const prevStreak = streakOf(entry);
      const { blob, canvas } = await A.shrink(file);
      const m = A.colours(canvas);
      let s = null;
      if (state.smartAI) {
        try { s = await A.smart(canvas, (pr) => { if (pr.status === 'progress' && pr.progress && pr.progress - lastPct >= 25) { lastPct = Math.floor(pr.progress / 25) * 25; fb.innerHTML = `<h2>Downloading the smart check ${lastPct}%</h2><p>This happens once. After that it works offline.</p>`; } }); }
        catch { toast('Smart check unavailable, used the colour check.'); }
      }
      const prev = [...entry.log].sort((a, b) => a.date < b.date ? 1 : -1).find((l) => l.date !== today());
      const res = { ...A.judge(m, s, plantById(entry.id), prev), m, s };
      const key = `${entry.id}:${today()}`;
      await putPhoto(key, blob);
      entry.log = entry.log.filter((l) => l.date !== today());
      entry.log.push({ date: today(), key, score: res.score, mood: res.mood, cover: m.cover });
      save();
      clearInterval(spin);
      pot?.setMood(res.mood);
      showFeedback(res, objURL(blob), prevStreak);
      render();
    } catch (err) {
      clearInterval(spin); fb.removeAttribute('aria-busy');
      fb.innerHTML = `<h2>That photo didn’t work</h2><p>Try another one, or a JPEG or PNG picture.</p>`;
    }
  });
  $('#remove').addEventListener('click', async () => {
    if (!confirm(`Remove ${plantById(entry.id).name} and its photo diary from this device?`)) return;
    await Promise.all(entry.log.map((l) => delPhoto(l.key)));
    state.garden = state.garden.filter((e) => e !== entry); state.active = state.garden[0]?.id || null; save();
    location.hash = '#/garden'; dispatchEvent(new HashChangeEvent('hashchange'));
  });

  drawPot(); render();
  return { unmount() { v.dispose(); urls.forEach((u) => URL.revokeObjectURL(u)); } };
}
