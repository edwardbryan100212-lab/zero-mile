// Pip's face: a virtual-pet LCD screen. A BLACK rounded screen with chunky GREEN pixel features, a soft
// pixel grid of unlit cells and a faint green glow. Shared by the 3D pot (js/pot3d.js) and every 2D place
// that shows the plant's mood (Today, plant cards). The SVG mascot in js/art.js uses the same pixel maps.
// API: drawFace(ctx, w, h, mood, t, opts), mood is one of FACE_MOODS, t is seconds (blink, two-frame
// idle wiggle, animated extras). The black screen IS the face: opts.bg (default true) also fills the
// corners with a dark bezel; with { bg: false } the corners outside the rounded screen stay transparent.
// With prefers-reduced-motion the face holds still (t is ignored).
export const FACE_MOODS = ['thriving', 'happy', 'okay', 'thirsty', 'poorly', 'sleepy', 'new'];
const WORDS = { thriving: 'Thriving', happy: 'Happy', okay: 'Doing okay', thirsty: 'A bit droopy', poorly: 'Needs help', sleepy: 'Waiting for a photo', new: 'Just planted' };
export const moodWord = (m) => WORDS[m] || WORDS.okay;

const RM = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export const LCD = { on: '#5dff7a', glow: 'rgba(93,255,122,.75)', screen: '#070b08', screenHi: '#0e1a11', bezel: '#151a16', grid: 'rgba(93,255,122,.06)' };

// Pixel maps. '#' is a lit pixel, '+' a half-lit one, anything else is off.
const P = (s) => s.trim().split('/');
export const SPRITES = {
  eye: {
    round: P('.##./#.##/####/####/.##.'),
    big: P('.##./##.#/#.##/####/.##.'),
    happy: P('..../.##./#..#/#..#/....'),
    tired: P('..../..../####/####/.##.'),
    sad: P('..../.##./####/####/.##.'),
    closed: P('..../..../#..#/.##./....'),
    blink: P('..../..../####/..../....'),
  },
  mouth: {
    grin: P('########/#++++++#/.#++++#./..####..'),
    open: P('######/#++++#/.####.'),
    smile: P('#....#/.####.'),
    wavy: P('.##..##./#..##..#'),
    frown: P('.####./#....#'),
    snoreA: P('.##./.##.'),
    snoreB: P('.##./#..#/.##.'),
    o: P('.##./#..#/#..#/.##.'),
  },
  browL: P('..##/##..'),
  browR: P('##../..##'),
  heart: P('.#.#./#####/.###./..#..'),
  spark: P('.#./###/.#.'),
  star: P('..#../..#../#####/..#../..#..'),
  zBig: P('####/..#./.#../####'),
  zSmall: P('###/.#./###'),
  drop: P('.#./.#./###/###/.#.'),
  tear: P('#./##/##'),
  bang: P('##/##/##/##/../##'),
  cheek: P('++'),
};

// eye: eye map; mouth: mouth map; brow: worried brows; cheeks: blush pixels; look: how far the eyes wander;
// beat: idle wiggle frames per second; blink: whether the eyes blink
export const SPEC = {
  thriving: { eye: 'happy', mouth: 'grin', cheeks: true, look: 0, beat: 2.4, blink: false },
  happy: { eye: 'round', mouth: 'open', cheeks: true, look: 1, beat: 1.8, blink: true },
  okay: { eye: 'round', mouth: 'smile', look: 1, beat: 1.2, blink: true },
  thirsty: { eye: 'tired', mouth: 'wavy', brow: true, look: .5, beat: .9, blink: true },
  poorly: { eye: 'sad', mouth: 'frown', brow: true, look: 0, beat: .6, blink: true },
  sleepy: { eye: 'closed', mouth: 'snore', look: 0, beat: .8, blink: false },
  new: { eye: 'big', mouth: 'o', cheeks: true, look: 1.4, beat: 2, blink: true },
};

const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// eyes shut for a moment every 3–6 s, now and then a double blink
function blinking(t) {
  const per = 4.4, k = Math.floor(t / per), at = k * per + hash(k) * 2.2, d = t - at;
  return (d >= 0 && d < .14) || (hash(k + 50) > .66 && d >= .3 && d < .44);
}
// eye shift in whole cells: hold a spot, then glance
function gaze(t, look) {
  if (!look) return 0;
  const k = Math.floor(t / 2.7), h = hash(k + 9);
  return h < .45 ? 0 : Math.round((hash(k + 3) * 2 - 1) * look);
}

// The face as a list of pixels [x, y, level] on a 24 x 14 sprite grid (level 1 lit, .5 half-lit).
// Exported so the SVG mascot can draw the same face; o.frame (0/1) and o.blink pin a frame for it.
export function facePixels(mood = 'okay', t = 0, still = false, o = {}) {
  const s = SPEC[mood] || SPEC.okay, out = [];
  const put = (map, x, y) => map.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '#') out.push([x + i, y + j, 1]); else if (ch === '+') out.push([x + i, y + j, .5]); } });
  const T = still ? 0 : t;
  const pinned = o.frame != null;
  const frame = pinned ? o.frame : still ? 0 : Math.floor(T * s.beat) % 2; // two-frame idle wiggle
  const by = frame; // the face drops one cell on frame 1
  const shut = s.blink && (o.blink != null ? o.blink : !still && blinking(T));
  const gx = still ? 0 : gaze(T, s.look);
  const eye = shut ? SPRITES.eye.blink : SPRITES.eye[s.eye];
  put(eye, 5 + gx, 3 + by); put(eye, 15 + gx, 3 + by);
  if (s.brow) { put(SPRITES.browL, 5, 0 + by); put(SPRITES.browR, 15, 0 + by); }
  if (s.cheeks) { put(SPRITES.cheek, 3, 8 + by); put(SPRITES.cheek, 19, 8 + by); }
  let m = s.mouth === 'snore' ? (frame ? SPRITES.mouth.snoreB : SPRITES.mouth.snoreA) : SPRITES.mouth[s.mouth];
  if (mood === 'happy' && frame) m = SPRITES.mouth.smile; // chatter between open and smile
  put(m, 12 - (m[0].length >> 1), 9 + by);

  // the extras, each with its own little pixel animation
  const f3 = pinned ? 1 + frame : still ? 1 : Math.floor(T * 2.2) % 3, f4 = pinned ? 1 + frame : still ? 1 : Math.floor(T * 3) % 4;
  if (mood === 'thriving') {
    put(SPRITES.heart, 0, frame ? 0 : 1);
    put(SPRITES.heart, 19, frame ? 1 : 0);
    if (f3 !== 2) put(SPRITES.spark, f3 ? 21 : 1, f3 ? 9 : 10);
  } else if (mood === 'happy') {
    put(frame ? SPRITES.star : SPRITES.spark, frame ? 19 : 20, frame ? 0 : 1);
    if (!frame) put(SPRITES.spark, 1, 1);
  } else if (mood === 'thirsty') {
    if (f4 < 3) put(SPRITES.drop, 0, f4 + 1);
  } else if (mood === 'poorly') {
    put(SPRITES.tear, 4, 7 + by + f3);
  } else if (mood === 'sleepy') {
    if (f3 < 2) put(SPRITES.zSmall, 20, 7); // the z's rise: small, small + big, big
    if (f3 >= 1) put(SPRITES.zBig, 20, 1);
  } else if (mood === 'new') {
    if (frame || still || pinned) put(SPRITES.bang, 21, frame ? 0 : 1);
    put(SPRITES.spark, 1, frame ? 0 : 1);
  }
  return out;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

export function drawFace(ctx, w, h, mood = 'okay', t = 0, opts = {}) {
  const bg = opts.bg !== false;
  const still = !!(RM && RM.matches);
  w = Math.round(w); h = Math.round(h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (bg) { ctx.fillStyle = LCD.bezel; ctx.fillRect(0, 0, w, h); }
  const rad = Math.round(Math.min(w, h) * .2);
  rr(ctx, 0, 0, w, h, rad);
  const sg = ctx.createRadialGradient(w * .5, h * .42, 0, w * .5, h * .5, Math.max(w, h) * .62);
  sg.addColorStop(0, LCD.screenHi); sg.addColorStop(1, LCD.screen);
  ctx.fillStyle = sg; ctx.fill();
  ctx.clip();

  // integer cells, sized so the 24 x 14 sprite fits with a margin
  const c = Math.max(2, Math.floor(Math.min(w / 26, h / 16)));
  const cols = Math.floor(w / c), rows = Math.floor(h / c);
  const ox = Math.floor((w - cols * c) / 2), oy = Math.floor((h - rows * c) / 2);
  const sx = Math.floor((cols - 24) / 2), sy = Math.floor((rows - 14) / 2);
  const gap = c >= 5 ? Math.max(1, Math.round(c * .14)) : (c >= 3 ? 1 : 0);
  const px = c - gap;

  // the soft grid of unlit pixels
  ctx.fillStyle = LCD.grid;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) ctx.fillRect(ox + i * c, oy + j * c, px, px);

  // lit pixels: one glowing pass, then the half-lit ones
  const pix = facePixels(mood, t, still);
  ctx.shadowColor = LCD.glow; ctx.shadowBlur = Math.max(2, c * 1.2);
  for (const lvl of [1, .5]) {
    ctx.beginPath();
    for (const [x, y, l] of pix) if (l === lvl) ctx.rect(ox + (sx + x) * c, oy + (sy + y) * c, px, px);
    ctx.globalAlpha = lvl === 1 ? 1 : .42;
    ctx.fillStyle = LCD.on; ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

  // glass: a soft glare at the top and a thin inner edge
  const gl = ctx.createLinearGradient(0, 0, 0, h * .5);
  gl.addColorStop(0, 'rgba(255,255,255,.07)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(rad, 0); ctx.lineTo(w * .62, 0); ctx.lineTo(w * .34, h * .5); ctx.lineTo(0, h * .5); ctx.lineTo(0, rad); ctx.closePath(); ctx.fill();
  ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) * .04)); ctx.strokeStyle = 'rgba(0,0,0,.55)';
  rr(ctx, 0, 0, w, h, rad); ctx.stroke();
  ctx.restore();
}
