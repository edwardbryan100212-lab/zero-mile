// Zero Mile: "Care today". A short list of real jobs for your plants, from the cited plant data in data/data.json
// (grow.water, grow.tips, grow.days_to_harvest, tree.care) plus your garden (planted date, watered days, photos)
// and the local forecast (js/weather.js). Simple on the surface (a tick and a few words), deep one tap away:
// each row expands to say why, with its source.
//   mountCare(el)          Today's list (#care-slot)
//   mountPlantCare(el, id) one plant: its jobs, what's coming up, the time-lapse and its journal (#plant-care-slot)
// Rules use only what the data says. Where a rule would need a fact the data doesn't have, there is no rule.
// How often to remind (e.g. every 2 days for a medium water need) is the app's own reminder rhythm, and says so.
// Saved per plant: entry.care = { kind: ['YYYY-MM-DD', …] } (jobs done) and entry.notes = [{ date, text }].
// Everything fails safe: on any error the slot stays empty.
import { state, save, esc, today, dayDiff, plantById, data, thumb, toggleWatered, wateredToday, isTree, treePhotoDue, stageName } from './core.js?v=9';
import { glyph, forecast, conditions, stripHtml, placeHtml, useMyLocation, forgetLocation, WX_SOURCE, WX_RULES } from './weather.js?v=10';
import { mountTimelapse, photoCount } from './timelapse.js?v=9';
import { produceIcon } from './produce.js?v=9';

// ---------- the rules ----------
const WATER_WORD = { high: 'a lot of', med: 'a medium amount of', low: 'little' };
const WATER_EVERY = { high: 1, med: 2, low: 4 }; // the app's reminder rhythm, not a cited fact
const tipOf = (p, re) => (p.grow?.tips || []).find((x) => re.test(x)) || (p.tree?.care || []).find((x) => re.test(x)) || null;
// the guide a tip comes from: the first cited source of the plant's growing info (the RHS guide for most plants)
function guide(p, re) {
  const list = isTree(p) ? (p.tree?.sources || []) : (p.grow?.sources || []);
  return (re && list.find((s) => re.test(s.quote || '') || re.test(s.title || ''))) || list[0] || null;
}
const short = (p) => p.name.replace(/^(English|Common|Silver|Downy|Scots|Sweet|Wild) /, '').toLowerCase();
const lastOf = (arr) => (arr || []).slice().sort().pop() || null;
const doneOn = (e, kind) => (e.care?.[kind] || []);
const lastDone = (e, kind) => lastOf(doneOn(e, kind));
const doneToday = (e, kind) => doneOn(e, kind).includes(today());
const daysSince = (iso) => (iso ? dayDiff(iso, today()) : Infinity);
function markDone(e, kind, on) {
  e.care ||= {}; const l = (e.care[kind] ||= []);
  if (on && !l.includes(today())) l.push(today());
  if (!on) e.care[kind] = l.filter((d) => d !== today());
  e.care[kind] = e.care[kind].slice(-40); save();
}
// growth: days since planting, and the cited days to harvest
function growth(e, p) {
  const age = Math.max(0, dayDiff(e.planted, today())), dth = p.grow?.days_to_harvest;
  return { age, dth, t: dth?.[1] ? age / dth[1] : null, stage: stageName(e, p) };
}
// "feed every 10–14 days", "every two weeks", "weekly", "fortnight" → days
function feedEvery(tip) {
  const m = tip.match(/every (\d+)\s*[–-]\s*(\d+) days/i); if (m) return +m[1];
  if (/every two weeks|fortnight/i.test(tip)) return 14;
  if (/weekly|every week/i.test(tip)) return 7;
  return null;
}

// all jobs for one plant. Each: { key, kind, icon, title, why[], src, due, done, act, soon }
export function jobsFor(e, p, wx = null) {
  const out = [], g = growth(e, p), name = short(p), tree = isTree(p);
  const add = (j) => out.push({ src: guide(p), ...j, key: `${e.id}:${j.kind}` });

  if (!tree && p.grow?.water) {
    // water: from the plant's water need, the days since you last watered, and today's weather
    const need = p.grow.water, last = lastOf(e.watered), since = last ? daysSince(last) : null;
    let every = WATER_EVERY[need] || 2; if (wx?.hotDry) every = 1;
    const done = wateredToday(e), tip = tipOf(p, /water|moist|dry/i);
    const why = [`${p.name} needs ${WATER_WORD[need] || 'some'} water.`];
    if (tip) why.push(tip);
    why.push(since == null ? 'Not watered in the app yet.' : since === 0 ? 'Watered today.' : `Last watered ${since} day${since === 1 ? '' : 's'} ago.`);
    why.push(`Zero Mile reminds you every ${every === 1 ? 'day' : `${every} days`}${wx?.hotDry ? ' in hot, dry weather' : ''}. Feel the soil first.`);
    const rainSkip = wx?.rainToday && !done;
    const due = done || (!rainSkip && (since == null || since >= every));
    add({ kind: 'water', icon: 'drop', title: `Water the ${name}`, why, due, done, act: 'water', soonIn: since == null ? 0 : Math.max(0, every - since) });
  }
  if (!tree && g.dth) {
    // feed, only where the guide says how often, and only once it's flowering
    const tip = tipOf(p, /\bfeed\b/i), every = tip && feedEvery(tip);
    if (every) {
      const flowering = g.stage === 'Flowering' || g.stage === 'Ready to pick';
      const since = daysSince(lastDone(e, 'feed')), done = doneToday(e, 'feed');
      add({ kind: 'feed', icon: 'feed', title: `Feed the ${name}`, why: [tip, flowering ? `It's ${g.stage.toLowerCase()} (day ${g.age}).` : 'Starts once it flowers.'],
        due: done || (flowering && since >= every), done, act: 'tick', soonIn: flowering ? Math.max(0, every - since) : null });
    }
    // pinching and side shoots: weekly while it's growing (the app's rhythm; the guide says "often")
    const pinch = tipOf(p, /pinch out shoot tips|remove side-shoots/i);
    if (pinch) {
      const side = /side-shoots/i.test(pinch), growing = g.t != null && g.t >= .2 && g.t < .95;
      const since = daysSince(lastDone(e, 'pinch')), done = doneToday(e, 'pinch');
      add({ kind: 'pinch', icon: 'pinch', title: side ? `Pinch out ${name} side shoots` : `Pinch the ${name} tips`, why: [pinch, 'Zero Mile reminds you once a week while it grows.'],
        due: done || (growing && since >= 7), done, act: 'tick', soonIn: growing ? Math.max(0, 7 - since) : null });
    }
    // one-off jobs at the right stage, straight from a tip
    const once = [
      { kind: 'tip-pinch', re: /pinch the tip at/i, icon: 'pinch', title: `Pinch the ${name} tip`, from: .2 },
      { kind: 'earth-up', re: /earth up/i, icon: 'shoot', title: `Earth up the ${name}`, from: .15 },
      { kind: 'stake', re: /\bstake\b/i, icon: 'stake', title: `Stake the ${name}`, from: .25 },
      { kind: 'thin', re: /^thin seedlings/i, icon: 'shoot', title: `Thin the ${name}`, from: .08 },
    ];
    for (const o of once) {
      const tip = tipOf(p, o.re); if (!tip) continue;
      const ever = doneOn(e, o.kind).length > 0, done = doneToday(e, o.kind);
      if (ever && !done) continue;
      add({ kind: o.kind, icon: o.icon, title: o.title, why: [tip, 'A one-off job at this stage.'], due: done || (g.t != null && g.t >= o.from && g.t < .95), done, act: 'tick' });
    }
    // harvest: days grown against the cited days to harvest
    const left = g.dth[0] - g.age, src = guide(p, /\d+\s*[–-]\s*\d+|days|weeks/i);
    const basis = p.grow.days_basis ? ` (${p.grow.days_basis})` : '';
    const why = [`Ready in about ${g.dth[0]}–${g.dth[1]} days${basis}.`, `Day ${g.age} since you planted it.`];
    const pickTip = tipOf(p, /\bpick\b|harvest|lift/i); if (pickTip) why.push(pickTip);
    if (left <= 0) {
      const done = doneToday(e, 'pick'), since = daysSince(lastDone(e, 'pick'));
      add({ kind: 'pick', icon: 'basket', title: `Pick the ${name}`, why, src, due: done || since >= 3, done, act: 'tick' });
    } else if (left <= 7) {
      add({ kind: 'soon', icon: 'basket', title: `${p.name}: harvest soon`, why, src, due: true, done: false, act: 'info', note: `${left} day${left === 1 ? '' : 's'}` });
    } else add({ kind: 'soon', icon: 'basket', title: `Harvest from day ${g.dth[0]}`, why, src, due: false, done: false, act: 'info', soonIn: left });
  }
  if (tree) {
    const yrs = g.age / 365;
    // a seasonal photo, about every three months
    const ph = treePhotoDue(e);
    add({ kind: 'photo', icon: 'camera', title: `Seasonal photo of your ${name}`, why: ['Trees grow slowly, so Zero Mile asks for a photo each season (about every 3 months).', ph.last ? `Last photo ${daysSince(ph.last)} days ago.` : 'No photo yet.'],
      src: null, due: ph.due, done: false, act: 'snap', soonIn: ph.due ? 0 : ph.days });
    // water a young tree in hot, dry weather, per its care note
    const wtip = tipOf(p, /water/i);
    if (wtip && yrs < 3 && wx?.hotDry) {
      const done = doneToday(e, 'water');
      add({ kind: 'water', icon: 'drop', title: `Water your young ${name}`, why: [wtip, `Hot and dry today: high ${Math.round(wx.d0.max)}°.`], due: true, done, act: 'tick' });
    }
    // one-off care: the mulch circle in year 1, stake in month 1, take the stake away after 2–3 years
    const once = [
      { kind: 'mulch', re: /circle/i, icon: 'ring', title: `Clear a circle round the ${name}`, ok: yrs < 1 },
      { kind: 'stake', re: /put in a stake|tied to a strong stake/i, icon: 'stake', title: `Stake the ${name}`, ok: g.age <= 30 },
      { kind: 'unstake', re: /take it away after two to three years/i, icon: 'stake', title: `Remove the ${name}'s stake, if any`, ok: yrs >= 2 },
    ];
    for (const o of once) {
      const tip = tipOf(p, o.re); if (!tip) continue;
      const ever = doneOn(e, o.kind).length > 0, done = doneToday(e, o.kind);
      if (ever && !done) continue;
      add({ kind: o.kind, icon: o.icon, title: o.title, why: [tip, 'A one-off job.'], due: done || o.ok, done, act: 'tick' });
    }
  }
  // the weather: frost tonight for plants the data calls frost-tender, and stakes on windy days
  if (wx?.frostTonight) {
    const tip = tipOf(p, /frost/i);
    if (tip) {
      const done = doneToday(e, 'frost'), pot = p.grow?.container_ok || p.tree?.pot_ok;
      add({ kind: 'frost', icon: 'frost', title: `Frost tonight: ${pot ? 'bring' : 'cover'} the ${name}${pot ? ' in' : ''}`, why: [tip, `Forecast low ${Math.round(wx.low)}°.`], src: guide(p, /frost/i), wx: true, due: true, done, act: 'tick' });
    }
  }
  if (wx?.windy) {
    const tip = tipOf(p, /stake|support|wind|rocked/i);
    if (tip && !/take it away/i.test(tip)) {
      const done = doneToday(e, 'wind');
      add({ kind: 'wind', icon: 'wind', title: `Windy: check the ${name}'s support`, why: [tip, `Gusts up to ${Math.round(wx.d0.gust)} km/h today.`], wx: true, due: true, done, act: 'tick' });
    }
  }
  return out;
}

// garden-wide weather lines (no tick): rain, heat, frost or wind in plain words
function wxLines(wx, garden) {
  if (!wx) return [];
  const L = [], outdoor = garden.length > 0;
  const fc = (d) => `Forecast: high ${Math.round(d.max)}°, low ${Math.round(d.min)}°, ${Math.round(d.rain)} mm rain, gusts ${Math.round(d.gust ?? 0)} km/h.`;
  const rule = (s) => `Zero Mile's rule: ${s}.`;
  if (wx.rainToday && outdoor) L.push({ key: 'wx:rain', icon: 'rain', title: 'Rain today: skip watering', why: [fc(wx.d0), 'Plants outside get watered by the rain. Pots under cover still need you.', rule(`${WX_RULES.rain} mm or more`)] });
  if (wx.hotDry && outdoor) L.push({ key: 'wx:hot', icon: 'heat', title: 'Hot and dry: water in the evening', why: [fc(wx.d0), 'Water in the cool of the evening so less dries off in the sun.', rule(`${WX_RULES.hot}° or more with no rain`)] });
  if (wx.frostTonight && !garden.some(({ p }) => tipOf(p, /frost/i))) L.push({ key: 'wx:frost', icon: 'frost', title: 'Frost tonight', why: [`Forecast low ${Math.round(wx.low)}°.`, 'None of your plants is listed as frost-tender.', rule(`a low of ${WX_RULES.frost}° or less`)] });
  if (wx.windy && !garden.some(({ p }) => { const t = tipOf(p, /stake|support|wind|rocked/i); return t && !/take it away/i.test(t); })) L.push({ key: 'wx:wind', icon: 'wind', title: 'Windy: stake tall plants', why: [fc(wx.d0), rule(`gusts of ${WX_RULES.gust} km/h or more`)] });
  return L.map((l) => ({ ...l, src: WX_SOURCE, act: 'info', due: true, done: false, wx: true }));
}

// ---------- drawing ----------
const srcHtml = (s) => (s?.url ? `<p class="care-src">Source: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.publisher || s.title)}</a></p>` : '');
function rowHtml(j, { pic = true } = {}) {
  const id = 'cw-' + j.key.replace(/[^a-z0-9]/gi, '-');
  const tick = j.act === 'water' || j.act === 'tick';
  const lead = tick
    ? `<button class="care-tick" type="button" data-care="${esc(j.key)}" aria-pressed="${j.done}" aria-label="${esc(j.title)}${j.done ? ', done' : ''}">${glyph('check', 18)}</button>`
    : j.act === 'snap' ? `<a class="care-tick care-go" href="#/snap/${esc(j.key.split(':')[0])}" data-snap="${esc(j.key.split(':')[0])}" aria-label="${esc(j.title)}: take the photo">${glyph('camera', 18)}</a>`
      : `<span class="care-tick care-info" aria-hidden="true">${glyph(j.icon, 18)}</span>`;
  const plantId = j.key.split(':')[0];
  const img = j.key.startsWith('wx:') ? '' : !pic && !tick && j.act !== 'snap' ? '<span class="care-gl" aria-hidden="true"></span>' : pic ? produceIcon(plantId, { size: 36, cls: 'care-sym', group: plantById(plantId)?.group }) : `<span class="care-gl">${glyph(j.icon, 22)}</span>`;
  return `<li class="care-row${j.done ? ' done' : ''}${j.wx ? ' wx' : ''}" data-key="${esc(j.key)}">
    ${lead}
    <button class="care-main" type="button" aria-expanded="false" aria-controls="${id}">${img}<span class="care-t">${esc(j.title)}${j.note ? ` <span class="care-note lcd-num">${esc(j.note)}</span>` : ''}</span>${glyph('chev', 18)}</button>
    <div class="care-why" id="${id}" hidden>${j.why.filter(Boolean).map((w) => `<p>${esc(w)}</p>`).join('')}${srcHtml(j.src)}</div>
  </li>`;
}
function bind(root, jobs, rerender) {
  root.addEventListener('click', async (ev) => {
    const loc = ev.target.closest('[data-wx]');
    if (loc) {
      if (loc.dataset.wx === 'locate') { loc.disabled = true; loc.textContent = 'Finding…'; const ok = await useMyLocation(); if (!ok) { loc.disabled = false; loc.textContent = 'Location off. Try again'; return; } }
      else forgetLocation();
      return rerender(true);
    }
    const snap = ev.target.closest('[data-snap]');
    if (snap) { state.active = snap.dataset.snap; save(); return; }
    const main = ev.target.closest('.care-main');
    if (main) { const w = root.querySelector('#' + main.getAttribute('aria-controls')); const on = main.getAttribute('aria-expanded') !== 'true'; main.setAttribute('aria-expanded', String(on)); if (w) w.hidden = !on; return; }
    const t = ev.target.closest('.care-tick[data-care]'); if (!t) return;
    const j = jobs().find((x) => x.key === t.dataset.care); if (!j) return;
    const e = state.garden.find((g) => g.id === j.key.split(':')[0]); if (!e) return;
    let on;
    if (j.act === 'water') {
      on = toggleWatered(e);
      if (on) { try { const { award } = await import('./rewards.js?v=9'); award('water', { id: e.id }); } catch { /* rewards optional */ } }
      dispatchEvent(new Event('zm:garden'));
    } else { on = !doneToday(e, j.kind); markDone(e, j.kind, on); }
    try { const { play, buzz } = await import('./sound.js?v=10'); if (on) { play(j.act === 'water' ? 'water' : 'done', { soft: true }); buzz(10); } else play('toggle', { soft: true }); } catch { /* sound optional */ }
    const li = t.closest('.care-row'); li.classList.toggle('done', on); t.setAttribute('aria-pressed', String(on));
    t.setAttribute('aria-label', `${j.title}${on ? ', done' : ''}`);
    dispatchEvent(new CustomEvent('zm:care', { detail: { key: j.key, on } }));
    root.querySelector('[data-left]')?.replaceChildren(String(root.querySelectorAll('.care-row:not(.done) .care-tick[data-care]').length));
  });
}

// ---------- Today: Care today ----------
// one forecast shared by the screens for a few minutes (forecast() keeps its own 3-hour cache); a failed one is
// not kept, so the weather comes back on the next screen once the connection does, without a reload
let wxPromise = null, wxAt = 0;
const getWx = (force) => {
  if (force || !wxPromise || Date.now() - wxAt > 10 * 60e3) {
    wxAt = Date.now();
    const p = wxPromise = forecast({ force });
    p.then((r) => { if (!r?.days?.length && wxPromise === p) wxPromise = null; }, () => { if (wxPromise === p) wxPromise = null; });
  }
  return wxPromise;
};
export async function mountCare(el) {
  if (!el) return;
  try {
    await data();
    const draw = async (force = false) => {
      const garden = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => x.p);
      let fc = null; try { fc = await getWx(force); } catch { fc = null; }
      const wx = conditions(fc);
      const all = () => garden.flatMap(({ e, p }) => jobsFor(e, p, wx));
      const due = all().filter((j) => j.due);
      due.sort((a, b) => (a.done - b.done) || ((b.wx ? 1 : 0) - (a.wx ? 1 : 0)));
      const lines = wxLines(wx, garden);
      const left = due.filter((j) => !j.done && (j.act === 'water' || j.act === 'tick')).length;
      const SHOW = 5, more = Math.max(0, due.length - SHOW);
      if (!garden.length && !fc) { el.innerHTML = ''; return; }
      el.innerHTML = `<section class="ft care-card" aria-labelledby="care-h">
        <header class="ft-head"><h2 id="care-h">Care today</h2>${garden.length ? `<span class="ft-count lcd-num" aria-label="${left} to do" data-left>${left}</span>` : ''}</header>
        ${stripHtml(fc)}
        ${lines.length ? `<ul class="care-list care-wx">${lines.map((l) => rowHtml(l)).join('')}</ul>` : ''}
        ${garden.length ? (due.length ? `<ul class="care-list">${due.map((j, i) => rowHtml(j).replace('<li class="care-row', `<li ${i >= SHOW ? 'hidden ' : ''}class="care-row`)).join('')}</ul>
          ${more ? `<button class="ft-more" type="button" data-more>${more} more</button>` : ''}` : `<p class="care-none">${glyph('check', 18)}Nothing else today.</p>`)
          : '<p class="care-none"><a href="#/find">Add a plant</a> for daily care.</p>'}
        <details class="ft-deep"><summary>Weather and sources</summary>${placeHtml(fc)}<a class="ft-link" href="#/sow">${glyph('seed', 16)}What to sow this month</a></details>
      </section>`;
      el.querySelector('[data-more]')?.addEventListener('click', (ev) => {
        const rows = [...el.querySelectorAll('.care-row[hidden]')]; rows.forEach((r) => { r.hidden = false; });
        ev.currentTarget.remove(); rows[0]?.querySelector('button, a')?.focus(); // keep the keyboard focus on the first job it showed
      });
      el.__jobs = () => [...lines, ...all()];
      if (!el.__careBound) { el.__careBound = true; bind(el, () => el.__jobs?.() || [], (f) => draw(f)); }
    };
    await draw();
  } catch { el.innerHTML = ''; }
}

// ---------- one plant: jobs, coming up, time-lapse and journal ----------
export async function mountPlantCare(el, id) {
  if (!el) return;
  try {
    await data();
    const p = plantById(id), e = state.garden.find((g) => g.id === id);
    if (!p || !e) { el.innerHTML = ''; return; }
    let tl = null;
    const draw = async (force = false) => {
      let fc = null; try { fc = await getWx(force); } catch { fc = null; }
      const wx = conditions(fc), jobs = jobsFor(e, p, wx);
      const now = jobs.filter((j) => j.due), later = jobs.filter((j) => !j.due && j.soonIn != null && j.soonIn > 0).sort((a, b) => a.soonIn - b.soonIn);
      const pics = photoCount(id);
      el.innerHTML = `<section class="ft care-card plant-care" aria-labelledby="pc-h">
        <header class="ft-head"><h2 id="pc-h">Care</h2></header>
        ${now.length ? `<ul class="care-list">${now.map((j) => rowHtml(j, { pic: false })).join('')}</ul>` : `<p class="care-none">${glyph('check', 18)}Nothing to do today.</p>`}
        ${later.length ? `<details class="ft-deep"><summary>Coming up</summary><ul class="care-soon">${later.map((j) => `<li>${glyph(j.icon, 18)}<span>${esc(j.title)}</span><b class="lcd-num" aria-label="in ${j.soonIn} days">${j.soonIn}d</b></li>`).join('')}</ul></details>` : ''}
        <details class="ft-deep tl-fold" ${pics ? '' : 'hidden'}><summary>Time-lapse <span class="ft-sub">${pics} photo${pics === 1 ? '' : 's'}</span></summary><div class="tl-host"></div></details>
        <div class="journal">
          <h3>Journal</h3>
          <form class="j-add"><label class="sr" for="j-in-${esc(id)}">Add a note</label><input id="j-in-${esc(id)}" name="t" maxlength="200" autocomplete="off" placeholder="First flower, new leaf…"><button class="ft-btn" type="submit">${glyph('note', 16)}Add</button></form>
          <ol class="j-list" aria-label="Notes"></ol>
        </div>
      </section>`;
      const list = el.querySelector('.j-list');
      const drawNotes = () => {
        const notes = (e.notes || []).slice().reverse();
        list.hidden = !notes.length;
        list.innerHTML = notes.map((n) => `<li><time datetime="${esc(n.date)}">${esc(new Date(n.date + 'T12:00').toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }))}</time><span>${esc(n.text)}</span><button type="button" class="j-del" data-at="${esc(n.at || '')}" aria-label="Delete note: ${esc(n.text.slice(0, 40))}">${glyph('close', 14)}</button></li>`).join('');
      };
      drawNotes();
      const fold = el.querySelector('.tl-fold');
      fold?.addEventListener('toggle', async () => { if (fold.open && !tl) tl = await mountTimelapse(fold.querySelector('.tl-host'), id); });
      el.querySelector('.j-add').addEventListener('submit', (ev) => {
        ev.preventDefault(); const inp = ev.currentTarget.t, v = inp.value.trim().slice(0, 200); if (!v) return;
        (e.notes ||= []).push({ date: today(), at: Date.now().toString(36), text: v }); e.notes = e.notes.slice(-200); save();
        inp.value = ''; drawNotes();
      });
      list.addEventListener('click', (ev) => {
        const b = ev.target.closest('.j-del'); if (!b) return;
        e.notes = (e.notes || []).filter((n) => (n.at || '') !== b.dataset.at); save(); drawNotes(); el.querySelector('.j-add input')?.focus();
      });
      el.__jobs = () => jobsFor(e, p, wx);
    };
    if (!el.__careBound) { el.__careBound = true; bind(el, () => el.__jobs?.() || [], (f) => { tl?.unmount?.(); tl = null; draw(f); }); }
    await draw();
  } catch { el.innerHTML = ''; }
}

// ---------- fallback mounting (called by the router after each screen): uses the screen's own slots
// (#care-slot on Today, #plant-care-slot on a plant page); if a screen has none yet, adds one in a calm spot ----------
export function autoMount(main, key, arg) {
  try {
    if (!key || key === 'garden') {
      let s = main.querySelector('#care-slot');
      if (!s) {
        const after = main.querySelector('.d-plants') || main.querySelector('#quests'); if (!after) return;
        s = document.createElement('div'); s.id = 'care-slot'; s.className = 'care-auto'; after.after(s);
      }
      if (!s.__careBound && !s.children.length) mountCare(s);
    } else if (key === 'plant' && arg && state.garden.some((g) => g.id === arg)) {
      let s = main.querySelector('#plant-care-slot');
      if (!s) { s = document.createElement('div'); s.id = 'plant-care-slot'; s.className = 'care-auto'; (main.querySelector('.page') || main).append(s); }
      if (!s.__careBound && !s.children.length) mountPlantCare(s, arg);
    }
  } catch { /* fail safe */ }
}
