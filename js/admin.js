// Admin and demo tools (#/admin): set how many days a plant has been growing and add your own photos
// on chosen days, for screenshots and adverts. Everything stays on this device, like the rest of the app.
import { $, $$, esc, data, plantById, state, save, today, dayDiff, addToGarden, logPhoto, getPhoto, delPhoto, toast, stageName, overallStreak, logHarvest } from './core.js?v=9';
import { art, mascot } from './art.js?v=9';
import { award } from './rewards.js?v=9';

const isoMinus = (n, from = today()) => { const d = new Date(from + 'T12:00'); d.setDate(d.getDate() - n); return today(d); };
const maxDays = (p) => (p?.group === 'tree' ? 365 * 10 : Math.max(30, Math.round((p?.grow?.days_to_harvest?.[1] || 120) * 1.3)));
let urls = [];

export default async function admin(main, arg) {
  const D = await data();
  const plants = [...D.plants].sort((a, b) => a.name.localeCompare(b.name));
  let id = arg && plantById(arg) ? arg : state.active || state.garden[0]?.id || 'tomato';

  main.innerHTML = `
  <div class="page s3 ad3">
    <header class="ab3-head">
      <div class="ab3-pip">${mascot('wow', { size: 96 })}</div>
      <div><h1>Admin</h1><p>Demo tools · this device only</p></div>
    </header>
    <div class="ad3-grid">
      <section class="c3 ad3-card" aria-labelledby="ad-p-t">
        <div class="h3row">${art('calendar', { size: 40 })}<h2 id="ad-p-t">Days grown</h2></div>
        <label class="sel3 sel3-wide"><span class="vh">Plant</span><select id="ad-plant">${plants.map((p) => `<option value="${p.id}"${p.id === id ? ' selected' : ''}>${esc(p.name)}${state.garden.some((g) => g.id === p.id) ? ' ✓' : ''}</option>`).join('')}</select></label>
        <div class="ad3-days">
          <input type="range" id="ad-range" class="rng3" min="0" step="1" aria-label="Days grown">
          <input type="number" id="ad-num" class="num3" min="0" step="1" inputmode="numeric" aria-label="Days grown, as a number">
        </div>
        <p class="tag3 ad3-stage" id="ad-stage"></p>
        <button class="b3 b3-wide" id="ad-apply">Set days</button>
      </section>
      <section class="c3 ad3-card" aria-labelledby="ad-ph-t">
        <div class="h3row">${art('camera', { size: 40 })}<h2 id="ad-ph-t">Add photos</h2></div>
        <div class="seg3" role="radiogroup" aria-label="Dates for the photos">
          <label><input type="radio" name="ad-mode" value="streak" checked><span>One a day to</span></label>
          <label><input type="radio" name="ad-mode" value="same"><span>All on</span></label>
        </div>
        <input type="date" id="ad-date" class="num3 ad3-date" aria-label="Date">
        <label class="b3 b3-sky b3-wide ad-pick">Choose photos<input type="file" id="ad-files" accept="image/*" multiple class="vh"></label>
        <p class="ad3-busy" id="ad-busy" aria-live="polite"></p>
      </section>
      <section class="c3 ad3-card" aria-labelledby="ad-h-t">
        <div class="h3row">${art('basket', { size: 40 })}<h2 id="ad-h-t">Harvest</h2></div>
        <div class="ad3-days"><input type="number" id="ad-grams" class="num3" min="1" step="10" value="250" inputmode="numeric" aria-label="Grams picked"><span class="ad3-unit">g</span></div>
        <button class="b3 b3-tomato b3-wide" id="ad-harvest">Log today</button>
      </section>
      <section class="c3 ad3-card ad-photos" aria-labelledby="ad-l-t">
        <div class="h3row">${art('quest-photo', { size: 40 })}<h2 id="ad-l-t">Photos</h2><button class="b3 b3-white ad3-clear" id="ad-clear">Remove all</button></div>
        <ul class="ad3-list" id="ad-list"></ul>
      </section>
    </div>
  </div>`;

  const entry = () => state.garden.find((g) => g.id === id);
  const range = $('#ad-range'), num = $('#ad-num');
  $('#ad-date').value = today(); $('#ad-date').max = today();

  function showDays() {
    const p = plantById(id), e = entry();
    const max = maxDays(p);
    range.max = num.max = max;
    const n = e ? dayDiff(e.planted, today()) : 0;
    range.value = num.value = Math.min(n, max);
    stage();
  }
  function stage() {
    const p = plantById(id), n = +num.value || 0;
    const fake = { planted: isoMinus(n), log: entry()?.log || [] };
    $('#ad-stage').textContent = `Day ${n} · ${stageName(fake, p)}${entry() ? '' : ' · not planted'}`;
  }
  async function list() {
    urls.forEach(URL.revokeObjectURL); urls = [];
    const e = entry(), ul = $('#ad-list');
    const log = [...(e?.log || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!log.length) { ul.innerHTML = `<li class="empty3">${mascot('point', { size: 80 })}<p>No photos yet</p></li>`; return; }
    ul.innerHTML = log.map((l) => `<li data-date="${l.date}"><img alt="" width="88" height="88"><b>${esc(l.date)}<small>${esc(l.mood || '')}</small></b><button class="b3 b3-white ad3-x" data-del="${l.date}" aria-label="Remove photo from ${l.date}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join('');
    for (const li of $$('li[data-date]', ul)) {
      const l = log.find((x) => x.date === li.dataset.date);
      const b = l?.key && await getPhoto(l.key);
      if (b) { const u = URL.createObjectURL(b); urls.push(u); li.querySelector('img').src = u; }
    }
  }

  $('#ad-plant').addEventListener('change', (e) => { id = e.target.value; showDays(); list(); });
  range.addEventListener('input', () => { num.value = range.value; stage(); });
  num.addEventListener('input', () => { range.value = num.value; stage(); });
  $('#ad-apply').addEventListener('click', () => {
    const n = Math.max(0, Math.round(+num.value || 0));
    const e = entry() || addToGarden(id);
    e.planted = isoMinus(n);
    const first = e.log.map((l) => l.date).sort()[0];
    if (first && first < e.planted) toast('Some photos are older than the planting day; they still show.');
    state.active = id; save(); stage();
    toast(`${plantById(id).name}: day ${n}.`);
  });

  $('#ad-files').addEventListener('change', async (ev) => {
    const files = [...ev.target.files].sort((a, b) => a.lastModified - b.lastModified || a.name.localeCompare(b.name));
    ev.target.value = '';
    if (!files.length) return;
    const mode = $('input[name="ad-mode"]:checked').value, end = $('#ad-date').value || today();
    const e = entry() || addToGarden(id);
    const A = await import('./analyze.js?v=2');
    const busy = $('#ad-busy');
    for (let i = 0; i < files.length; i++) {
      const date = mode === 'same' ? end : isoMinus(files.length - 1 - i, end);
      busy.textContent = `Adding photo ${i + 1} of ${files.length}…`;
      try {
        const { blob, canvas } = await A.shrink(files[i]);
        const m = A.colours(canvas);
        const prev = [...e.log].sort((a, b) => (a.date < b.date ? 1 : -1)).find((l) => l.date < date);
        const res = { ...A.judge(m, null, plantById(id), prev), m };
        await logPhoto(e, date, blob, res);
        const l = e.log.find((x) => x.date === date); if (l) delete l.repaired; // a set-up photo, not a repaired day
        if (date < e.planted) e.planted = date; // a plant can't be photographed before it was planted
        award('photo', { date }); // demo states earn XP and quests like real photos
      } catch { toast(`Couldn’t read ${files[i].name}.`); }
    }
    save(); busy.textContent = '';
    showDays(); list();
    toast(`${files.length} photo${files.length > 1 ? 's' : ''} added. Streak: ${overallStreak()} days.`);
  });

  $('#ad-harvest').addEventListener('click', () => {
    const g = Math.round(+$('#ad-grams').value || 0); if (g <= 0) return;
    logHarvest(entry() || addToGarden(id), g); const r = award('harvest', { id, g }) || {};
    toast(`${g} g of ${plantById(id).name} logged${r.xp ? `. +${r.xp} XP` : ''}.`);
  });

  $('#ad-list').addEventListener('click', async (ev) => {
    const d = ev.target.closest('[data-del]')?.dataset.del; const e = entry(); if (!d || !e) return;
    const l = e.log.find((x) => x.date === d); if (l?.key) await delPhoto(l.key);
    e.log = e.log.filter((x) => x.date !== d); save(); list();
  });
  $('#ad-clear').addEventListener('click', async () => {
    const e = entry(); if (!e?.log.length) return;
    if (!confirm(`Remove all ${e.log.length} photos of ${plantById(id).name} from this device?`)) return;
    for (const l of e.log) if (l.key) await delPhoto(l.key);
    e.log = []; save(); list(); toast('Photos removed.');
  });

  showDays(); list();
  return { unmount() { urls.forEach(URL.revokeObjectURL); urls = []; } };
}
