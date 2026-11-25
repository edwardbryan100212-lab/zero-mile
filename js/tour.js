// The Quick tour: plays by itself. It dims the screen, lights up one part at a time with a one-line note, moves on
// after a few seconds, and visits every page in the menu, showing each one at work (it types a search, grows a
// plant on its slider, flips to the harvest). Nothing is saved and nothing in your garden changes.
// The card has Pause / Play, Back, Next and a close button; arrow keys, space and Escape work too.
// If you go to another page yourself, the tour stops.
const CSS = `
.tour { position: fixed; inset: 0; z-index: 90; }
.tour-hole { position: fixed; border-radius: 14px; box-shadow: 0 0 0 200vmax rgba(14, 24, 17, .62); outline: 3px solid #fff;
  transition: top .45s var(--ease), left .45s var(--ease), width .45s var(--ease), height .45s var(--ease), opacity .25s; pointer-events: none; }
.tour-card { position: fixed; width: min(340px, calc(100vw - 32px)); background: var(--paper, #f6f3ea); color: var(--ink, #17221a);
  border-radius: 18px; padding: 16px 18px 12px; box-shadow: 0 12px 40px rgba(0, 0, 0, .28); font-family: var(--f-ui); overflow: hidden;
  transition: top .45s var(--ease), left .45s var(--ease); }
.tour-page { display: block; font-size: .8125rem; font-weight: 700; letter-spacing: .02em; color: var(--leaf, #23774a); margin: 0 40px 2px 0; }
.tour-card h2 { font: 700 1.25rem/1.2 var(--f-head); margin: 0 40px 6px 0; }
.tour-card p { margin: 0; font-size: 1rem; line-height: 1.45; }
.tour-foot { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.tour-step { font-size: .875rem; color: var(--ink-2, #4a574d); margin-right: auto; }
.tour-card button { font: 700 1rem var(--f-ui); min-height: 44px; padding: 0 14px; border-radius: 12px; border: 0; cursor: pointer; touch-action: manipulation; color: var(--ink, #17221a); background: transparent; }
.tour-next { background: var(--leaf, #23774a) !important; color: #fff !important; }
.tour-back, .tour-play { box-shadow: inset 0 0 0 2px rgba(23, 34, 26, .16); }
.tour-play { width: 44px; padding: 0 !important; display: inline-grid; place-items: center; }
.tour-play svg { width: 20px !important; height: 20px !important; min-width: 20px; fill: currentColor; display: block; }
.tour-x { position: absolute; top: 6px; right: 6px; width: 44px; padding: 0 !important; color: var(--ink-2, #4a574d) !important; font-size: 1.5rem !important; line-height: 1; }
.tour-card button:active { transform: scale(.97); }
.tour-card button:focus-visible { outline: 3px solid var(--leaf, #23774a); outline-offset: 2px; }
.tour-bar { position: absolute; left: 0; bottom: 0; height: 4px; width: 100%; background: var(--leaf, #23774a); transform-origin: left; transform: scaleX(0); }
@media (prefers-reduced-motion: reduce) { .tour-hole, .tour-card { transition: none; } }
`;
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4.5v16H6zM13.5 4H18v16h-4.5z"/></svg>';

const wait = (ms, sig) => new Promise((res) => { const t = setTimeout(res, ms); sig?.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true }); });
const visible = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
// a step's selector can list fallbacks: the first one that is on screen wins, in the order written
const find = (sel) => { for (const one of sel.split(/\s*,\s*/)) { const el = [...document.querySelectorAll(one)].find(visible); if (el) return el; } return null; };
const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

// type a word into the search box one letter at a time, then put the box back as it was
async function typeSearch(word, sig) {
  const q = find('#q'); if (!q) return;
  const was = q.value;
  for (let n = 1; n <= word.length && !sig.aborted; n++) { setVal(q, word.slice(0, n)); await wait(170, sig); }
  await wait(2600, sig);
  if (q.isConnected) setVal(q, was);
}
// move the growth slider from seed to fully grown, a stage at a time
async function growSlider(sig) {
  const s = find('#stage'); if (!s) return;
  for (let v = +s.min; v <= +s.max && !sig.aborted; v++) { setVal(s, v); await wait(900, sig); }
  if (s.isConnected && +s.value !== +s.max) setVal(s, s.max);
}
// show the harvest, then go back to the plant
async function flipHarvest(sig) {
  const h = find('[data-mode="harvest"]'); if (!h) return;
  await wait(500, sig); if (sig.aborted) return;
  h.click(); await wait(2600, sig);
  find('[data-mode="plant"]')?.click();
}

// open a care tip (why and how, with its source), let it be read, then close it again
async function openTip(sel, sig) {
  const b = find(sel); if (!b) return;
  await wait(700, sig); if (sig.aborted || b.getAttribute('aria-expanded') === 'true') return;
  b.click(); await wait(3400, sig);
  if (b.isConnected && b.getAttribute('aria-expanded') === 'true') b.click();
}

// page: the label at the top of the card; route: the page to show first; ms: how long the step stays (when playing)
const STEPS = [
  { page: 'Today', route: '#/', sel: '#hero', title: 'Km cancelled', text: 'Each harvest you log cancels the trip shop food would make. This adds up the kilometres.' },
  { page: 'Today', route: '#/', sel: '#hero .th-streak', title: 'Your streak', text: 'Snap your plant once a day to keep the streak going. Each box is one day.' },
  { page: 'Today', route: '#/', sel: '#care-slot .wx-strip', title: 'Your weather', text: 'Three days of local weather. It changes your jobs: rain means skip watering, frost means cover tender plants.' },
  { page: 'Today', route: '#/', sel: '#care-slot .care-row.wx', title: 'Weather tips', text: 'When the weather matters, a tip shows up. Watch: it opens to say why.', ms: 5200, demo: (sig) => openTip('#care-slot .care-row.wx .care-main', sig) },
  { page: 'Today', route: '#/', sel: '#care-slot .care-row:not(.wx)', title: 'Today’s jobs', text: 'Tick a job when it’s done. Tap its name for how and why, with the source.', ms: 5200, demo: (sig) => openTip('#care-slot .care-row:not(.wx) .care-main', sig) },
  { page: 'Today', route: '#/', sel: '.t-plants', title: 'Your plants', text: 'Everything you grow lives here. When it’s ready, pick some to cancel its trip.' },
  { page: 'Find', route: '#/find', sel: '.f3-search', title: 'Search', text: 'Type a name or a kind of plant. Watch: we’ll look for berries.', ms: 4200, demo: (sig) => typeSearch('berr', sig) },
  { page: 'Find', route: '#/find', sel: '.f3-grid > *:first-child, #list', title: 'Pick a plant', text: 'Each card says how easy it is. Tap one to see it grow in 3D.' },
  { page: 'Plant', route: '#/plant/tomato', sel: '#stage-box', title: 'Watch it grow', text: 'Slide from seed to fully grown. The 3D plant changes at each stage.', ms: 5200, demo: growSlider },
  { page: 'Plant', route: '#/plant/tomato', sel: '#stage-box', title: 'Plant or harvest', text: 'Switch to Harvest to see what you’ll pick.', ms: 4200, demo: flipHarvest },
  { page: 'Plant', route: '#/plant/tomato', sel: '.twin3', title: 'Its shop twin', text: 'Where the shop version is grown, and the road it takes to reach you.' },
  { page: 'Photo', route: '#/snap', sel: '#frame', title: 'Fill the frame', text: 'Line up your plant here. Last time’s photo shows faintly so each one matches.' },
  { page: 'Photo', route: '#/snap', sel: '.snap-tips', title: 'Good photo tips', text: 'Daylight with no flash, leaves filling the frame, the same spot each time.' },
  { page: 'Photo', route: '#/snap', sel: '#snap-btn', title: 'Take a photo', text: 'The check runs on your phone: green, yellowing, dry edges. Nothing is uploaded.' },
  { page: 'Stickers', route: '#/rewards', sel: '.sb-odo', title: 'Trips on a map', text: 'Every harvest cancels one trip. The next one is shown with how far it has to go.' },
  { page: 'Stickers', route: '#/rewards', sel: '.sb-book', title: 'Your sticker book', text: 'Each plant you grow and each streak you keep earns a sticker.' },
  { page: 'Impact', route: '#/impact', sel: '.ct3-grid', title: 'Your impact', text: 'Km cancelled, travel CO2 skipped, food grown and trees planted, each with its next goal.' },
  { page: 'Impact', route: '#/impact', sel: '.imp-map', title: 'Trips you cancelled', text: 'Each trip you cancel lands on this map, with the real route it would have taken.' },
  { page: 'About', route: '#/sources', sel: '.ab3-nums', title: 'Private by design', text: 'No account. Your photos and progress stay on this device.' },
  { page: 'About', route: '#/sources', sel: '.ab3-src', title: 'How we know', text: 'Every number has a source you can open and check.' },
];

let open = null;

// onEnd(goingHome): called once when the tour ends, before it takes you back to the page it started on
export function startTour({ onEnd } = {}) {
  if (open) return;
  if (!document.getElementById('tour-css')) { const st = document.createElement('style'); st.id = 'tour-css'; st.textContent = CSS; document.head.appendChild(st); }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const home = location.hash || '#/';
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = `<div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-p" tabindex="-1">
      <button class="tour-x" type="button" aria-label="Close the tour">×</button>
      <span class="tour-page"></span><h2 id="tour-t"></h2><p id="tour-p" aria-live="polite"></p>
      <div class="tour-foot"><span class="tour-step"></span>
        <button class="tour-play" type="button" aria-label="Pause">${PAUSE}</button>
        <button class="tour-back" type="button">Back</button><button class="tour-next" type="button">Next</button></div>
      <i class="tour-bar" aria-hidden="true"></i>
    </div>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const hole = $('.tour-hole'), card = $('.tour-card'), bar = $('.tour-bar'), playB = $('.tour-play'), back = $('.tour-back'), next = $('.tour-next');
  let i = -1, target = null, raf = 0, playing = true, driving = false, ctl = null, timer = 0, barAnim = null;

  function place() {
    if (!target || !target.isConnected) return;
    const r = target.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
    const top = Math.max(8, r.top - pad), bot = Math.min(vh - 8, r.bottom + pad);
    Object.assign(hole.style, { top: `${top}px`, left: `${Math.max(8, r.left - pad)}px`, width: `${Math.min(vw - 16, r.width + pad * 2)}px`, height: `${Math.max(0, bot - top)}px` });
    const cw = card.offsetWidth, ch = card.offsetHeight, gap = 14, tabs = matchMedia('(max-width: 699px)').matches ? 88 : 0;
    let y = bot + gap;
    if (y + ch > vh - 16 - tabs) y = top - gap - ch; // no room below: go above
    if (y < 16) y = vh - ch - 16 - tabs; // neither: sit at the bottom, over the part
    const x = Math.min(Math.max(16, r.left + r.width / 2 - cw / 2), vw - cw - 16);
    Object.assign(card.style, { top: `${y}px`, left: `${x}px` });
  }
  const tick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  const follow = setInterval(tick, 300); // pages shift as they draw and as demos run: keep the light on its part

  // go to a page and wait for the part to show up (pages draw a moment after the address changes)
  async function reach(s, sig) {
    const cur = (location.hash || '#/').replace(/^#\/?$/, '#/');
    if (cur !== s.route) { driving = true; location.hash = s.route; await wait(60); driving = false; }
    for (let k = 0; k < 30 && !sig.aborted; k++) { const el = find(s.sel); if (el) return el; await wait(100, sig); }
    return null;
  }
  function stopTimer() { clearTimeout(timer); barAnim?.pause(); }
  // the bar along the card's foot fills while a step plays; pausing holds it
  function runTimer(ms) {
    stopTimer(); barAnim?.cancel();
    barAnim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms, fill: 'forwards' }); barAnim._ms = ms;
    if (playing) timer = setTimeout(() => go(1), ms); else barAnim.pause();
  }
  function setPlaying(p) {
    playing = p;
    playB.innerHTML = p ? PAUSE : PLAY; playB.setAttribute('aria-label', p ? 'Pause' : 'Play');
    if (!p) { stopTimer(); return; }
    if (!barAnim) return;
    const rem = barAnim._ms - (barAnim.currentTime || 0);
    barAnim.play(); clearTimeout(timer); timer = setTimeout(() => go(1), Math.max(300, rem));
  }
  async function show(n) {
    ctl?.abort(); ctl = new AbortController(); const sig = ctl.signal;
    stopTimer(); barAnim?.cancel(); barAnim = null;
    i = n; const s = STEPS[i];
    $('.tour-page').textContent = s.page;
    $('#tour-t').textContent = s.title;
    $('#tour-p').textContent = s.text;
    $('.tour-step').textContent = `${i + 1} of ${STEPS.length}`;
    back.hidden = i === 0;
    next.textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    hole.style.opacity = '.0';
    target = await reach(s, sig);
    if (sig.aborted) return;
    if (!target) { go(1); return; } // this part isn't here (a new garden has no plants yet): skip it
    hole.style.opacity = '1';
    const r = target.getBoundingClientRect();
    if (!target.closest('.tabbar, .side-nav, .topbar') && (r.top < 70 || r.bottom > innerHeight - 220)) {
      target.scrollIntoView({ block: r.height > innerHeight * .6 ? 'start' : 'center', behavior: reduce ? 'auto' : 'smooth' });
      await wait(reduce ? 50 : 450, sig);
    }
    place();
    if (!card.contains(document.activeElement)) card.focus({ preventScroll: true });
    const ms = s.ms || 4200;
    // the demo plays whether or not the tour is paused: it is part of what the step shows
    if (s.demo) s.demo(sig).catch(() => {});
    runTimer(ms);
  }
  function go(d) {
    const n = i + d;
    if (n >= STEPS.length) close(true);
    else if (n >= 0) show(n);
  }
  function key(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i) go(-1); }
    else if (e.key === ' ' && e.target === card) { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'Tab') { // keep focus inside the card
      const f = [...card.querySelectorAll('button:not([hidden])')]; const a = f[0], z = f.at(-1);
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  }
  const onHash = () => { if (!driving) close(false); }; // you went somewhere yourself: stop and stay there
  function close(goHome) {
    if (!open) return; open = null;
    ctl?.abort(); stopTimer(); barAnim?.cancel();
    removeEventListener('resize', tick); removeEventListener('scroll', tick, true); removeEventListener('keydown', key); removeEventListener('hashchange', onHash);
    cancelAnimationFrame(raf); clearInterval(follow); root.remove();
    const moving = goHome && (location.hash || '#/') !== home;
    try { onEnd?.(moving); } catch { /* the tour still closes */ }
    if (moving) location.hash = home; else opener?.focus?.({ preventScroll: true });
  }
  next.addEventListener('click', () => go(1));
  back.addEventListener('click', () => go(-1));
  playB.addEventListener('click', () => setPlaying(!playing));
  $('.tour-x').addEventListener('click', () => close(true));
  addEventListener('resize', tick); addEventListener('scroll', tick, true); addEventListener('keydown', key); addEventListener('hashchange', onHash);
  open = { close };
  show(0);
}
