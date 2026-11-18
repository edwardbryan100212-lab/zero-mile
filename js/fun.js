// Zero Mile: motion helpers for the app, v2 "Garden LCD" (see DESIGN.md). Two kinds of motion:
// - paper UI: calm easing (EASE), transforms and opacity only, short;
// - LCD UI: pixel steps (steps(), two-frame wiggles, blinking), never smooth.
// "Reduce motion" makes every animation here an instant change.
export const EASE = 'cubic-bezier(.22,1,.36,1)';
export const SPRING = EASE; // v1 name: there is no spring any more
import { play, buzz } from './sound.js?v=9';
export { play, buzz };
const rm = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => rm.matches;

// ---------- press feedback: CSS does the scale on :active; iOS only fires :active when a touch listener exists ----------
// A .b3 button also gives a soft tick as it goes down (sound.js skips repeats within 70 ms).
let pressOn = false;
export function initPress() {
  if (pressOn) return; pressOn = true;
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (e.button === 0 && e.target.closest?.('.b3:not(:disabled)')) play('tap'); }, { passive: true });
}

// ---------- route transition: fade in and rise 6px ----------
export function enter(el) {
  if (!el || reduced()) return;
  el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: EASE });
}
// v1: a hop on the current tab. Kept as a calm nudge.
export function hop(el) {
  if (!el || reduced()) return;
  el.animate([{ transform: 'scale(.92)' }, { transform: 'none' }], { duration: 180, easing: EASE });
}

// ---------- numbers ----------
const nf = (n, d) => Number(n).toLocaleString('en-IE', { maximumFractionDigits: d, minimumFractionDigits: d });
// paper: a calm count-up. With { px: true } (or inside an LCD panel) the number ticks in whole steps like a
// pixel counter: at most 14 ticks, evenly spaced, no easing.
export function countUp(el, to, { from = 0, dec = 0, dur = 900, suffix = '', prefix = '', sound, px } = {}) {
  if (!el) return;
  if (sound && to !== from) play(sound);
  const put = (v) => { el.textContent = prefix + nf(v, dec) + suffix; };
  if (reduced() || to === from) { put(to); return; }
  if (px ?? !!el.closest?.('.lcd, .cele')) {
    const n = Math.min(14, Math.max(1, Math.abs(to - from) * (dec ? 10 ** dec : 1))), gap = Math.max(40, dur / n);
    let k = 0; put(from);
    const id = setInterval(() => { k++; put(k >= n ? to : from + (to - from) * k / n); if (k >= n || !el.isConnected) clearInterval(id); }, gap);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
    put(from + (to - from) * e);
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  put(from);
  requestAnimationFrame(step);
}
// every [data-count] inside root counts up from 0 when it first scrolls into view
export function countAll(root) {
  const els = [...root.querySelectorAll('[data-count]')];
  const go = (el) => countUp(el, +el.dataset.count, { dec: +(el.dataset.dec || 0), suffix: el.dataset.suffix || '' });
  if (!('IntersectionObserver' in window) || reduced()) { els.forEach(go); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { go(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -5% 0px' });
  els.forEach((el) => { el.textContent = nf(0, +(el.dataset.dec || 0)) + (el.dataset.suffix || ''); io.observe(el); });
}
// bars and meters ([data-fill="0..1"]) grow from empty when they come into view
export function fillAll(root) {
  const els = [...root.querySelectorAll('[data-fill]')];
  // a .bar3 fill grows by its width (on LCD it fills in pixel steps, see css/tokens.css); the rest scale on x
  const set = (el) => {
    if (el.parentElement?.classList.contains('bar3')) { el.style.width = `${+el.dataset.fill * 100}%`; return; }
    el.style.transform = el.dataset.axis === 'x-move' ? `translateX(${+el.dataset.fill * 100}%)` : `scaleX(${+el.dataset.fill})`;
  };
  if (reduced() || !('IntersectionObserver' in window)) { els.forEach(set); return; }
  // watch the bar's track, not the bar: a bar at scaleX(0) has no area, so it never "intersects"
  const of = new Map();
  els.forEach((el) => of.set(el.parentElement, [...(of.get(el.parentElement) || []), el]));
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const list = of.get(e.target); requestAnimationFrame(() => requestAnimationFrame(() => list.forEach(set))); io.unobserve(e.target); } }));
  of.forEach((_, track) => io.observe(track));
}

// ---------- haptics ----------
// off with the Vibration switch in About, and with "reduce motion" (see sound.js)
export function haptic(pattern = 12) { buzz(pattern); }

// ---------- pixel sparkles (v2: they replace the confetti rain) ----------
// A handful of green pixel stars blink in steps around a point, then go. Same signature as v1's confetti().
const SPARK = '<svg viewBox="0 0 7 7" width="14" height="14" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"><path d="M3 0h1v2H3zM3 5h1v2H3zM0 3h2v1H0zM5 3h2v1H5zM3 3h1v1H3z"/></svg>';
export function sparkles(x = innerWidth / 2, y = innerHeight / 3, { count = 8, spread = 1, sound, amber = false } = {}) {
  if (sound) play(sound);
  if (reduced()) return;
  const layer = document.createElement('div'); layer.className = `px-sparks${amber ? ' amber' : ''}`; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const n = Math.min(12, Math.max(4, Math.round(count / 4)));
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.innerHTML = SPARK;
    const a = (i / n) * Math.PI * 2 + Math.random() * .5, r = (50 + Math.random() * 70) * spread;
    d.style.cssText = `left:${Math.round(x + Math.cos(a) * r)}px;top:${Math.round(y + Math.sin(a) * r * .7)}px;animation-delay:${i * 60}ms`;
    layer.appendChild(d);
  }
  setTimeout(() => layer.remove(), 1200);
}
export const confetti = sparkles;

// ---------- a sheet for the "?" explanations (bottom sheet on a phone, a centred card on a Mac) ----------
export function sheet({ title, body, label = 'Close' }) {
  const opener = document.activeElement;
  const bg = document.createElement('div'); bg.className = 'sheet-bg fun-sheet';
  const id = 'sh-' + Math.random().toString(36).slice(2, 8);
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${id}"><div class="sheet-grab" aria-hidden="true"></div><div class="sheet-head"><h2 id="${id}">${title}</h2><button class="sheet-x" type="button" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></button></div><div class="sheet-body">${body}</div></div>`;
  document.body.appendChild(bg);
  const box = bg.querySelector('.sheet'), phone = matchMedia('(max-width: 699px)').matches;
  if (!reduced()) {
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE });
    box.animate(phone ? [{ transform: 'translateY(100%)' }, { transform: 'none' }] : [{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: phone ? 320 : 220, easing: EASE });
  }
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    removeEventListener('keydown', onKey);
    const done = () => { bg.remove(); opener?.focus?.({ preventScroll: true }); };
    if (reduced()) return done();
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: EASE, fill: 'forwards' });
    box.animate(phone ? [{ transform: 'none' }, { transform: 'translateY(100%)' }] : [{ opacity: 1 }, { opacity: 0, transform: 'scale(.98)' }], { duration: 180, easing: EASE, fill: 'forwards' }).onfinish = done;
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // keep focus inside the sheet
      const f = [...box.querySelectorAll('a[href], button, input, select, summary, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  addEventListener('keydown', onKey);
  bg.querySelector('.sheet-x').addEventListener('click', close);
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  box.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) close(); });
  bg.querySelector('.sheet-x').focus();
  return { el: box, close };
}
// a round "?" button; bindHelp opens the matching sheet
export const helpBtn = (key, label = 'How we count') => `<button class="help" type="button" data-help="${key}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.4"/><path d="M12 17.2v.1"/></svg></button>`;
export function bindHelp(root, map) {
  root.querySelectorAll('[data-help]').forEach((b) => b.addEventListener('click', () => { const h = map[b.dataset.help]; if (h) sheet(typeof h === 'function' ? h() : h); }));
}

// ================= small feedback =================
// a pop: a calm settle from .96 with the paper easing (LCD content uses .px-in instead). Reduced motion: at once.
export function pop(el, { delay = 0, from = .96, dur = 240, sound } = {}) {
  if (sound) play(sound);
  if (!el || reduced()) return null;
  return el.animate([{ opacity: 0, transform: `scale(${Math.max(.94, from)})` }, { opacity: 1, transform: 'none' }], { duration: dur, delay, easing: EASE, fill: 'backwards' });
}
// "+2 XP" rises from a button on a tiny LCD chip and goes
// (a sun "+XP" gives a soft sparkle that yields to any louder sound; a tomato one is the soft "no")
const GAIN_SOUND = { sun: 'xp', tomato: 'error' };
export function floatGain(anchor, text, tone = 'sun') {
  if (!anchor) return;
  if (GAIN_SOUND[tone]) play(GAIN_SOUND[tone], { soft: tone === 'sun' });
  const r = anchor.getBoundingClientRect(), g = document.createElement('span');
  g.className = `gain gain-${tone}`; g.setAttribute('aria-hidden', 'true'); g.textContent = text;
  g.style.left = `${r.left + r.width / 2}px`; g.style.top = `${r.top}px`;
  document.body.appendChild(g);
  if (reduced()) { setTimeout(() => g.remove(), 900); return; }
  g.animate([{ opacity: 0, transform: 'translate(-50%, 0)' }, { opacity: 1, transform: 'translate(-50%, -12px)', offset: .25 }, { opacity: 1, transform: 'translate(-50%, -24px)', offset: .75 }, { opacity: 0, transform: 'translate(-50%, -32px)' }], { duration: 1000, easing: 'steps(6, end)' }).onfinish = () => g.remove();
}
// v1: seed gems burst out of a chest. There are no chests now; a few sparkles instead.
export function burstSeeds(from) {
  if (!from) return;
  const r = from.getBoundingClientRect();
  sparkles(r.left + r.width / 2, r.top + r.height / 2, { count: 24 });
}

// ---------- Pip wearing what was bought in the shop ----------
import { mascot } from './art.js?v=9';
import { worn } from './rewards.js?v=9';
const HATS = {
  'hat-cap': '<g transform="translate(40 30) rotate(-14)"><path d="M-16 6a16 14 0 0 1 32 0z" fill="#23774a"/><path d="M-16 6h40a4 4 0 0 1 0 6h-40z" fill="#1b5e3a"/><circle cy="-8" r="3" fill="#1b5e3a"/></g>',
  'hat-straw': '<g transform="translate(42 32) rotate(-12)"><ellipse rx="26" ry="7" cy="6" fill="#c9a24c"/><path d="M-13 6c0-16 26-16 26 0z" fill="#e2bd66"/><path d="M-13 2h26v4h-26z" fill="#c8673d"/></g>',
  'hat-flower': `<g>${[[26, 40, '#c8673d'], [40, 36, '#f3e3b5'], [54, 35, '#c8673d'], [68, 35, '#f3e3b5'], [82, 36, '#c8673d'], [95, 40, '#f3e3b5']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.2" ry="4.6" cy="-4" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="2.4" fill="#23774a"/></g>`).join('')}</g>`,
  'hat-crown': '<g transform="translate(44 30) rotate(-10)"><path d="M-16 8l-2-18 9 8 9-12 9 12 9-8-2 18z" fill="#e3b341"/><circle cy="2" r="2.6" fill="#c8673d"/></g>',
};
export const hatArt = (id, size = 48) => (HATS[id] ? `<svg class="art hat" width="${size}" height="${Math.round(size * 40 / 92)}" viewBox="14 14 92 40" aria-hidden="true">${HATS[id]}</svg>` : '');
// Pip with the pot colour and hat worn (or a preview of { pot, hat })
export function pip(pose = 'wave', { size = 120, mood, cls = '', look } = {}) {
  const w = look || worn();
  const potC = w.pot?.color, hat = w.hat;
  const svg = mascot(pose, { size, mood, pot: potC, potShade: w.pot?.shade });
  return `<span class="pipw ${cls}" data-pose="${pose}"${hat ? ` data-hat="${hat}"` : ''}>${svg}${hat && HATS[hat] ? `<svg class="pip-hat" viewBox="0 0 120 120" aria-hidden="true">${HATS[hat]}</svg>` : ''}</span>`;
}

// ---------- Pip's live LCD face on a canvas (js/face.js) ----------
// faceCanvas(mood) is markup; runFaces(root) draws every canvas[data-face] in root with a two-frame idle and blink
// at about 8 fps (stepped, like a real LCD) and returns a stop function.
export const faceCanvas = (mood = 'happy', cls = '') => `<canvas class="pxface ${cls}" data-face="${mood}" aria-hidden="true"></canvas>`;
export function runFaces(root) {
  let raf = 0, stopped = false, last = 0;
  const items = [];
  import('./face.js?v=9').then(({ drawFace }) => {
    if (stopped) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    for (const c of root.querySelectorAll('canvas[data-face]')) {
      const w = c.clientWidth || 96, h = c.clientHeight || Math.round(w * .72);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      items.push({ c, ctx: c.getContext('2d'), mood: c.dataset.face });
    }
    const draw = (t) => { for (const it of items) { if (!it.c.isConnected) continue; it.ctx.clearRect(0, 0, it.c.width, it.c.height); drawFace(it.ctx, it.c.width, it.c.height, it.mood, t, { bg: false, bare: true }); } };
    if (reduced()) { draw(0); return; }
    const tick = (now) => { if (stopped) return; if (now - last > 120) { last = now; draw(now / 1000); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }).catch(() => {});
  return () => { stopped = true; cancelAnimationFrame(raf); };
}

// ---------- full-screen celebration on Pip's LCD ----------
// screens: [{ face, art, photo, title, big, count, sub, extra, cta, sound, tone, amber, onShow(el, next), onContinue(el, next) }]
// - face: a mood for Pip's pixel face (the default is 'thriving'); art: a pixel icon instead of the face
// - photo: an image URL, shown once in a paper frame; big: the large pixel line; count: { from, to, prefix, suffix }
//   ticks the big number up in steps; sound: a name from sound.js, or false; without it the tone picks one
const TONE_SOUND = { leaf: 'done', sun: 'xp', sky: 'xp', berry: 'shake', tomato: 'badge', night: 'streak' };
let celeOpen = null;
export function celebration(screens) {
  screens = screens.filter(Boolean);
  if (!screens.length) return Promise.resolve();
  if (celeOpen) return celeOpen.then(() => celebration(screens));
  const opener = document.activeElement;
  const bg = document.createElement('div'); bg.className = 'cele';
  bg.setAttribute('role', 'dialog'); bg.setAttribute('aria-modal', 'true'); bg.setAttribute('aria-labelledby', 'cele-t');
  document.body.appendChild(bg); document.documentElement.classList.add('cele-on');
  let i = -1, done, stopFace = () => {};
  const p = new Promise((r) => { done = r; });
  celeOpen = p;
  const finish = () => {
    removeEventListener('keydown', onKey); stopFace();
    const end = () => { bg.remove(); document.documentElement.classList.remove('cele-on'); celeOpen = null; opener?.focus?.({ preventScroll: true }); done(); };
    if (reduced()) return end();
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'steps(3, end)', fill: 'forwards' }).onfinish = end;
  };
  const next = () => { if (++i >= screens.length) return finish(); show(screens[i]); };
  function show(s) {
    stopFace();
    bg.dataset.tone = s.tone || 'leaf';
    bg.classList.toggle('amber', !!s.amber);
    const pic = s.photo ? `<figure class="cele-photo"><img src="${s.photo}" alt="${s.photoAlt || 'Your photo'}"></figure>` : '';
    const top = s.art ? `<div class="cele-icon">${s.art}</div>` : faceCanvas(s.face || 'thriving', 'cele-face');
    bg.innerHTML = `<div class="cele-in">
      <div class="cele-art">${pic}${top}<span class="cele-sparks" aria-hidden="true">${'<i></i>'.repeat(6)}</span></div>
      <h2 class="cele-title" id="cele-t">${s.title || ''}</h2>
      ${s.big != null ? `<p class="cele-big">${s.big}</p>` : ''}
      ${s.sub ? `<p class="cele-sub">${s.sub}</p>` : ''}
      ${s.extra || ''}
      <div class="cele-acts"><button class="b3 b3-px cele-go" type="button">${s.cta || 'Continue'}</button></div>
      ${screens.length > 1 ? `<p class="cele-dots" aria-hidden="true">${screens.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</p>` : ''}
    </div>`;
    const inner = bg.firstElementChild;
    stopFace = runFaces(inner);
    const go = bg.querySelector('.cele-go');
    go.addEventListener('click', () => (s.onContinue ? s.onContinue(inner, next) : next()));
    // stepped entrance: each line switches on a beat after the last, like an LCD drawing itself
    if (!reduced()) [...inner.querySelectorAll('.cele-art, .cele-title, .cele-big, .cele-sub, .cele-extra, .cele-acts')].forEach((el, k) => {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: 60 + k * 90, easing: 'steps(2, end)', fill: 'backwards' });
    });
    if (s.count) { const b = inner.querySelector('.cele-num'); if (b) setTimeout(() => countUp(b, s.count.to, { from: s.count.from || 0, prefix: s.count.prefix || '', suffix: s.count.suffix || '', dur: 700, px: true }), reduced() ? 0 : 300); }
    haptic(14);
    const snd = s.sound ?? TONE_SOUND[s.tone || 'leaf'];
    if (snd) setTimeout(() => play(snd), reduced() ? 0 : 90);
    s.onShow?.(inner, next);
    go.focus({ preventScroll: true });
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { i = screens.length; finish(); }
    if (e.key === 'Tab') { const f = [...bg.querySelectorAll('button, a[href]')]; if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); } }
  };
  addEventListener('keydown', onKey);
  if (!reduced()) bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'steps(3, end)' });
  next();
  return p;
}
