// Zero Mile: small motion helpers and drawn pictures for the app. One easing curve everywhere, transforms and
// opacity only, and "reduce motion" turns every animation here into an instant change.
export const EASE = 'cubic-bezier(.22,1,.36,1)';
export const SPRING = 'cubic-bezier(.34,1.56,.64,1)'; // only for pops: rewards, badges, chests, Pip
import { play, buzz } from './sound.js?v=9';
export { play, buzz };
const rm = matchMedia('(prefers-reduced-motion: reduce)');
export const reduced = () => rm.matches;

// ---------- press feedback: CSS does the scale on :active; iOS only fires :active when a touch listener exists ----------
// A chunky .b3 button also gives a soft tick as it goes down (sound.js skips repeats within 70 ms).
let pressOn = false;
export function initPress() {
  if (pressOn) return; pressOn = true;
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (e.button === 0 && e.target.closest?.('.b3:not(:disabled)')) play('tap'); }, { passive: true });
}

// ---------- route transition: fade in and rise 8px ----------
export function enter(el) {
  if (!el || reduced()) return;
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: EASE });
}

// ---------- springy icon: a small hop when a tab becomes the current one ----------
export function hop(el) {
  if (!el || reduced()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'translateY(-3px) scale(1.16)', offset: .35 }, { transform: 'translateY(0) scale(.96)', offset: .7 }, { transform: 'scale(1)' }], { duration: 380, easing: EASE });
}

// ---------- count-up numbers ----------
const nf = (n, d) => Number(n).toLocaleString('en-IE', { maximumFractionDigits: d, minimumFractionDigits: d });
export function countUp(el, to, { from = 0, dec = 0, dur = 900, suffix = '', sound } = {}) {
  if (!el) return;
  if (sound && to !== from) play(sound);
  if (reduced() || to === from) { el.textContent = nf(to, dec) + suffix; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 4;
    el.textContent = nf(from + (to - from) * e, k < 1 ? dec : dec) + suffix;
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  el.textContent = nf(from, dec) + suffix;
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
  // a .bar3 fill grows by its width (it has rounded ends and a shine); the rest scale on x
  const set = (el) => {
    if (el.parentElement?.classList.contains('bar3')) { el.style.width = `${+el.dataset.fill * 100}%`; if (+el.dataset.fill > 0 && !reduced()) setTimeout(() => el.parentElement.classList.add('shine'), 520); return; }
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

// ---------- confetti of leaves and petals ----------
const CONF = ['#3fae49', '#2b8a34', '#36b4f0', '#ffc531', '#ff5a4e', '#a560e8'];
export function confetti(x = innerWidth / 2, y = innerHeight / 3, { count = 38, spread = 1, sound } = {}) {
  if (sound) play(sound);
  if (reduced()) return;
  const layer = document.createElement('div'); layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  let left = count;
  for (let i = 0; i < count; i++) {
    const d = document.createElement('i');
    const leaf = i % 3 !== 0, s = leaf ? 8 + Math.random() * 7 : 7 + Math.random() * 4;
    d.className = leaf ? 'cf-leaf' : 'cf-petal';
    d.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${leaf ? s * 1.6 : s}px;background:${leaf ? CONF[i % 3] : CONF[3 + (i % 3)]}`;
    layer.appendChild(d);
    const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1 * spread, v = 120 + Math.random() * 170;
    const dx = Math.cos(a) * v, up = Math.sin(a) * v, fall = 220 + Math.random() * 180, r = (Math.random() - .5) * 720;
    d.animate([
      { transform: 'translate(0,0) rotate(0) scale(.6)', opacity: 1 },
      { transform: `translate(${dx * .7}px, ${up}px) rotate(${r * .4}deg) scale(1)`, opacity: 1, offset: .35 },
      { transform: `translate(${dx}px, ${up + fall}px) rotate(${r}deg) scale(.9)`, opacity: 0 },
    ], { duration: 1300 + Math.random() * 600, easing: EASE, delay: Math.random() * 90 }).onfinish = () => { d.remove(); if (--left === 0) layer.remove(); };
  }
}

// ---------- a sheet for the "?" explanations (bottom sheet on a phone, a centred card on a Mac) ----------
export function sheet({ title, body, label = 'Close' }) {
  const opener = document.activeElement;
  const bg = document.createElement('div'); bg.className = 'sheet-bg fun-sheet';
  const id = 'sh-' + Math.random().toString(36).slice(2, 8);
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="${id}"><div class="sheet-grab" aria-hidden="true"></div><div class="sheet-head"><h2 id="${id}">${title}</h2><button class="sheet-x" type="button" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="sheet-body">${body}</div></div>`;
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

// ---------- pictures: simple drawn SVGs in the app's palette ----------
const G = { g: '#2f7d32', g2: '#5aa83f', g3: '#9fd47f', deep: '#1d4a2b', soft: '#e6f2e2', sun: '#f2c94c', sun2: '#f7dd85', pot: '#c8744a', pot2: '#a95d37', soil: '#6b4a2f', sky: '#dcefd6', red: '#e8432a', white: '#ffffff', ink: '#12301f', grey: '#c9d2c4' };
const svg = (vb, inner, cls = '') => `<svg class="art ${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
const LEAF = 'M0 0C7-9 20-10 28 0C20 8 7 8 0 0Z';
export const ART = {
  sun: (c = '') => svg('0 0 64 64', `<g stroke="${G.sun}" stroke-width="4" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M32 6v7" transform="rotate(${a} 32 32)"/>`).join('')}</g><circle cx="32" cy="32" r="13" fill="${G.sun}"/><circle cx="27.5" cy="30" r="1.8" fill="${G.ink}"/><circle cx="36.5" cy="30" r="1.8" fill="${G.ink}"/><path d="M27 35.5q5 4 10 0" stroke="${G.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`, c),
  can: (c = '', full = true) => svg('0 0 64 64', `<path d="M14 26h28l-3 26H17z" fill="${full ? G.g2 : G.grey}"/><path d="M14 26h28" stroke="${full ? G.g : '#aab4a5'}" stroke-width="4" stroke-linecap="round"/><path d="M41 32l14-12" stroke="${full ? G.g : '#aab4a5'}" stroke-width="5" stroke-linecap="round"/><path d="M52 17l6 5" stroke="${full ? G.g : '#aab4a5'}" stroke-width="6" stroke-linecap="round"/><path d="M18 26c0-10 20-10 20 0" stroke="${full ? G.deep : '#aab4a5'}" stroke-width="4" fill="none"/>${full ? `<path d="M58 28q2 4 0 6q-2-2 0-6zM54 33q2 4 0 6q-2-2 0-6z" fill="#8fc7ef"/>` : ''}<rect x="21" y="35" width="14" height="4" rx="2" fill="#fff" opacity=".55"/>`, c),
  lorry: (c = '') => svg('0 0 72 48', `<rect x="4" y="8" width="38" height="26" rx="4" fill="${G.g2}"/><path d="M42 16h14l10 10v8H42z" fill="${G.g}"/><path d="M47 19h8l6 7H47z" fill="#cfe9f5"/><circle cx="16" cy="37" r="6" fill="${G.ink}"/><circle cx="16" cy="37" r="2.4" fill="${G.grey}"/><circle cx="54" cy="37" r="6" fill="${G.ink}"/><circle cx="54" cy="37" r="2.4" fill="${G.grey}"/><path d="M12 18h20M12 24h14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`, c),
  plane: (c = '') => svg('0 0 64 64', `<path d="M6 34l50-18c4-1 6 3 3 5L14 44z" fill="#fff" stroke="${G.g}" stroke-width="3" stroke-linejoin="round"/><path d="M26 30l-8-14h7l14 9z" fill="${G.g2}"/><path d="M28 38l-4 14h6l10-17z" fill="${G.g2}"/><path d="M8 34l-3-9h5l6 6z" fill="${G.g}"/>`, c),
  tree: (c = '', on = true) => svg('0 0 48 64', `<rect x="21" y="38" width="6" height="22" rx="3" fill="${on ? G.soil : '#b9b2a8'}"/><circle cx="24" cy="24" r="17" fill="${on ? G.g2 : G.grey}"/><circle cx="15" cy="31" r="10" fill="${on ? G.g : '#b7c1b2'}"/><circle cx="33" cy="31" r="10" fill="${on ? G.g : '#b7c1b2'}"/>${on ? `<circle cx="18" cy="18" r="5" fill="${G.g3}" opacity=".7"/>` : ''}`, c),
  basket: (c = '') => svg('0 0 64 64', `<circle cx="22" cy="26" r="8" fill="${G.red}"/><circle cx="34" cy="22" r="8" fill="${G.sun}"/><circle cx="44" cy="28" r="7" fill="${G.g2}"/><path d="M20 18q2-5 6-6M33 14q1-4 4-5" stroke="${G.g}" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M8 30h48l-6 24H14z" fill="${G.pot}"/><path d="M12 38h40M14 46h36" stroke="${G.pot2}" stroke-width="3"/>`, c),
  cloud: (c = '') => svg('0 0 64 48', `<path d="M16 40a10 10 0 0 1-1-20 14 14 0 0 1 27-4 11 11 0 0 1 8 24z" fill="${G.soft}" stroke="${G.g2}" stroke-width="3"/><text x="31" y="33" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="11" fill="${G.deep}">CO₂</text>`, c),
  camera: (c = '') => svg('0 0 64 64', `<rect x="8" y="18" width="48" height="34" rx="8" fill="${G.g}"/><path d="M22 18l4-7h12l4 7z" fill="${G.deep}"/><circle cx="32" cy="35" r="11" fill="#fff"/><circle cx="32" cy="35" r="6" fill="${G.g2}"/><circle cx="47" cy="26" r="2.5" fill="${G.sun}"/>`, c),
  leaf: (c = '', fill = G.g2) => svg('0 0 64 64', `<path d="M12 52C10 26 28 10 54 10c0 26-16 44-42 42z" fill="${fill}"/><path d="M14 50L44 20" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`, c),
  seed: (c = '') => svg('0 0 64 64', `<ellipse cx="32" cy="50" rx="24" ry="7" fill="${G.soil}" opacity=".25"/><ellipse cx="32" cy="38" rx="10" ry="13" fill="#b07a45"/><path d="M32 27v18" stroke="#8b5a2b" stroke-width="2" opacity=".5"/>`, c),
};

// a badge medal for a streak milestone; earned ones are gold and green, locked ones are grey
export function badge(n, earned) {
  const ring = earned ? G.sun : G.grey, face = earned ? G.g : '#e4e9de', ink = earned ? '#fff' : '#7d897f';
  return svg('0 0 64 72', `<path d="M20 44l-6 24 12-6 6 8 4-22zM44 44l6 24-12-6-6 8-4-22z" fill="${earned ? G.g2 : '#d3d9cf'}"/><circle cx="32" cy="30" r="24" fill="${ring}"/><circle cx="32" cy="30" r="18" fill="${face}"/><text x="32" y="${n >= 100 ? 36 : 37}" text-anchor="middle" font-family="Bricolage Grotesque,system-ui,sans-serif" font-weight="700" font-size="${n >= 100 ? 15 : 19}" fill="${ink}">${n}</text>`, earned ? 'badge on' : 'badge');
}

// the streak sprout: grows a stage at each badge (0 seed, 1 sprout … 5 flower, 6 fruit, 7 little tree)
export function sprout(level) {
  const H = [0, 26, 42, 58, 72, 86, 98, 108][Math.min(7, level)], base = 136, top = base - H;
  let leaves = '', i = 0;
  const pairs = Math.min(5, Math.max(1, level));
  for (let k = 0; k < pairs && level > 0; k++) {
    const y = base - 10 - (H - 14) * (k + 1) / (pairs + .4), s = .55 + .12 * Math.min(3, level - k);
    for (const side of [-1, 1]) {
      leaves += `<g transform="translate(60 ${y.toFixed(1)}) scale(${side} 1) rotate(-28) scale(${s.toFixed(2)})"><path class="sp-leaf" style="--i:${i++}" d="${LEAF}" fill="${k % 2 ? G.g2 : G.g}"/></g>`;
    }
  }
  const crown = level >= 7 ? `<g class="sp-pop" style="--i:${i++}"><circle cx="60" cy="${top + 2}" r="30" fill="${G.g2}"/><circle cx="44" cy="${top + 12}" r="18" fill="${G.g}"/><circle cx="76" cy="${top + 12}" r="18" fill="${G.g}"/><circle cx="52" cy="${top - 8}" r="8" fill="${G.g3}" opacity=".7"/></g>` : '';
  const flower = level >= 5 && level < 7 ? `<g class="sp-pop" style="--i:${i++}" transform="translate(60 ${top})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="6" ry="9" cy="-9" fill="#fff" transform="rotate(${a})"/>`).join('')}<circle r="6" fill="${G.sun}"/></g>` : '';
  const fruit = level >= 6 ? `<g class="sp-pop" style="--i:${i++}"><circle cx="${level >= 7 ? 46 : 44}" cy="${top + (level >= 7 ? 14 : 30)}" r="6" fill="${G.red}"/><circle cx="${level >= 7 ? 74 : 77}" cy="${top + (level >= 7 ? 8 : 40)}" r="6" fill="${G.red}"/></g>` : '';
  const seed = level === 0 ? `<ellipse cx="60" cy="${base - 14}" rx="9" ry="11" fill="#b07a45"/><path d="M60 ${base - 24}v-7" stroke="${G.g2}" stroke-width="3" stroke-linecap="round"/>` : '';
  const stem = level > 0 ? `<path class="sp-stem" d="M60 ${base} C 58 ${base - H * .4}, 63 ${base - H * .7}, 60 ${top}" stroke="${level >= 7 ? G.soil : G.g}" stroke-width="${level >= 7 ? 8 : 4}" fill="none" stroke-linecap="round"/>` : '';
  // crop the empty sky above a small plant so it fills its box
  const vy = level >= 7 ? 0 : Math.max(0, Math.min(base - 70, top - (level >= 5 ? 26 : 18)));
  return svg(`0 ${vy} 120 ${150 - vy}`, `${crown}${stem}${leaves}${flower}${fruit}${seed}<path d="M22 136h76l-7 14H29z" fill="${G.pot}"/><rect x="18" y="130" width="84" height="9" rx="4" fill="${G.pot2}"/>`, 'sprout');
}

// ================= game layer motion (the springy curve is only for pops) =================
// a pop: scale up from .9 with the spring, opacity from 0. Reduced motion: shown at once.
export function pop(el, { delay = 0, from = .9, dur = 420, sound } = {}) {
  if (sound) play(sound);
  if (!el || reduced()) return null;
  return el.animate([{ opacity: 0, transform: `scale(${from})` }, { opacity: 1, transform: 'none' }], { duration: dur, delay, easing: SPRING, fill: 'backwards' });
}
// "+2 XP" rises from a button and fades
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
  g.animate([{ opacity: 0, transform: 'translate(-50%, 0) scale(.9)' }, { opacity: 1, transform: 'translate(-50%, -18px) scale(1)', offset: .3 }, { opacity: 0, transform: 'translate(-50%, -40px) scale(1)' }], { duration: 1100, easing: EASE }).onfinish = () => g.remove();
}
// seed gems burst out of a chest and fly off
export function burstSeeds(from, gem, n = 12) {
  if (!from || reduced()) return;
  const r = from.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * .45;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i'); s.className = 'seed-fly'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = gem;
    s.style.left = `${x}px`; s.style.top = `${y}px`; document.body.appendChild(s);
    const a = -Math.PI / 2 + (i / (n - 1) - .5) * Math.PI * 1.3, v = 90 + Math.random() * 90;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * v}px), calc(-50% + ${Math.sin(a) * v}px)) scale(1.1)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * v * 1.2}px), calc(-50% + ${Math.sin(a) * v + 140}px)) scale(.8)`, opacity: 0 },
    ], { duration: 1000 + Math.random() * 300, delay: i * 18, easing: EASE }).onfinish = () => s.remove();
  }
}

// ---------- Pip wearing what was bought in the shop ----------
import { mascot } from './art.js?v=9';
import { worn } from './rewards.js?v=9';
const HATS = {
  'hat-cap': '<g transform="translate(40 30) rotate(-14)"><path d="M-16 6a16 14 0 0 1 32 0z" fill="#36b4f0"/><path d="M-16 6h40a4 4 0 0 1 0 6h-40z" fill="#1a8fcc"/><circle cy="-8" r="3" fill="#1a8fcc"/><path d="M-9-2a9 8 0 0 1 8-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".5"/></g>',
  'hat-straw': '<g transform="translate(42 32) rotate(-12)"><ellipse rx="26" ry="7" cy="6" fill="#e0a200"/><path d="M-13 6c0-16 26-16 26 0z" fill="#ffc531"/><path d="M-13 2h26v4h-26z" fill="#ff5a4e"/><ellipse rx="20" ry="3" cy="6" fill="#ffd866" opacity=".6"/></g>',
  'hat-flower': `<g>${[[26, 40, '#ff5a4e'], [40, 36, '#ffc531'], [54, 35, '#a560e8'], [68, 35, '#36b4f0'], [82, 36, '#ff5a4e'], [95, 40, '#ffc531']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.2" ry="4.6" cy="-4" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="2.6" fill="#fff"/></g>`).join('')}</g>`,
  'hat-crown': '<g transform="translate(44 30) rotate(-10)"><path d="M-16 8l-2-18 9 8 9-12 9 12 9-8-2 18z" fill="#ffc531" stroke="#e0a200" stroke-width="2" stroke-linejoin="round"/><circle cy="2" r="3" fill="#ff5a4e"/><circle cx="-9" cy="4" r="2" fill="#36b4f0"/><circle cx="9" cy="4" r="2" fill="#a560e8"/></g>',
};
export const hatArt = (id, size = 48) => (HATS[id] ? `<svg class="art hat" width="${size}" height="${size}" viewBox="14 14 92 40" aria-hidden="true">${HATS[id]}</svg>` : '');
// Pip with the pot colour and hat worn (or a preview of { pot, hat })
export function pip(pose = 'wave', { size = 120, mood = 'happy', cls = '', look } = {}) {
  const w = look || worn();
  const potC = w.pot?.color, hat = w.hat;
  const svg = mascot(pose, { size, mood, pot: potC, potShade: w.pot?.shade, hat });
  const style = potC ? ` style="--pip-pot:${potC};--pip-pot-d:${w.pot.shade}"` : '';
  return `<span class="pipw ${cls}"${style} data-pose="${pose}"${hat ? ` data-hat="${hat}"` : ''}>${svg}${hat && !/data-hat=/.test(svg) ? `<svg class="pip-hat" viewBox="0 0 120 120" aria-hidden="true">${HATS[hat] || ''}</svg>` : ''}</span>`;
}

// ---------- full-screen celebration: screens that tap through, each with a chunky Continue ----------
// screens: [{ tone: 'leaf'|'sun'|'sky'|'berry'|'tomato', art, title, big, sub, extra, cta, sound, onShow(el, next) }]
// sound: a name from sound.js, or false for none; without it the tone picks one
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
  let i = -1, done;
  const p = new Promise((r) => { done = r; });
  celeOpen = p;
  const finish = () => {
    removeEventListener('keydown', onKey);
    const end = () => { bg.remove(); document.documentElement.classList.remove('cele-on'); celeOpen = null; opener?.focus?.({ preventScroll: true }); done(); };
    if (reduced()) return end();
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: EASE, fill: 'forwards' }).onfinish = end;
  };
  const next = () => { if (++i >= screens.length) return finish(); show(screens[i]); };
  function show(s) {
    bg.dataset.tone = s.tone || 'leaf';
    bg.innerHTML = `<div class="cele-in">
      <div class="cele-art">${s.art || ''}</div>
      <h2 class="cele-title" id="cele-t">${s.title || ''}</h2>
      ${s.big != null ? `<p class="cele-big">${s.big}</p>` : ''}
      ${s.sub ? `<p class="cele-sub">${s.sub}</p>` : ''}
      ${s.extra || ''}
      <div class="cele-acts"><button class="b3 b3-white b3-wide cele-go" type="button">${s.cta || 'Continue'}</button></div>
      ${screens.length > 1 ? `<p class="cele-dots" aria-hidden="true">${screens.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</p>` : ''}
    </div>`;
    const go = bg.querySelector('.cele-go');
    go.addEventListener('click', () => (s.onContinue ? s.onContinue(bg.firstElementChild, next) : next()));
    [...bg.querySelectorAll('.cele-art, .cele-title, .cele-big, .cele-sub, .cele-extra, .cele-acts')].forEach((el, k) => pop(el, { delay: k * 70 }));
    if (s.confetti !== false) setTimeout(() => confetti(innerWidth / 2, innerHeight * .32, { count: s.confetti || 40 }), reduced() ? 0 : 160);
    haptic(14);
    const snd = s.sound ?? TONE_SOUND[s.tone || 'leaf'];
    if (snd) setTimeout(() => play(snd), reduced() ? 0 : 90);
    s.onShow?.(bg.firstElementChild, next);
    go.focus({ preventScroll: true });
  }
  const onKey = (e) => {
    if (e.key === 'Escape') { i = screens.length; finish(); }
    if (e.key === 'Tab') { const f = [...bg.querySelectorAll('button, a[href]')]; if (!f.length) return; if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); } }
  };
  addEventListener('keydown', onKey);
  if (!reduced()) bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: EASE });
  next();
  return p;
}
