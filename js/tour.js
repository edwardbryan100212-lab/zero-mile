// A short guided tour of Today: dims the screen, lights up one part at a time and says what it does in one line.
// Started from the "Quick tour" button by the greeting. Steps whose part is not on screen are skipped.
// Keys: right or Enter for next, left for back, Escape to close. Leaving Today closes it.
const CSS = `
.tour { position: fixed; inset: 0; z-index: 90; }
.tour-hole { position: fixed; border-radius: 14px; box-shadow: 0 0 0 200vmax rgba(14, 24, 17, .62); outline: 3px solid #fff; outline-offset: 0;
  transition: top .38s var(--ease), left .38s var(--ease), width .38s var(--ease), height .38s var(--ease); pointer-events: none; }
.tour-card { position: fixed; width: min(340px, calc(100vw - 32px)); background: var(--paper, #f6f3ea); color: var(--ink, #17221a);
  border-radius: 18px; padding: 18px 18px 14px; box-shadow: 0 12px 40px rgba(0, 0, 0, .28); font-family: var(--f-ui);
  transition: top .38s var(--ease), left .38s var(--ease), opacity .2s; }
.tour-card h2 { font: 700 1.25rem/1.2 var(--f-head); margin: 0 0 6px; }
.tour-card p { margin: 0; font-size: 1rem; line-height: 1.45; }
.tour-foot { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
.tour-step { font-size: .875rem; color: var(--ink-2, #4a574d); margin-right: auto; }
.tour-card button { font: 700 1rem var(--f-ui); min-height: 44px; padding: 0 16px; border-radius: 12px; border: 0; cursor: pointer; touch-action: manipulation; }
.tour-next { background: var(--leaf, #23774a); color: #fff; }
.tour-back { background: transparent; color: var(--ink, #17221a); box-shadow: inset 0 0 0 2px rgba(23, 34, 26, .16); }
.tour-x { position: absolute; top: 6px; right: 6px; width: 44px; padding: 0 !important; background: transparent; color: var(--ink-2, #4a574d); font-size: 1.5rem !important; line-height: 1; }
.tour-card button:active { transform: scale(.97); }
.tour-card button:focus-visible { outline: 3px solid var(--leaf, #23774a); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .tour-hole, .tour-card { transition: none; } }
`;

// each step: the first visible match of `sel`, a title and one plain line
const STEPS = [
  { sel: '#hero .th-odo, #hero', title: 'Km cancelled', text: 'Each harvest you log cancels the trip shop food would make. This adds up the kilometres.' },
  { sel: '#hero .th-streak', title: 'Your streak', text: 'Snap your plant once a day to keep the streak going. Each box is one day.' },
  { sel: '.tabbar .tab-snap, .side-nav [data-nav="snap"]', title: 'Take today’s photo', text: 'Tap here for the camera. The photo check runs on your phone, and nothing is uploaded.' },
  { sel: '#care-slot > *', title: 'Care today', text: 'The weather and today’s jobs. Tick each one when it’s done; tap the arrow for how.' },
  { sel: '.t-plants', title: 'Your plants', text: 'Everything you grow lives here. When it’s ready, pick some to cancel its trip.' },
  { sel: '.tabbar [data-nav="find"], .side-nav [data-nav="find"]', title: 'Find a plant', text: 'Browse 64 fruits, vegetables, herbs and trees that grow well at home.' },
  { sel: '.t-links a[href="#/impact"], .side-nav [data-nav="impact"]', title: 'Your impact', text: 'The km, CO2 and food you have saved, with the sources behind every number.' },
];

const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
const find = (sel) => [...document.querySelectorAll(sel)].find(visible);

let open = null;

export function startTour() {
  if (open) return;
  const steps = STEPS.filter((s) => find(s.sel));
  if (!steps.length) return;
  if (!document.getElementById('tour-css')) { const st = document.createElement('style'); st.id = 'tour-css'; st.textContent = CSS; document.head.appendChild(st); }
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-p" tabindex="-1">
      <button class="tour-x" type="button" aria-label="Close the tour">×</button>
      <h2 id="tour-t"></h2><p id="tour-p"></p>
      <div class="tour-foot"><span class="tour-step" aria-live="polite"></span><button class="tour-back" type="button">Back</button><button class="tour-next" type="button">Next</button></div>
    </div>`;
  document.body.appendChild(root);
  const hole = root.querySelector('.tour-hole'), card = root.querySelector('.tour-card');
  const back = root.querySelector('.tour-back'), next = root.querySelector('.tour-next');
  let i = 0, target = null, raf = 0;

  function place() {
    if (!target) return;
    const r = target.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
    // keep the lit box on screen even when the part is taller than the screen
    const top = Math.max(8, r.top - pad), bot = Math.min(vh - 8, r.bottom + pad);
    Object.assign(hole.style, { top: `${top}px`, left: `${Math.max(8, r.left - pad)}px`, width: `${Math.min(vw - 16, r.width + pad * 2)}px`, height: `${Math.max(0, bot - top)}px` });
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    let y = bot + gap;
    if (y + ch > vh - 16) y = top - gap - ch; // not enough room below: go above
    if (y < 16) y = Math.max(16, vh - ch - 16 - (matchMedia('(max-width: 699px)').matches ? 88 : 0)); // neither fits: sit near the bottom, over the tab bar
    const x = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), vw - cw - 16);
    Object.assign(card.style, { top: `${y}px`, left: `${x}px` });
  }
  function show(n) {
    i = n; const s = steps[i];
    target = find(s.sel);
    if (!target) { close(); return; }
    card.querySelector('#tour-t').textContent = s.title;
    card.querySelector('#tour-p').textContent = s.text;
    card.querySelector('.tour-step').textContent = `${i + 1} of ${steps.length}`;
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? 'Done' : 'Next';
    const r = target.getBoundingClientRect();
    if (getComputedStyle(target).position !== 'fixed' && !target.closest('.tabbar, .side-nav') && (r.top < 70 || r.bottom > innerHeight - 200)) {
      target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    place();
    card.focus({ preventScroll: true });
  }
  const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === card)) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i) go(-1); }
    else if (e.key === 'Tab') { // keep focus inside the card
      const f = [...card.querySelectorAll('button:not([hidden])')]; const a = f[0], z = f.at(-1);
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  function go(d) { const n = i + d; if (n >= steps.length) close(); else if (n >= 0) show(n); }
  function close() {
    if (!open) return; open = null;
    removeEventListener('resize', tick); removeEventListener('scroll', tick, true); removeEventListener('keydown', key); removeEventListener('hashchange', close);
    cancelAnimationFrame(raf); root.remove(); opener?.focus?.({ preventScroll: true });
  }
  next.addEventListener('click', () => go(1));
  back.addEventListener('click', () => go(-1));
  root.querySelector('.tour-x').addEventListener('click', close);
  addEventListener('resize', tick); addEventListener('scroll', tick, true); addEventListener('keydown', key); addEventListener('hashchange', close);
  open = { close };
  show(0);
}
