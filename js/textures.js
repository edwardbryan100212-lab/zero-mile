// Canvas-drawn textures for the plants: leaves with veins and real edges, bark, soil and fruit skins.
// Leaves are drawn in light greys so each instance's colour tints them (texture x instance colour).
import * as THREE from 'three';
import { rng } from './plants3d-rng.js';

const cache = new Map();
const tex = (key, w, h, draw, { repeat, srgb = true } = {}) => {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t); return t;
};

// Width of a leaf at height y (0 base .. 1 tip), as a fraction of the half-width
export const LEAF_ASPECT = { oval: .55, lance: .24, heart: .95, lobed: 1.05, frilly: .9, serrate: .55, birch: .72, oak: .62, feather: .5, round: .85, strap: .16, needle: .9, palm: 1.1, crinkle: .75, tiny: .5 };
function profile(type, y, side, r) {
  let w = Math.sin(Math.PI * Math.pow(Math.min(.999, Math.max(.001, y)), .8));
  if (type === 'heart') w = Math.sin(Math.PI * Math.pow(y, .65)) * (1 + .25 * (1 - y));
  if (type === 'lance') w = Math.sin(Math.PI * Math.pow(y, .55));
  if (type === 'birch') w = Math.sin(Math.PI * Math.pow(y, .6));
  if (type === 'lobed') { // palmate courgette leaf: five lobes
    const lob = Math.abs(Math.sin(y * Math.PI * 2.5));
    w = Math.sin(Math.PI * Math.pow(y, .5)) * (.55 + .45 * lob);
  }
  if (type === 'oak') w *= .55 + .45 * Math.abs(Math.sin(y * Math.PI * 4.5 + .3));
  if (type === 'palm') { const lob = Math.abs(Math.sin(y * Math.PI * 1.5 + .2)); w = Math.sin(Math.PI * Math.pow(y, .55)) * (.45 + .55 * lob) * (1 + .05 * Math.sin(y * 70 + side)); }
  if (type === 'crinkle') w *= 1 + .05 * Math.sin(y * 40 + side * 3);
  if (type === 'tiny') w = Math.sin(Math.PI * Math.pow(y, .7));
  if (type === 'serrate' || type === 'birch' || type === 'round') w *= 1 + .06 * Math.sin(y * 90 + side);
  if (type === 'frilly') w *= 1 + .1 * Math.sin(y * 60 + side * 2) + .05 * Math.sin(y * 23);
  return Math.max(0, w);
}

export function leafTexture(type) {
  const W = 256, H = 512;
  return tex('leaf:' + type, W, H, (x) => {
    const r = rng(type.length * 97);
    x.clearRect(0, 0, W, H);
    const cx = W / 2, top = 6, bot = H - 4;
    const Y = (y) => bot - (bot - top) * y;
    if (type === 'needle') { // a tuft of pine needles fanning from one point
      x.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const a = -1.25 + r() * 2.5, len = 300 + r() * 190;
        x.strokeStyle = `rgba(${200 + r() * 55 | 0},${200 + r() * 55 | 0},${200 + r() * 55 | 0},1)`; x.lineWidth = 2.2 + r() * 1.6;
        x.beginPath(); x.moveTo(cx, Y(0)); x.quadraticCurveTo(cx + Math.sin(a) * len * .4, Y(0) - len * .5, cx + Math.sin(a) * len * .5, Y(0) - Math.cos(a * .6) * len); x.stroke();
      }
      return;
    }
    if (type === 'strap') { // corn, leek and allium blades: long with parallel veins
      const path = new Path2D(); path.moveTo(cx - W * .42, Y(0)); path.quadraticCurveTo(cx - W * .5, Y(.6), cx, Y(1)); path.quadraticCurveTo(cx + W * .5, Y(.6), cx + W * .42, Y(0)); path.closePath();
      x.save(); x.clip(path); x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, W, H);
      for (let i = 1; i < 9; i++) { x.strokeStyle = `rgba(255,255,255,${i === 4 ? .9 : .35})`; x.lineWidth = i === 4 ? 5 : 1.5; x.beginPath(); x.moveTo(cx - W * .42 + i * W * .105, Y(0)); x.lineTo(cx, Y(1)); x.stroke(); }
      x.restore(); return;
    }
    if (type === 'feather') { // carrot: finely divided fern-like leaf
      x.strokeStyle = '#d8d8d8'; x.lineCap = 'round';
      x.lineWidth = 6; x.beginPath(); x.moveTo(cx, Y(0)); x.lineTo(cx, Y(1)); x.stroke();
      for (let i = 1; i < 16; i++) {
        const y = i / 16, len = (1 - y) * 110 + 18;
        for (const s of [-1, 1]) {
          x.lineWidth = 4; x.beginPath(); x.moveTo(cx, Y(y)); const ex = cx + s * len, ey = Y(y) - len * .55; x.lineTo(ex, ey); x.stroke();
          for (let k = 1; k < 5; k++) { const px = cx + s * len * k / 5, py = Y(y) - len * .55 * k / 5; x.lineWidth = 3; x.beginPath(); x.moveTo(px, py); x.lineTo(px + s * 10, py - 14); x.moveTo(px, py); x.lineTo(px - s * 4, py - 16); x.stroke(); }
        }
      }
      return;
    }
    // outline
    const path = new Path2D(); const N = 220;
    path.moveTo(cx, Y(0));
    for (let i = 0; i <= N; i++) { const y = i / N; path.lineTo(cx + profile(type, y, 1, r) * (W / 2 - 4), Y(y)); }
    for (let i = N; i >= 0; i--) { const y = i / N; path.lineTo(cx - profile(type, y, -1, r) * (W / 2 - 4), Y(y)); }
    path.closePath();
    x.save(); x.clip(path);
    // body: lighter toward the edges, darker along the midrib, like real leaf blades
    const g = x.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, '#f0f0f0'); g.addColorStop(.42, '#c9c9c9'); g.addColorStop(.5, '#bdbdbd'); g.addColorStop(.58, '#c9c9c9'); g.addColorStop(1, '#f0f0f0');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const g2 = x.createLinearGradient(0, bot, 0, top); g2.addColorStop(0, 'rgba(0,0,0,.10)'); g2.addColorStop(1, 'rgba(255,255,255,.08)');
    x.fillStyle = g2; x.fillRect(0, 0, W, H);
    // mottling
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${.035 + r() * .04})`; const s = 2 + r() * 7; x.fillRect(r() * W, r() * H, s, s); }
    // veins: midrib, then side veins curving toward the tip
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineCap = 'round';
    x.lineWidth = type === 'lance' ? 3 : 5; x.beginPath(); x.moveTo(cx, Y(0)); x.lineTo(cx, Y(.97)); x.stroke();
    const veins = type === 'frilly' ? 14 : type === 'lobed' || type === 'palm' ? 5 : type === 'oak' ? 7 : type === 'crinkle' ? 12 : type === 'tiny' ? 3 : 9;
    for (let i = 1; i <= veins; i++) {
      const y0 = i / (veins + 1) * .92;
      for (const s of [-1, 1]) {
        const hw = profile(type, y0 + .08, s, r) * (W / 2 - 4);
        x.lineWidth = type === 'lobed' ? 3.5 : 2.2; x.strokeStyle = 'rgba(255,255,255,.55)';
        x.beginPath(); x.moveTo(cx, Y(y0)); x.quadraticCurveTo(cx + s * hw * .5, Y(y0 + .03), cx + s * hw * .95, Y(y0 + .12)); x.stroke();
        x.lineWidth = 1; x.strokeStyle = 'rgba(255,255,255,.25)';
        for (let k = 0; k < 3; k++) { const t = .3 + k * .22; x.beginPath(); x.moveTo(cx + s * hw * t * .9, Y(y0 + .02 + t * .06)); x.lineTo(cx + s * hw * t * .9 + s * 8, Y(y0 + .07 + t * .06)); x.stroke(); }
      }
    }
    x.restore();
    // a darker rim
    x.lineWidth = 2.5; x.strokeStyle = 'rgba(0,0,0,.18)'; x.stroke(path);
  });
}

export function barkTexture(kind) {
  return tex('bark:' + kind, 128, 512, (x, W, H) => {
    const r = rng(kind === 'birch' ? 3 : 5);
    if (kind === 'birch') {
      x.fillStyle = '#efece4'; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(120,110,95,${r() * .12})`; x.fillRect(r() * W, r() * H, 4 + r() * 20, 1); }
      for (let i = 0; i < 46; i++) { // dark lenticels and diamond marks
        const y = r() * H, w = 6 + r() * 44, h = 1.5 + r() * 4; x.fillStyle = r() > .2 ? '#2a2420' : '#4a3e34';
        x.beginPath(); x.ellipse(r() * W, y, w / 2, h / 2, 0, 0, 7); x.fill();
      }
      return;
    }
    if (kind === 'pine') { // grey-brown plates below, flaky orange above (v runs along the trunk)
      for (let y = 0; y < H; y += 2) { const k = y / H; x.fillStyle = `rgb(${Math.round(196 - 110 * k)},${Math.round(104 - 30 * k)},${Math.round(60 - 10 * k)})`; x.fillRect(0, y, W, 2); }
      for (let i = 0; i < 260; i++) { const yy = r() * H; x.fillStyle = `rgba(40,25,15,${.15 + r() * .35})`; x.fillRect(r() * W, yy, 6 + r() * 18, 2 + r() * 3); }
      return;
    }
    if (kind === 'beech') { x.fillStyle = '#8f9290'; x.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '40,40,40'},${r() * .08})`; x.fillRect(r() * W, r() * H, 3 + r() * 10, 2 + r() * 4); } return; }
    const base = kind === 'oak' ? [78, 64, 50] : [92, 74, 58];
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { // vertical fissures
      const xx = r() * W; x.strokeStyle = `rgba(20,14,10,${.25 + r() * .35})`; x.lineWidth = 1 + r() * 4;
      x.beginPath(); x.moveTo(xx, 0); let y = 0; while (y < H) { y += 10 + r() * 30; x.lineTo(xx + (r() - .5) * 8, y); } x.stroke();
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,240,220' : '0,0,0'},${r() * .08})`; x.fillRect(r() * W, r() * H, 2, 2 + r() * 6); }
  }, { repeat: [1, 2] });
}

export function soilTexture() {
  return tex('soil', 512, 512, (x, W, H) => {
    const r = rng(9);
    x.fillStyle = '#3f2c20'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = v > .6 ? `rgba(110,82,58,${r() * .5})` : `rgba(15,9,5,${r() * .5})`; const s = 1 + r() * 4; x.fillRect(r() * W, r() * H, s, s); }
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(150,130,110,${.4 + r() * .4})`; x.beginPath(); x.ellipse(r() * W, r() * H, 2 + r() * 5, 2 + r() * 4, r() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = `rgba(160,120,70,${.25 + r() * .3})`; x.lineWidth = 1.2; x.beginPath(); const a = r() * W, b = r() * H; x.moveTo(a, b); x.lineTo(a + (r() - .5) * 30, b + (r() - .5) * 30); x.stroke(); }
  }, { repeat: [2, 2] });
}
export function grassTexture() {
  return tex('grass', 512, 512, (x, W, H) => {
    const r = rng(4);
    x.fillStyle = '#4f7a35'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 14000; i++) { const g = 90 + r() * 90; x.strokeStyle = `rgba(${40 + r() * 50},${g},${30 + r() * 30},.7)`; x.lineWidth = 1; const a = r() * W, b = r() * H; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - .5) * 4, b - 4 - r() * 8); x.stroke(); }
  }, { repeat: [3, 3] });
}

// Fruit skins are light so the instance colour (green while unripe, red when ripe) shows through
export function fruitTexture(kind) {
  if (kind === 'strawberry') return tex('fr:strawberry', 256, 256, (x, W, H) => {
    const r = rng(2); x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, W, H);
    for (let row = 0; row < 14; row++) for (let i = 0; i < 18; i++) {
      const px = (i + (row % 2) * .5) / 18 * W, py = row / 14 * H + 6;
      x.fillStyle = 'rgba(80,30,20,.35)'; x.beginPath(); x.ellipse(px, py, 4, 5, 0, 0, 7); x.fill();
      x.fillStyle = '#f6e7a0'; x.beginPath(); x.ellipse(px, py - 1, 1.8, 2.6, 0, 0, 7); x.fill();
    }
  });
  if (kind === 'apple') return tex('fr:apple', 256, 256, (x, W, H) => {
    const r = rng(6); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 140; i++) { x.strokeStyle = `rgba(255,220,120,${r() * .5})`; x.lineWidth = 1 + r() * 3; const xx = r() * W; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx + (r() - .5) * 20, H); x.stroke(); }
    for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,240,200,.6)'; x.fillRect(r() * W, r() * H, 1.5, 1.5); }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,230,140,.45)'); g.addColorStop(.35, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
  if (kind === 'lemon' || kind === 'pepper' || kind === 'sphere' || kind === 'long') return tex('fr:skin' + kind, 256, 256, (x, W, H) => {
    const r = rng(kind.length); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
    const n = kind === 'lemon' ? 2400 : kind === 'long' ? 600 : 200;
    for (let i = 0; i < n; i++) { x.fillStyle = `rgba(0,0,0,${r() * (kind === 'lemon' ? .08 : .05)})`; x.beginPath(); x.arc(r() * W, r() * H, kind === 'lemon' ? 1.5 : 1 + r() * 2, 0, 7); x.fill(); }
    if (kind === 'long') for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(255,255,220,.22)'; x.fillRect(i * W / 10, 0, 6, H); }
  });
  const T = (k, draw, w = 256, h = 256) => tex('fr:' + k, w, h, draw);
  const r = rng(kind.length * 13 + 5);
  switch (kind) {
    case 'melon': return T(kind, (x, W, H) => { x.fillStyle = '#e8e2b8'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(250,248,230,.95)'; x.lineWidth = 2.5; for (let i = 0; i < 260; i++) { const a = r() * W, b = r() * H; x.beginPath(); x.moveTo(a, b); x.lineTo(a + (r() - .5) * 26, b + (r() - .5) * 26); x.lineTo(a + (r() - .5) * 26, b + (r() - .5) * 26); x.stroke(); } });
    case 'watermelon': return T(kind, (x, W, H) => { x.fillStyle = '#7fae5a'; x.fillRect(0, 0, W, H); for (let i = 0; i < 16; i++) { x.fillStyle = '#2f5e2a'; x.beginPath(); let px = i * W / 16; x.moveTo(px, 0); for (let y = 0; y <= H; y += 8) x.lineTo(px + Math.sin(y * .09 + i) * 5 + 4, y); for (let y = H; y >= 0; y -= 8) x.lineTo(px + Math.sin(y * .09 + i) * 5 + 10, y); x.fill(); } });
    case 'cob': return T(kind, (x, W, H) => { x.fillStyle = '#c08a1a'; x.fillRect(0, 0, W, H); for (let row = 0; row < 18; row++) for (let i = 0; i < 26; i++) { x.fillStyle = `rgb(${245 - r() * 20 | 0},${200 - r() * 30 | 0},${70 - r() * 30 | 0})`; x.beginPath(); x.ellipse((row + .5) * W / 18, (i + .5) * H / 26, W / 40, H / 60, 0, 0, 7); x.fill(); } });
    case 'sunhead': return T(kind, (x, W, H) => { x.fillStyle = '#3a2614'; x.fillRect(0, 0, W, H); for (let i = 0; i < 900; i++) { const a = i * 2.39996, d = Math.sqrt(i / 900) * W * .5; x.fillStyle = i < 160 ? '#8a6a1e' : `rgb(${50 + r() * 30 | 0},${32 + r() * 18 | 0},${18})`; x.beginPath(); x.arc(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d, 2.6, 0, 7); x.fill(); } }, 256, 256);
    case 'cone': return T(kind, (x, W, H) => { x.fillStyle = '#5a3c22'; x.fillRect(0, 0, W, H); for (let row = 0; row < 12; row++) for (let i = 0; i < 10; i++) { const px = (i + (row % 2) * .5) * W / 10, py = row * H / 12; x.fillStyle = '#8a6238'; x.beginPath(); x.moveTo(px, py + H / 12); x.lineTo(px + W / 20, py); x.lineTo(px + W / 10, py + H / 12); x.fill(); x.fillStyle = '#b08850'; x.fillRect(px + W / 30, py + H / 30, W / 30, 3); } });
    case 'brassica': return T(kind, (x, W, H) => { x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, W, H); for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${.06 + r() * .1})`; x.beginPath(); x.arc(r() * W, r() * H, 2 + r() * 5, 0, 7); x.fill(); } });
    case 'cabbage': return T(kind, (x, W, H) => { x.fillStyle = '#e4ecd8'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 9; i++) { x.lineWidth = 2; x.beginPath(); x.moveTo(i * W / 9, H); x.bezierCurveTo(i * W / 9 + 20, H * .6, i * W / 9 - 20, H * .3, i * W / 9 + 10, 0); x.stroke(); } x.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(r() * W, 0); x.quadraticCurveTo(r() * W, H / 2, r() * W, H); x.stroke(); } });
    case 'turnip': return T(kind, (x, W, H) => { const g = x.createLinearGradient(0, H, 0, 0); g.addColorStop(0, '#f4f1e8'); g.addColorStop(.5, '#f1ece0'); g.addColorStop(.72, '#b04d9a'); g.addColorStop(1, '#8a2f7a'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    case 'peach': return T(kind, (x, W, H) => { x.fillStyle = '#f4b25a'; x.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(214,58,48,${.08 + r() * .1})`; x.beginPath(); x.arc(r() * W * .6, r() * H, 20 + r() * 40, 0, 7); x.fill(); } });
    case 'plum': case 'fig': case 'grape': case 'blackcurrant': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(220,225,240,${r() * .35})`; x.fillRect(r() * W, r() * H, 2, 2); } });
    case 'gooseberry': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(255,255,230,.9)'; x.lineWidth = 3; for (let i = 0; i < 10; i++) { x.beginPath(); x.moveTo(i * W / 10, 0); x.lineTo(i * W / 10, H); x.stroke(); } });
    case 'pumpkin': case 'squash': case 'courgette': case 'aubergine': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); for (let i = 0; i < (kind === 'courgette' ? 900 : 300); i++) { x.fillStyle = `rgba(255,255,220,${r() * .25})`; x.fillRect(r() * W, r() * H, 2 + r() * 3, 2); } if (kind === 'pumpkin') for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(120,60,0,.12)'; x.fillRect(i * W / 10, 0, 4, H); } });
    case 'cucumber': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(255,255,230,.6)'; x.beginPath(); x.arc(r() * W, r() * H, 2.2, 0, 7); x.fill(); } for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(255,255,220,.18)'; x.fillRect(i * W / 8, 0, 8, H); } });
    case 'orange': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(0,0,0,${r() * .09})`; x.beginPath(); x.arc(r() * W, r() * H, 1.5, 0, 7); x.fill(); } });
    case 'tomato': case 'pear': case 'cherry': return T(kind, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, kind === 'pear' ? 'rgba(200,60,40,.18)' : 'rgba(255,240,120,.25)'); g.addColorStop(.3, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${kind === 'pear' ? '120,90,40' : '255,255,255'},${r() * .25})`; x.fillRect(r() * W, r() * H, 1.5, 1.5); } });
  }
  return null;
}
