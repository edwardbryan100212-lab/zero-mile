// The pot's face, drawn on a canvas. Shared by the 3D pot (js/pot3d.js) and any 2D place that shows the
// plant's mood (Today dashboard, plant cards). API: drawFace(ctx, w, h, mood, t, opts) where mood is one of
// FACE_MOODS and t is seconds (for blinks and small idle motion). moodWord(mood) gives a short label.
// opts.bg (default true) paints the dark-green screen; with { bg: false } the face is drawn in dark ink on
// whatever is behind it (transparent or light backgrounds). With prefers-reduced-motion the face is still.
export const FACE_MOODS = ['thriving', 'happy', 'okay', 'thirsty', 'poorly', 'sleepy', 'new'];
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
export const moodWord = (m) => WORDS[m] || WORDS.okay;

const RM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const TAU = Math.PI * 2;

// eye: how the eyes look; mouth: mouth shape; brow: brow tilt (null, worried, sad); cheeks: blush 0..1;
// extra: the small animated thing beside the face; look: how far the eyes wander
const SPEC = {
  thriving: { eye: 'sparkle', mouth: 'grin', cheeks: 1, extra: 'sparkles', look: .6, bob: 1.3 },
  happy: { eye: 'round', mouth: 'open', cheeks: .9, extra: null, look: 1, bob: 1 },
  okay: { eye: 'round', mouth: 'smile', cheeks: .6, extra: null, look: 1, bob: .8 },
  thirsty: { eye: 'tired', mouth: 'wavy', brow: 'worried', cheeks: .25, extra: 'drop', look: .5, bob: .6 },
  poorly: { eye: 'sad', mouth: 'frown', brow: 'sad', cheeks: 0, extra: 'tear', look: .3, bob: .4 },
  sleepy: { eye: 'closed', mouth: 'snore', cheeks: .55, extra: 'zzz', look: 0, bob: .5 },
  new: { eye: 'big', mouth: 'o', cheeks: .75, extra: 'twinkle', look: 1.3, bob: 1 },
};

const THEMES = {
  screen: { ink: '#c8ffd6', glow: 'rgba(110,255,160,.55)', hole: '#08190f', tongue: '#ff8fa6', cheek: 'rgba(255,128,164,.78)', hi: '#ffffff' },
  plain: { ink: '#1f3a29', glow: null, hole: '#1f3a29', tongue: '#ff8fa6', cheek: 'rgba(255,128,160,.55)', hi: '#ffffff' },
};
const GOLD = '#ffd25e', WATER = '#6cc4ff';

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);

// eye openness 0..1: a blink every 3–6 s, now and then a double blink
function openness(t) {
  const P = 4.4, k = Math.floor(t / P), at = k * P + hash(k) * 2.2;
  const d = (x) => (x >= 0 && x < .18 ? 1 - Math.sin(Math.PI * x / .18) : 1);
  let o = d(t - at);
  if (hash(k + 50) > .68) o = Math.min(o, d(t - at - .32));
  return o;
}
// where the eyes look: hold a spot, then glance to the next one
function gaze(t) {
  const P = 2.7, k = Math.floor(t / P), p = ease((t - k * P) / .32);
  const spot = (i) => (hash(i + 9) < .4 ? [0, 0] : [(hash(i + 3) * 2 - 1), (hash(i + 7) * 2 - 1) * .5]);
  const a = spot(k - 1), b = spot(k);
  return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
}

function star(ctx, x, y, r) { // four-point sparkle
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * .32 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function drop(ctx, x, y, r) { // water drop, point up
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.7);
  ctx.bezierCurveTo(x + r * .35, y - r * 1.05, x + r, y - r * .5, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r, y - r * .5, x - r * .35, y - r * 1.05, x, y - r * 1.7);
  ctx.fill();
}

function paintScreen(ctx, w, h) {
  const g = ctx.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .5, Math.max(w, h) * .75);
  g.addColorStop(0, '#22563a'); g.addColorStop(.55, '#173f2a'); g.addColorStop(1, '#0c2418');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // a very soft pixel grid, so it still reads as a little screen
  ctx.fillStyle = 'rgba(160,255,190,.035)';
  const step = Math.max(3, Math.round(h / 60));
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, 1);
  // glass glare across the top left
  const gl = ctx.createLinearGradient(0, 0, w * .55, h * .7);
  gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(.5, 'rgba(255,255,255,.03)'); gl.addColorStop(.51, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(0, 0, w, h);
}

export function drawFace(ctx, w, h, mood = 'okay', t = 0, opts = {}) {
  const bg = opts.bg !== false;
  const still = opts.still ?? !!RM?.matches;
  if (still) t = 0;
  const S = SPEC[mood] || SPEC.okay, C = bg ? THEMES.screen : THEMES.plain;
  ctx.save();
  if (bg) paintScreen(ctx, w, h); else ctx.clearRect(0, 0, w, h);

  const u = Math.min(w / 1.75, h * 1.3); // size of the face box (wide screens get a bigger face)
  const cx = w / 2, cy = h * .5 + (still ? 0 : Math.sin(t * 2.1) * u * .014 * S.bob);
  const lw = u * .042;
  const glow = (on) => { ctx.shadowColor = on && C.glow ? C.glow : 'transparent'; ctx.shadowBlur = on && C.glow ? u * .07 : 0; };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // cheeks first, so the eyes sit over them
  if (S.cheeks) {
    ctx.fillStyle = C.cheek; ctx.globalAlpha = S.cheeks;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * u * .44, cy + u * .09, u * .085, u * .05, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // eyes
  const [gx, gy] = still ? [0, 0] : gaze(t);
  const lx = gx * S.look * u * .04, ly = gy * S.look * u * .03;
  const o = still ? 1 : openness(t);
  const joy = S.eye === 'sparkle' && !still && ((t % 6.5) > 4.9); // thriving squeezes its eyes with joy now and then
  const big = S.eye === 'big', rx = u * (big ? .125 : .112), ry = u * (big ? .158 : .142);
  const ey = cy - u * .07;
  for (const s of [-1, 1]) {
    const x = cx + s * u * .29 + lx, y = ey + ly;
    ctx.fillStyle = C.ink; ctx.strokeStyle = C.ink; ctx.lineWidth = lw;
    if (S.eye === 'closed' || joy) {
      glow(true); ctx.beginPath();
      if (joy) ctx.arc(x, y + ry * .55, rx * .95, Math.PI * 1.15, Math.PI * 1.85); // ^ ^
      else ctx.arc(x, y - ry * .55, rx * .95, Math.PI * .15, Math.PI * .85); // sleeping lids
      ctx.stroke(); glow(false); continue;
    }
    ctx.save();
    if (S.eye === 'sad' || S.eye === 'tired') { // a lid cuts the top of the eye
      const outer = S.eye === 'sad' ? -.05 : -.2, inner = S.eye === 'sad' ? -.62 : -.2;
      ctx.beginPath();
      ctx.moveTo(x + s * rx * 1.4, y + ry * outer); ctx.lineTo(x - s * rx * 1.4, y + ry * inner);
      ctx.lineTo(x - s * rx * 1.4, y + ry * 2); ctx.lineTo(x + s * rx * 1.4, y + ry * 2); ctx.closePath(); ctx.clip();
    }
    const oy = Math.max(o, .1);
    glow(true); ctx.beginPath(); ctx.ellipse(x, y + ry * (1 - oy) * .4, rx, ry * oy, 0, 0, TAU); ctx.fill(); glow(false);
    ctx.restore();
    if (o > .45) { // highlights make them look alive
      ctx.fillStyle = bg ? C.hole : C.hi;
      if (bg) { // on the glowing screen the eye shine is cut out, like a sticker
        ctx.globalAlpha = .9;
      }
      const hx = x + rx * .32, hy = y - ry * (S.eye === 'sad' ? .05 : S.eye === 'tired' ? .02 : .38);
      if (S.eye === 'sparkle') { ctx.fillStyle = bg ? C.hole : C.hi; star(ctx, hx - rx * .05, hy + ry * .05, rx * .55); }
      else { ctx.beginPath(); ctx.arc(hx, hy, rx * .34, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x - rx * .38, y + ry * .42, rx * .15, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // brows
  if (S.brow) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = lw * .8; glow(true);
    for (const s of [-1, 1]) {
      const x = cx + s * u * .29, y = ey - u * .2;
      const lift = S.brow === 'sad' ? u * .07 : u * .045; // inner ends lift up
      ctx.beginPath(); ctx.moveTo(x + s * u * .1, y + lift * .3); ctx.lineTo(x - s * u * .07, y - lift); ctx.stroke();
    }
    glow(false);
  }

  // mouth
  const my = cy + u * .2;
  ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = lw;
  const hole = (rxm, rym, yy) => { // an open mouth with a little tongue
    ctx.save(); glow(true);
    ctx.beginPath(); ctx.moveTo(cx - rxm, yy); ctx.quadraticCurveTo(cx, yy - rym * .18, cx + rxm, yy); ctx.ellipse(cx, yy, rxm, rym, 0, 0, Math.PI); ctx.closePath();
    ctx.fillStyle = C.hole; ctx.fill(); ctx.stroke(); glow(false); ctx.clip();
    ctx.fillStyle = C.tongue; ctx.beginPath(); ctx.ellipse(cx, yy + rym * 1.02, rxm * .58, rym * .55, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };
  if (S.mouth === 'grin') hole(u * .15, u * (.13 + (still ? 0 : Math.sin(t * 3) * .008)), my - u * .04);
  else if (S.mouth === 'open') hole(u * .115, u * .1, my - u * .03);
  else if (S.mouth === 'smile') { glow(true); ctx.beginPath(); ctx.arc(cx, my - u * .1, u * .1, Math.PI * .22, Math.PI * .78); ctx.stroke(); glow(false); }
  else if (S.mouth === 'frown') { glow(true); ctx.beginPath(); ctx.arc(cx, my + u * .08, u * .085, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke(); glow(false); }
  else if (S.mouth === 'wavy') {
    glow(true); ctx.beginPath();
    const ph = still ? 0 : t * 2.4;
    for (let i = 0; i <= 24; i++) { const f = i / 24, x = cx - u * .1 + f * u * .2; ctx.lineTo(x, my - u * .02 + Math.sin(f * TAU * 1.5 + ph) * u * .018); }
    ctx.stroke(); glow(false);
  } else { // 'o' (surprised and curious) and 'snore' (breathing in and out)
    const k = S.mouth === 'snore' ? (still ? .7 : .55 + .45 * (Math.sin(t * 1.6) * .5 + .5)) : 1;
    const r = u * (S.mouth === 'snore' ? .04 : .05);
    glow(true); ctx.beginPath(); ctx.ellipse(cx, my - u * .02, r * (.75 + .25 * k), r * 1.15 * k + r * .2, 0, 0, TAU);
    ctx.fillStyle = C.hole; ctx.fill(); ctx.stroke(); glow(false);
  }

  // the little extras
  const ph = (speed, off = 0) => (still ? off : ((t * speed + off) % 1 + 1) % 1);
  if (S.extra === 'sparkles' || S.extra === 'twinkle') {
    const pts = S.extra === 'sparkles'
      ? [[-.66, -.3, .07, 0], [.64, -.36, .055, .33], [.7, .2, .045, .66], [-.72, .24, .04, .5]]
      : [[.6, -.34, .05, 0], [-.62, -.3, .038, .5]];
    ctx.fillStyle = GOLD; if (bg) { ctx.shadowColor = 'rgba(255,210,94,.6)'; ctx.shadowBlur = u * .06; }
    for (const [px, py, r, off] of pts) {
      const p = ph(.55, off), k = still ? 1 : .35 + .65 * Math.sin(p * Math.PI);
      if (cx + px * u < 0 || cx + px * u > w) continue;
      star(ctx, cx + px * u, cy + py * u, u * r * k);
    }
    glow(false);
  } else if (S.extra === 'zzz') {
    ctx.strokeStyle = C.ink; ctx.lineWidth = lw * .7;
    for (let i = 0; i < 3; i++) {
      const p = ph(.32, i / 3), s = u * (.045 + p * .05);
      const x = cx + u * (.58 + p * .16) + Math.sin(p * TAU) * u * .03, y = cy - u * (.06 + p * .3);
      ctx.globalAlpha = still ? .9 - i * .2 : Math.sin(p * Math.PI);
      glow(true); ctx.beginPath(); ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y - s); ctx.lineTo(x - s, y + s); ctx.lineTo(x + s, y + s); ctx.stroke();
    }
    ctx.globalAlpha = 1; glow(false);
  } else if (S.extra === 'drop') { // a bead of sweat sliding down the side of the head
    const p = ph(.45, .3);
    ctx.globalAlpha = still ? 1 : clamp(p * 5) * clamp((1 - p) * 4);
    ctx.fillStyle = WATER; drop(ctx, cx + u * .5, cy - u * .26 + p * u * .16, u * .055);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(cx + u * .485, cy - u * .27 + p * u * .16, u * .014, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (S.extra === 'tear') { // a tear rolling down from one eye
    const p = ph(.3, .4);
    ctx.globalAlpha = still ? 1 : clamp(p * 6) * clamp((1 - p) * 3);
    ctx.fillStyle = WATER; drop(ctx, cx - u * .36, ey + u * .14 + p * u * .2, u * .035);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
