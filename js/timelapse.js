// Zero Mile: a plant's daily photos as a time-lapse. A scrubber and a play button cross-fade through the days
// (date and day number on a small LCD chip), an onion-skin toggle shows the day before underneath, and
// "Save video" records the same cross-fade to a .webm with MediaRecorder where the browser supports it
// (the button is hidden where it doesn't). Photos come from IndexedDB (getPhoto, keys in the entry's log).
// Used on the plant page (inside mountPlantCare), in a sheet (openTimelapse), and at #/timelapse/<id>.
import { state, esc, getPhoto, dayDiff, plantById, data, thumb, MONTH_NAMES } from './core.js?v=9';
import { glyph } from './weather.js?v=10';

const prettyDate = (iso) => { const d = new Date(iso + 'T12:00'); return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function photoCount(id) {
  const e = state.garden.find((g) => g.id === id);
  return e ? e.log.filter((l) => l.key).length : 0;
}

// the best video type this browser can record, or null
function videoType() {
  try {
    if (!('MediaRecorder' in window) || !HTMLCanvasElement.prototype.captureStream) return null;
    return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t)) || null;
  } catch { return null; }
}

// returns { unmount } so a sheet or page can free the object URLs
export async function mountTimelapse(el, id) {
  const fail = () => { el.innerHTML = ''; return { unmount() {} }; };
  try {
    await data();
    const e = state.garden.find((g) => g.id === id), p = plantById(id);
    if (!p) return fail();
    if (!e) {
      el.innerHTML = `<div class="tl tl-empty"><img src="${thumb(id)}" alt="" width="72" height="72"><p>Snap your ${esc(p.name.toLowerCase())} each day and the photos build a time-lapse.</p><a class="ft-btn" href="#/plant/${esc(id)}">Open ${esc(p.name)}</a></div>`;
      return { unmount() {} };
    }
    const log = [...e.log].filter((l) => l.key).sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!log.length) {
      el.innerHTML = `<div class="tl tl-empty"><img src="${thumb(id)}" alt="" width="72" height="72"><p>Snap ${esc(p.name.toLowerCase())} each day to build a time-lapse.</p><a class="ft-btn" href="#/snap">${glyph('camera', 18)}Take a photo</a></div>`;
      return { unmount() {} };
    }
    const blobs = await Promise.all(log.map((l) => getPhoto(l.key).catch(() => null)));
    const frames = log.map((l, i) => ({ ...l, url: blobs[i] ? URL.createObjectURL(blobs[i]) : null })).filter((f) => f.url);
    if (!frames.length) return fail();
    const n = frames.length, vt = videoType();
    const day = (f) => Math.max(1, dayDiff(e.planted, f.date) + 1);
    const uid = 'tl' + Math.random().toString(36).slice(2, 7);
    el.innerHTML = `<div class="tl" id="${uid}">
      <div class="tl-stage">
        <img class="tl-ghost" alt="" hidden>
        <img class="tl-a" alt="">
        <img class="tl-b" alt="" aria-hidden="true">
        <span class="tl-chip lcd-num" aria-hidden="true"><b class="tl-day"></b></span>
      </div>
      <div class="tl-bar">
        <button class="tl-play" type="button" aria-label="Play">${glyph('play', 22)}</button>
        <input class="tl-scrub" type="range" min="0" max="${n - 1}" value="${n - 1}" step="1" aria-label="Day" ${n < 2 ? 'disabled' : ''}>
        <span class="tl-date" aria-live="polite"></span>
      </div>
      <div class="tl-tools">
        <button class="tl-tool tl-onion" type="button" aria-pressed="false" ${n < 2 ? 'disabled' : ''}>${glyph('layers', 18)}Onion skin</button>
        ${vt && n > 1 ? `<button class="tl-tool tl-save" type="button">${glyph('video', 18)}Save video</button>` : ''}
        <span class="tl-count">${n} photo${n === 1 ? '' : 's'}</span>
      </div>
    </div>`;
    const root = el.querySelector('#' + uid);
    const A = root.querySelector('.tl-a'), B = root.querySelector('.tl-b'), ghost = root.querySelector('.tl-ghost');
    const scrub = root.querySelector('.tl-scrub'), playB = root.querySelector('.tl-play'), dateEl = root.querySelector('.tl-date'), dayEl = root.querySelector('.tl-day');
    let cur = n - 1, onion = false, timer = 0, dead = false;
    const label = (i) => { const f = frames[i]; dayEl.textContent = `DAY ${day(f)}`; dateEl.textContent = `${prettyDate(f.date)} · day ${day(f)}`; A.alt = `${p.name}, ${prettyDate(f.date)}`; };
    const show = (i, fade = true) => {
      i = Math.max(0, Math.min(n - 1, i));
      const prev = cur; cur = i; scrub.value = i; label(i);
      if (onion && i > 0) { ghost.src = frames[i - 1].url; ghost.hidden = false; } else ghost.hidden = true;
      if (!fade || reduced() || prev === i) { A.src = frames[i].url; B.classList.remove('on'); return; }
      B.src = A.src; B.classList.add('on'); A.src = frames[i].url;
      requestAnimationFrame(() => requestAnimationFrame(() => B.classList.remove('on')));
    };
    const stop = () => { clearInterval(timer); timer = 0; playB.innerHTML = glyph('play', 22); playB.setAttribute('aria-label', 'Play'); };
    const play = () => {
      if (n < 2) return;
      if (timer) return stop();
      if (cur >= n - 1) show(0, false);
      playB.innerHTML = glyph('pause', 22); playB.setAttribute('aria-label', 'Pause');
      timer = setInterval(() => { if (dead) return stop(); if (cur >= n - 1) return stop(); show(cur + 1); }, reduced() ? 900 : 700);
    };
    show(cur, false);
    playB.addEventListener('click', play);
    scrub.addEventListener('input', () => { stop(); show(+scrub.value); });
    root.querySelector('.tl-onion').addEventListener('click', (ev) => {
      onion = !onion; ev.currentTarget.setAttribute('aria-pressed', String(onion)); root.classList.toggle('onion', onion); show(cur, false);
    });
    root.querySelector('.tl-save')?.addEventListener('click', async (ev) => {
      const btn = ev.currentTarget; stop();
      btn.disabled = true; const was = btn.innerHTML; btn.innerHTML = `${glyph('video', 18)}Making…`;
      try { await record(frames, day, p, vt); } catch { btn.hidden = true; }
      btn.disabled = false; btn.innerHTML = was;
    });
    return { unmount() { dead = true; stop(); frames.forEach((f) => URL.revokeObjectURL(f.url)); } };
  } catch { return fail(); }
}

// draw the cross-fade on a canvas and record it; ~0.8 s a photo, 30 fps, at most 1080 px wide
async function record(frames, day, p, type) {
  const imgs = await Promise.all(frames.map((f) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = f.url; })));
  const list = frames.map((f, i) => ({ f, img: imgs[i] })).filter((x) => x.img);
  if (!list.length) throw new Error('no frames');
  const W = 720, H = 900, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const cover = (img, a) => { const s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s; g.globalAlpha = a; g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); g.globalAlpha = 1; };
  const chip = (txt) => { g.font = '700 34px "Pixelify Sans", ui-monospace, monospace'; const w = g.measureText(txt).width + 36; g.fillStyle = '#0c110d'; g.beginPath(); g.roundRect?.(24, H - 84, w, 58, 12); if (!g.roundRect) g.rect(24, H - 84, w, 58); g.fill(); g.fillStyle = '#62f27e'; g.fillText(txt, 42, H - 43); };
  const name = () => { g.font = '700 30px "Bricolage Grotesque", system-ui, sans-serif'; g.fillStyle = 'rgba(255,253,247,.92)'; g.fillText(p.name, 24, 52); };
  const stream = c.captureStream(30), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4e6 });
  const parts = []; rec.ondataavailable = (ev) => ev.data.size && parts.push(ev.data);
  const done = new Promise((res) => { rec.onstop = res; });
  rec.start(250);
  const HOLD = 520, FADE = 300, tick = () => new Promise((r) => setTimeout(r, 1000 / 30));
  for (let i = 0; i < list.length; i++) {
    const t0 = performance.now();
    for (;;) {
      const t = performance.now() - t0;
      g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, W, H);
      if (i > 0 && t < FADE) { cover(list[i - 1].img, 1); cover(list[i].img, t / FADE); } else cover(list[i].img, 1);
      name(); chip(`DAY ${day(list[i].f)}`);
      if (t > FADE + HOLD) break;
      await tick();
    }
  }
  await new Promise((r) => setTimeout(r, 400));
  rec.stop(); await done;
  const blob = new Blob(parts, { type: type.split(';')[0] });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `zero-mile-${p.id}-timelapse.${type.includes('mp4') ? 'mp4' : 'webm'}`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// a sheet with the time-lapse (from the Today plant tiles: any [data-timelapse="<id>"] button opens it)
export async function openTimelapse(id) {
  try {
    await data();
    const p = plantById(id); if (!p) return;
    const { sheet } = await import('./fun.js?v=10');
    const s = sheet({ title: `${esc(p.name)} time-lapse`, body: '<div class="tl-host"></div>' });
    s.el.classList.add('tl-sheet');
    const m = await mountTimelapse(s.el.querySelector('.tl-host'), id);
    const bg = s.el.parentElement;
    new MutationObserver((_, o) => { if (!bg.isConnected) { m.unmount(); o.disconnect(); } }).observe(document.body, { childList: true });
  } catch { /* fail safe: no sheet */ }
}
if (!window.__zmTimelapse) {
  window.__zmTimelapse = true;
  document.addEventListener('click', (ev) => { const b = ev.target.closest?.('[data-timelapse]'); if (b) { ev.preventDefault(); openTimelapse(b.dataset.timelapse); } });
}

// the route #/timelapse/<id>
export default async function view(main, id) {
  await data();
  const p = plantById(id);
  main.innerHTML = `<section class="ft-page ombre" data-tone="mint"><a class="ft-back" href="#/plant/${esc(id)}">${glyph('arrowL', 18)}${esc(p?.name || 'Plant')}</a><h1 class="ft-h1">Time-lapse</h1><div class="tl-host"></div></section>`;
  if (!p) {
    // no plant in the link: pick one of the plants you are growing, or find one to grow
    const back = main.querySelector('.ft-back'); back.href = '#/'; back.lastChild.textContent = 'Today';
    const mine = state.garden.map((e) => ({ e, p: plantById(e.id) })).filter((x) => x.p);
    main.querySelector('.tl-host').innerHTML = mine.length
      ? `<ul class="tl-pick">${mine.map(({ p: q }) => { const n = photoCount(q.id); return `<li><a href="#/timelapse/${esc(q.id)}"><img src="${thumb(q.id)}" alt="" width="48" height="48"><span>${esc(q.name)}</span><small>${n ? `${n} photo${n === 1 ? '' : 's'}` : 'No photos yet'}</small></a></li>`; }).join('')}</ul>`
      : `<div class="tl tl-empty"><p>Grow a plant and snap it each day to build a time-lapse.</p><a class="ft-btn" href="#/find">Find a plant</a></div>`;
    return {};
  }
  return mountTimelapse(main.querySelector('.tl-host'), id);
}
