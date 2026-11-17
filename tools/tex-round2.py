#!/usr/bin/env python3
"""One-off: add round-2 textures to js/textures.js (needle/strap leaves, pine/beech bark, more fruit skins)."""
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'js/textures.js'
s = open(p).read()

s = s.replace("export const LEAF_ASPECT = { oval: .55, lance: .24, heart: .95, lobed: 1.05, frilly: .9, serrate: .55, birch: .72, oak: .62, feather: .5, round: .85, strap: .1 };",
              "export const LEAF_ASPECT = { oval: .55, lance: .24, heart: .95, lobed: 1.05, frilly: .9, serrate: .55, birch: .72, oak: .62, feather: .5, round: .85, strap: .16, needle: .9, palm: 1.1, crinkle: .75, tiny: .5 };")

# needle tufts, strap blades and palmate (grape/fig) leaves
s = s.replace("    if (type === 'feather') { // carrot: finely divided fern-like leaf",
"""    if (type === 'needle') { // a tuft of pine needles fanning from one point
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
    if (type === 'feather') { // carrot: finely divided fern-like leaf""")

# profiles for the new outline types
s = s.replace("  if (type === 'oak') w *= .55 + .45 * Math.abs(Math.sin(y * Math.PI * 4.5 + .3));",
"""  if (type === 'oak') w *= .55 + .45 * Math.abs(Math.sin(y * Math.PI * 4.5 + .3));
  if (type === 'palm') { const lob = Math.abs(Math.sin(y * Math.PI * 1.5 + .2)); w = Math.sin(Math.PI * Math.pow(y, .55)) * (.45 + .55 * lob) * (1 + .05 * Math.sin(y * 70 + side)); }
  if (type === 'crinkle') w *= 1 + .05 * Math.sin(y * 40 + side * 3);
  if (type === 'tiny') w = Math.sin(Math.PI * Math.pow(y, .7));""")
s = s.replace("    const veins = type === 'frilly' ? 14 : type === 'lobed' ? 5 : type === 'oak' ? 7 : 9;",
              "    const veins = type === 'frilly' ? 14 : type === 'lobed' || type === 'palm' ? 5 : type === 'oak' ? 7 : type === 'crinkle' ? 12 : type === 'tiny' ? 3 : 9;")

# bark: scots pine (orange, flaky) and beech (smooth grey)
s = s.replace("""    const base = kind === 'oak' ? [78, 64, 50] : [92, 74, 58];""",
"""    if (kind === 'pine') { // grey-brown plates below, flaky orange above (v runs along the trunk)
      for (let y = 0; y < H; y += 2) { const k = y / H; x.fillStyle = `rgb(${Math.round(196 - 110 * k)},${Math.round(104 - 30 * k)},${Math.round(60 - 10 * k)})`; x.fillRect(0, y, W, 2); }
      for (let i = 0; i < 260; i++) { const yy = r() * H; x.fillStyle = `rgba(40,25,15,${.15 + r() * .35})`; x.fillRect(r() * W, yy, 6 + r() * 18, 2 + r() * 3); }
      return;
    }
    if (kind === 'beech') { x.fillStyle = '#8f9290'; x.fillRect(0, 0, W, H); for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '40,40,40'},${r() * .08})`; x.fillRect(r() * W, r() * H, 3 + r() * 10, 2 + r() * 4); } return; }
    const base = kind === 'oak' ? [78, 64, 50] : [92, 74, 58];""")

# fruit skins
s = s.replace("  return null;\n}", r"""  const T = (k, draw, w = 256, h = 256) => tex('fr:' + k, w, h, draw);
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
}""", 1)
open(p, 'w').write(s)
print('textures ok')
