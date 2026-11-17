/* scene.js: the engine behind a full-screen pinned scroll scene (from Pack Room's flythru / aisle / vault scenes).

   mountScene(el, {
     height: 300,                 // section height in svh (the stage itself is 100svh and sticky)
     layout(W, H) {},             // measure and size things; called once images are decoded and on every resize
     draw(f) {},                  // f = smoothed scroll progress 0..1; write transform and opacity only
     still() {},                  // reduced motion: draw one good frame (default: draw(.3))
     settle: .55,                 // follower settle time in seconds
   }) -> { stage, progress() }

   What it does for you:
   - wraps el's children in a sticky 100svh stage (.st) and sets the section height
   - one critically damped follower chases the scroll progress (no overshoot; dt capped at 1/30)
   - the rAF loop runs only while the section is on screen (IntersectionObserver, 10% margin) and draws only when f moves
   - every <img data-src> inside is loaded and decoded two screens ahead; the section gets class .ok once all are ready,
     and layout() / draw() first run then, so nothing pops in mid-flight
   - prefers-reduced-motion: class .rmo, no pin, still() once
   Helpers exported: spring, clamp, seg, sm (smoothstep), easeIO (smootherstep), io (ease-in-out cubic), cosEase, seeded. */

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const sm = t => t * t * (3 - 2 * t);
export const easeIO = t => t * t * t * (t * (t * 6 - 15) + 10);
export const io = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const cosEase = t => (1 - Math.cos(Math.PI * t)) / 2;
/* a seeded random (Park-Miller), so a scattered layout is the same on every visit */
export const seeded = (seed = 7) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function spring(value = 0, { settle = .5 } = {}) {
  const omega = 2 * Math.PI / Math.max(.05, settle) * 1.2;
  return {
    value, target: value, velocity: 0,
    step(dt) {
      dt = Math.min(dt, 1 / 30);
      const a = -2 * omega * this.velocity - omega * omega * (this.value - this.target);
      this.velocity += a * dt;
      this.value += this.velocity * dt;
      if (Math.abs(this.velocity) < 1e-4 && Math.abs(this.value - this.target) < 1e-4) { this.value = this.target; this.velocity = 0; }
      return this.value;
    },
  };
}

export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountScene(el, { height = 300, layout = () => {}, draw = () => {}, still, settle = .55 } = {}) {
  el.classList.add('scene');
  let stage = el.querySelector(':scope > .st');
  if (!stage) {
    stage = document.createElement('div'); stage.className = 'st';
    while (el.firstChild) stage.appendChild(el.firstChild);
    el.appendChild(stage);
  }
  if (RM) el.classList.add('rmo'); else el.style.height = `${height}svh`;

  let W = 0, H = 0, top = 0, len = 1, ready = false;
  const measure = () => {
    W = stage.clientWidth || innerWidth; H = stage.clientHeight || innerHeight;
    const r = el.getBoundingClientRect(); top = r.top + scrollY; len = Math.max(1, el.offsetHeight - H);
    layout(W, H);
  };
  const progress = () => clamp((scrollY - top) / len);
  const showStill = () => (still ? still() : draw(.3));

  const fol = spring(0, { settle });
  let vis = false, lastT = 0, drawn = -1;
  const loop = now => {
    if (!vis) return; requestAnimationFrame(loop);
    const dt = lastT ? Math.min(.05, (now - lastT) / 1000) : 1 / 60; lastT = now;
    fol.target = progress(); fol.step(dt);
    if (Math.abs(fol.value - drawn) > 1e-4) { drawn = fol.value; draw(drawn); }
  };
  const start = () => {
    measure();
    if (RM) { showStill(); return; }
    // arrive at the current place, not the start: a link or a fast scroll into the scene must not replay it
    fol.value = fol.target = progress(); fol.velocity = 0; drawn = -1; draw(fol.value);
    new IntersectionObserver(([e]) => {
      const was = vis; vis = e.isIntersecting;
      if (vis && !was) { measure(); fol.value = fol.target = progress(); fol.velocity = 0; lastT = 0; drawn = -1; requestAnimationFrame(loop); }
    }, { rootMargin: '10% 0px' }).observe(el);
  };

  // load and decode every picture two screens ahead, then start
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting || ready) return; ready = true; obs.disconnect();
    const imgs = [...el.querySelectorAll('img[data-src]')];
    imgs.forEach(im => { im.src = im.dataset.src; });
    Promise.all(imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {}))).then(() => { el.classList.add('ok'); start(); });
  }, { rootMargin: '200% 0px' }).observe(el);

  addEventListener('resize', () => { if (!ready) return; measure(); RM ? showStill() : draw(fol.value); });
  return { stage, progress };
}

/* write a transform and opacity on a node, skipping writes that would change nothing */
export function put(node, x, y, k, o) {
  node.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${k.toFixed(4)})`;
  if (o != null && Math.abs((node._o ?? -1) - o) > .004) { node.style.opacity = o.toFixed(3); node._o = o; }
}
export function hide(node) { if (node._o !== 0) { node.style.opacity = '0'; node._o = 0; } }
/* fade an overlay (intro card / caption) in or out; sets visibility explicitly ('' would leave CSS's hidden in force) */
export function fade(node, a, lift = 14) {
  node.style.opacity = a.toFixed(3);
  node.style.transform = `translateY(${((1 - a) * lift).toFixed(1)}px)`;
  node.style.visibility = a < .01 ? 'hidden' : 'visible';
}
