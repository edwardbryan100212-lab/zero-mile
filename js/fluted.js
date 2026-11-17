// Green fluted-glass background: the owner's Fluted Wallpaper (bg/fluted.html, own WebGL fluid + glass ribs)
// run in a frame behind content and steered from here: hue, pointer, pause when hidden, lower fps on phones.
import { ROOT } from './core.js?v=5';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
export const GREEN = { hue: 95, sat: .85, bright: 1.08, ribs: 46 };

export function fluted(host, config = {}) {
  const f = document.createElement('iframe');
  f.className = 'fluted'; f.title = ''; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
  f.src = new URL('bg/fluted.html', ROOT).href;
  host.prepend(f);
  const cfg = { ...GREEN, ...config };
  let ready = false, visible = true, held = false;
  const w = () => f.contentWindow;
  f.addEventListener('load', () => {
    ready = true;
    try {
      w().setConfig(cfg);
      w().setFps(innerWidth < 700 ? 30 : 45);
      if (reduce.matches || held) setTimeout(() => w().setPaused(true), 600); // one still frame
    } catch { /* frame not reachable: it still shows its own default */ }
  });
  // the frame ignores the pointer (content sits on top), so pass movement in
  const onMove = (e) => { if (!ready || !visible) return; const r = host.getBoundingClientRect(); try { w().setPointer((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height); } catch {} };
  host.addEventListener('pointermove', onMove, { passive: true });
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (ready && !reduce.matches) try { w().setPaused(!visible || held); } catch {} }, { rootMargin: '80px' });
  io.observe(host);
  return {
    pause(v) { held = !!v; if (ready) try { w().setPaused(held || !visible || reduce.matches); } catch {} },
    set(o) { Object.assign(cfg, o); if (ready) try { w().setConfig(o); } catch {} },
    dispose() { io.disconnect(); host.removeEventListener('pointermove', onMove); f.remove(); },
  };
}
