// Zero Mile: produce symbols (DESIGN.md, round 4).
//
//   produceIcon(id, { size = 40, cls = '', label })  -> inline SVG string
//
// A flat, coloured symbol for every plant and tree in data/data.json, drawn as one
// family: simple geometric shapes on a 48-unit grid, rounded joins, two to four flat
// colours, at most one soft highlight, no gradients, shadows or ids (so any number
// can sit inline on one page). Fruit trees (apple, pear, lemon...) show their fruit;
// woodland trees show their silhouette. Unknown ids fall back by keyword, then by
// group (pass { group }), then to a neutral leaf.
//
// `label`: pass a string (or true to use a name made from the id) to get role="img"
// with an aria-label; otherwise the SVG is aria-hidden. Width and height always
// equal `size` and the viewBox is square, so nothing is ever squished.

// ---------- palette (Garden LCD tones plus the colours produce needs) ----------
const P = {
  leaf: '#23774a', leafD: '#1b5e3a', leafM: '#3f9a5c', leafL: '#8cc063', leafLL: '#b9d98a',
  red: '#d6402f', redD: '#a92c22', straw: '#d8363f', cherry: '#b8233a',
  orange: '#ec8a2a', orangeD: '#c9671c', carrot: '#e8792b', carrotD: '#c25a17',
  yellow: '#f0c53c', yellowD: '#d9a52a', butter: '#e8b23a',
  cream: '#f2e8cd', creamD: '#d9c79c', garlic: '#eedfbd', garlicD: '#b89a6a',
  bark: '#7a5638', barkL: '#a07650', tan: '#c99a62', tanD: '#9b6e3f',
  aub: '#5b3478', berry: '#8a4fb8', grape: '#6e3a8c', grapeD: '#4f2766', plum: '#4f3f8f',
  blue: '#41599f', blueD: '#2b3d75', pink: '#c8435a', beet: '#96204a',
  pot: '#c8673d', ink: '#17221a', hl: '#ffffff',
};

// ---------- helpers ----------
const r2 = (n) => Math.round(n * 100) / 100;
const tf = (x, y, a = 0, s = 1) => `translate(${r2(x)} ${r2(y)})${a ? ` rotate(${r2(a)})` : ''}${s !== 1 ? ` scale(${s})` : ''}`;

// A pointed leaf with its base at (x, y), length L, width W, angle a (0 = up).
const leaf = (x, y, L, W, a, c, rib) => {
  const w = W * 0.66;
  const body = `<path d="M0 0C${r2(w)} ${r2(-L * 0.22)} ${r2(w)} ${r2(-L * 0.72)} 0 ${-L}C${r2(-w)} ${r2(-L * 0.72)} ${r2(-w)} ${r2(-L * 0.22)} 0 0Z" fill="${c}"/>`;
  const vein = rib ? `<path d="M0 ${r2(-L * 0.08)}V${r2(-L * 0.78)}" stroke="${rib}" stroke-width="1.3" stroke-linecap="round" fill="none"/>` : '';
  return `<g transform="${tf(x, y, a)}">${body}${vein}</g>`;
};
// A rounder leaf (lettuce, spinach, basil).
const rleaf = (x, y, L, W, a, c, rib) => {
  const w = W * 0.62;
  const body = `<path d="M0 0C${r2(w * 1.1)} ${r2(-L * 0.12)} ${r2(w * 1.05)} ${r2(-L * 0.9)} 0 ${-L}C${r2(-w * 1.05)} ${r2(-L * 0.9)} ${r2(-w * 1.1)} ${r2(-L * 0.12)} 0 0Z" fill="${c}"/>`;
  const vein = rib ? `<path d="M0 ${r2(-L * 0.06)}V${r2(-L * 0.74)}" stroke="${rib}" stroke-width="1.3" stroke-linecap="round" fill="none"/>` : '';
  return `<g transform="${tf(x, y, a)}">${body}${vein}</g>`;
};
// A toothed or frilly leaf as a polygon: n teeth a side, amp = tooth depth.
const tleaf = (x, y, L, W, a, c, { n = 5, amp = 1.2, rib } = {}) => {
  const N = n * 2, R = [], Lf = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const hw = (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(t, 0.999)), 0.75) * (t > 0.6 ? 1 - (t - 0.6) * 0.6 : 1);
    const out = i % 2 && i < N ? amp : 0;
    R.push([r2(hw + out), r2(-L * t)]);
    Lf.push([r2(-(hw + out)), r2(-L * t)]);
  }
  const pts = [...R, ...Lf.reverse()].map((p) => p.join(' ')).join('L');
  const body = `<path d="M${pts}Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;
  const vein = rib ? `<path d="M0 ${r2(-L * 0.06)}V${r2(-L * 0.8)}" stroke="${rib}" stroke-width="1.3" stroke-linecap="round" fill="none"/>` : '';
  return `<g transform="${tf(x, y, a)}">${body}${vein}</g>`;
};
const circ = (cx, cy, r, c, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"${extra}/>`;
const ell = (cx, cy, rx, ry, c, a = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}"${a ? ` transform="rotate(${a} ${cx} ${cy})"` : ''}/>`;
const line = (d, c, w = 2.4) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const path = (d, c) => `<path d="${d}" fill="${c}"/>`;
// The one soft highlight.
const hl = (cx, cy, rx, ry, a = -35) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".38" transform="rotate(${a} ${cx} ${cy})"/>`;
const grp = (t, inner) => `<g transform="${t}">${inner}</g>`;
// A 5-point star (calyx, crowns).
const star = (cx, cy, R, r, c, a = -90) => {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = ((a + i * 36) * Math.PI) / 180, rad = i % 2 ? r : R;
    pts.push(`${r2(cx + rad * Math.cos(ang))} ${r2(cy + rad * Math.sin(ang))}`);
  }
  return `<path d="M${pts.join('L')}Z" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>`;
};
const roots = (x, y, c = P.creamD) => line(`M${x - 3} ${y}l-1 2.6M${x} ${y}v3M${x + 3} ${y}l1 2.6`, c, 1.4);

// Clustered drupelets (raspberry, blackberry).
const drupes = (light, dark, rows) => {
  let s = '';
  rows.forEach(([y, xs]) => xs.forEach((x) => { s += circ(x, y, 3.7, light); }));
  return s;
};
const calyx = (x, y, c, L = 8, spread = [-120, -68, 68, 120]) => spread.map((a) => leaf(x, y, L, 6.5, a, c)).join('') + circ(x, y, 2.4, c);

// Tree helpers.
const trunk = (x, top, bot, w, c = P.bark) => path(`M${x - w / 2} ${bot}L${x - w * 0.32} ${top}H${x + w * 0.32}L${x + w / 2} ${bot}Z`, c);
const blobs = (list, c) => list.map(([x, y, r]) => circ(x, y, r, c)).join('');

// ---------- drawings (48 x 48) ----------
const D = {
  tomato: () =>
    path('M24 14C34.5 14 42.5 19.5 42.5 28.5C42.5 37.5 34.5 43.5 24 43.5C13.5 43.5 5.5 37.5 5.5 28.5C5.5 19.5 13.5 14 24 14Z', P.red) +
    hl(14.5, 24, 4.2, 2.6) +
    [-118, -62, 62, 118, 180].map((a) => leaf(24, 15.5, a === 180 ? 6 : 10, 6, a, P.leaf)).join('') +
    circ(24, 15.5, 3, P.leaf) + line('M24 15V9.5Q24 8 25.5 7.5', P.leaf, 2.6),

  strawberry: () =>
    path('M24 44.5C13 39 7 28 9.5 20.5C11.5 14.5 18.5 14 24 16.5C29.5 14 36.5 14.5 38.5 20.5C41 28 35 39 24 44.5Z', P.straw) +
    [[16, 23], [24, 24], [32, 23], [12.8, 29], [20, 30], [28, 30], [35.2, 29], [16.5, 35.5], [24, 36.5], [31.5, 35.5], [24, 41.5]]
      .map(([x, y]) => ell(x, y, 0.95, 1.5, P.yellow)).join('') +
    hl(14.5, 21.5, 2.6, 1.6) +
    calyx(24, 15.5, P.leaf, 9, [-125, -70, 70, 125]) + leaf(24, 15.5, 7, 5, 0, P.leafM),

  carrot: () => grp('rotate(32 24 26)',
    path('M16.5 16.5Q24 13.5 31.5 16.5Q30.5 28 25.3 43.5Q24 46.2 22.7 43.5Q17.5 28 16.5 16.5Z', P.carrot) +
    line('M19.4 23.5h3.6M25.6 29h3M20.8 34.5h2.6', P.carrotD, 1.6) +
    leaf(24, 16, 12, 6.5, -30, P.leafM) + leaf(24, 16, 12, 6.5, 30, P.leafM) + leaf(24, 16, 14.5, 6.5, 0, P.leaf)),

  parsnip: () => grp('rotate(-30 24 26)',
    path('M15.5 16.5Q24 13 32.5 16.5Q31 28 25.3 44Q24 46.5 22.7 44Q17 28 15.5 16.5Z', P.cream) +
    line('M19 23.5h3.6M25.8 29h3M20.6 34.5h2.6', P.creamD, 1.6) +
    leaf(24, 16, 12, 6.5, -30, P.leafM) + leaf(24, 16, 12, 6.5, 30, P.leafM) + leaf(24, 16, 14.5, 6.5, 0, P.leaf)),

  apple: () =>
    path('M24 15.5C30 10.5 41.5 12.5 41.5 25C41.5 36 33.5 44.5 24 42C14.5 44.5 6.5 36 6.5 25C6.5 12.5 18 10.5 24 15.5Z', '#cf3a33') +
    hl(14.5, 22.5, 4, 2.5) + line('M24 16Q23.8 10.5 26.5 6.5', P.bark, 2.6) + leaf(26, 10.5, 11, 9, 62, P.leaf, P.leafM),

  pear: () =>
    path('M24 10C28 10 29.5 14.5 30.5 19C36.5 23 39.5 29.5 38 35.5C36.5 41.5 30.5 44.5 24 44.5C17.5 44.5 11.5 41.5 10 35.5C8.5 29.5 11.5 23 17.5 19C18.5 14.5 20 10 24 10Z', '#a3b83c') +
    hl(16, 30, 3.6, 2.4, -60) + line('M24 10.5Q24 6.5 26 4', P.bark, 2.6) + leaf(25.2, 8, 10, 8.5, 64, P.leaf, P.leafM),

  cherry: () =>
    line('M15.5 29Q17 17 27 7.5M32.5 27.5Q31.5 16 27 7.5', '#5d7a33', 2.2) +
    leaf(27, 8, 12, 9.5, 58, P.leaf, P.leafM) +
    circ(15.5, 35, 8, P.cherry) + circ(32.5, 34, 8, '#cf2e45') + hl(12.5, 32, 2.4, 1.6),

  lemon: () =>
    grp('rotate(-28 24 27)',
      path('M4.5 27Q7.5 25.6 9.6 22.6C14 15 34 15 38.4 22.6Q40.5 25.6 43.5 27Q40.5 28.4 38.4 31.4C34 39 14 39 9.6 31.4Q7.5 28.4 4.5 27Z', P.yellow) +
      hl(17, 22.6, 4.6, 2.2, 0)) +
    leaf(40.5, 18.5, 11, 8.5, 28, P.leaf, P.leafM),

  orange: () =>
    circ(24, 27.5, 16.5, P.orange) + circ(24, 12.6, 1.5, P.orangeD) +
    [[30, 34], [35, 26], [19, 37], [28, 21]].map(([x, y]) => circ(x, y, 0.75, P.orangeD)).join('') +
    hl(15.5, 21, 4, 2.6) + leaf(24.5, 12, 11, 9, 58, P.leaf, P.leafM) + leaf(23.5, 12, 8, 6.5, -48, P.leafD),

  blueberry: () =>
    leaf(25, 21, 11, 9, 40, P.leaf, P.leafM) +
    circ(16, 28, 9, P.blueD) + circ(32, 27, 8.5, P.blueD) + circ(24, 35, 9.5, P.blue) +
    star(24, 31, 3.2, 1.4, '#1f2d58') + star(16, 22, 2.4, 1.1, '#1f2d58') + star(32, 21.5, 2.3, 1, '#1f2d58') + hl(18.5, 37, 2.6, 1.6, -20),

  raspberry: () =>
    path('M10.5 21C11 33 18 41 24 44C30 41 37 33 37.5 21Z', '#a3264a') +
    drupes('#d6405f', '#a3264a', [[19.5, [17.5, 24, 30.5]], [25.5, [13.8, 20.6, 27.4, 34.2]], [31.5, [17.5, 24, 30.5]], [37.5, [20.8, 27.2]], [42, [24]]]) +
    hl(15.5, 24.5, 1.6, 1.1) + calyx(24, 15.5, P.leaf, 8, [-118, -66, 66, 118]) + line('M24 15V9', P.leaf, 2.4),

  blackberry: () =>
    path('M12 23C11 33 17 42 24 44C31 42 37 33 36 23Z', '#22132a') +
    drupes('#3d2445', '#22132a', [[21, [17.5, 24, 30.5]], [27, [14.5, 21, 27, 33.5]], [33, [17.5, 24, 30.5]], [38.8, [21, 27]], [42.4, [24]]]) +
    hl(15, 26, 1.5, 1) + calyx(24, 16.5, P.leaf, 8, [-118, -66, 66, 118]) + line('M24 16V9', P.leaf, 2.4),

  blackcurrant: () =>
    line('M8 9Q22 9 34 33', '#5d7a33', 2) +
    line('M15 10.5Q15 14 14 16M21.5 13.5Q22.5 18 21 22M27.5 20Q29.5 23 28 27.5', '#5d7a33', 1.5) +
    leaf(9, 9.5, 13, 10, -58, P.leaf, P.leafM) +
    circ(13.5, 20.5, 5.4, '#2a1f36') + circ(21, 27, 5.8, '#2a1f36') + circ(29, 32.5, 6, '#3a2a48') + circ(36, 38, 5.6, '#2a1f36') +
    hl(19, 25, 1.8, 1.2),

  gooseberry: () =>
    ell(30, 31, 10, 11.5, '#b6d36a') + ell(20, 28, 13, 14.5, '#93be4d') +
    line('M20 14.5C14 20 14 36 20 41.5M20 14.5C26 20 26 36 20 41.5M20 14.5V41.5', '#d8eaa4', 1.3) +
    hl(13.5, 22, 2.4, 1.5) + line('M20 14V9.5', P.bark, 2) + line('M20 42v2.8', P.bark, 1.6),

  grape: () =>
    line('M24 11V4.5', P.bark, 2.4) + leaf(25, 8, 14, 12, 62, P.leaf, P.leafM) +
    [[14, [12, 20, 28, 36]], [21.5, [16, 24, 32]], [29, [20, 28]], [36.5, [24]]]
      .map(([y, xs]) => xs.map((x) => circ(x, y, 4.6, P.grape, ` stroke="${P.grapeD}" stroke-width="1"`)).join('')).join('') +
    hl(10.6, 12.4, 1.5, 1),

  fig: () =>
    path('M24 12C27 12 28 15.5 29.5 18.5C37 22 41 28.5 39.5 35C38 41.5 31.5 44.5 24 44.5C16.5 44.5 10 41.5 8.5 35C7 28.5 11 22 18.5 18.5C20 15.5 21 12 24 12Z', '#7a4560') +
    line('M24 14C19 22 18 33 21 42M24 14C29 22 30 33 27 42', '#5e3249', 1.3) +
    hl(14.5, 29, 3.2, 2, -70) + line('M24 12.5V8Q24 6.5 26 6', P.leaf, 2.6),

  plum: () =>
    ell(24, 28, 15, 16, P.plum) + line('M24 13.5Q30 25 25 43', '#3a2e6d', 1.5) +
    hl(16, 23, 3.6, 2.4) + line('M24 13Q24 8.5 26.5 6', P.bark, 2.4) + leaf(25.5, 9, 11, 9, 62, P.leaf, P.leafM),

  peach: () =>
    circ(24, 28.5, 16, '#f4a86d') + path('M24 13C35 13 40 21 40 28.5C40 37.5 33 44.5 24 44.5C29 39 30 22 24 13Z', '#e6704f') +
    line('M24 13.5Q19 28 23 44', '#d0603f', 1.4) + hl(14.5, 24, 3.6, 2.4) +
    line('M24 13.5V9', P.bark, 2.4) + leaf(24.5, 10, 11, 9, 58, P.leaf, P.leafM),

  potato: () =>
    path('M9 24C8.5 15.5 18.5 11.5 27 12C37 12.5 42.5 18.5 41.5 27C40.5 35.5 33 39.5 24.5 38.5C15.5 38 9.5 32 9 24Z', P.tan) +
    ell(18, 20, 1.8, 1.1, P.tanD, -20) + ell(31.5, 18.5, 1.6, 1, P.tanD, 15) + ell(34.5, 29.5, 1.8, 1.1, P.tanD, -30) + ell(21, 31.5, 1.6, 1, P.tanD, 10) +
    hl(16, 25.5, 2.8, 1.8, -50),

  'sweet-potato': () => grp('rotate(-24 24 26)',
    path('M3.5 26.5C9.5 19.5 19.5 16.5 28 17.5C36 18.5 42 21.5 44.5 25C41.5 30.5 34 34.5 25 34.5C16 34.5 8.5 32 3.5 26.5Z', '#b65a48') +
    line('M15 21.5q1.5 2 0 4.5M27 19.5q1.6 2.4 0 5M34.5 22q1.2 2 0 4', '#8f4235', 1.3) +
    hl(20, 22.5, 4, 1.5, -6)),

  onion: () =>
    path('M24 9.5C26 16 40 20 40 30C40 38.5 32.5 43.5 24 43.5C15.5 43.5 8 38.5 8 30C8 20 22 16 24 9.5Z', '#c4703c') +
    line('M24 15C18 22 16.5 33 20 42.5M24 15C30 22 31.5 33 28 42.5', '#a0532a', 1.4) +
    hl(13.5, 28, 2.4, 4, 15) + line('M24 10.5V5.5', '#9a6a3a', 2) + roots(24, 44),

  garlic: () =>
    path('M24 9C25 16 38.5 21 39.5 31C40.5 39 32 42.5 24 42.5C16 42.5 7.5 39 8.5 31C9.5 21 23 16 24 9Z', P.garlic) +
    line('M24 14C20.5 22 20 33 22 42M24 14C27.5 22 28 33 26 42M24 16C15 23 13 33 16.5 41M24 16C33 23 35 33 31.5 41', P.garlicD, 1.5) +
    line('M24 14C20.5 22 20 33 22 42M24 16C33 23 35 33 31.5 41', '#a8668a', 1.6) + hl(14, 31, 1.8, 3.4, 15) + line('M24 9.5V5', P.garlicD, 2.4) + roots(24, 43, P.garlicD),

  'spring-onion': () =>
    line('M17 36Q14 22 9 6M24 37V5M31 36Q34 22 39 7', P.leafM, 4) +
    line('M24 37V5', P.leaf, 4) +
    ell(17, 38, 3.6, 4.6, P.cream) + ell(24, 39, 3.8, 4.8, '#f7f1df') + ell(31, 38, 3.6, 4.6, P.cream) +
    line('M17 38.5V31M24 39.5V32M31 38.5V31', P.leafLL, 2) + roots(24, 44),

  leek: () => grp('rotate(-22 24 26)',
    leaf(24, 22, 19, 13, -30, P.leaf) + leaf(24, 22, 20, 12, 22, P.leafD) + leaf(24, 22, 16, 9, -2, '#2f6b45') +
    path('M18.5 19H29.5V41Q29.5 44 24 44Q18.5 44 18.5 41Z', '#f1e9cf') +
    path('M18.5 19H29.5V28H18.5Z', '#b8d27a') + line('M22 21v19', '#ddd2b2', 1.2) + roots(24, 44.5)),

  peas: () =>
    path('M5 31C12 21 29 13 43 15C41 25 27 36 5 31Z', P.leafD) +
    [[13.2, 27.4], [20.2, 24.4], [27.2, 21.6], [34.4, 19.2]].map(([x, y]) => circ(x, y, 4.3, P.leafL)).join('') +
    path('M5 31C13 36 31 31 43 15C41 28 27 39 11 36.5Q7 35 5 31Z', P.leaf) +
    hl(19, 23, 1.5, 1) + line('M43 15Q46.5 11 44 7.5', P.leaf, 2),

  'green-beans': () =>
    line('M9 9C14 21 21 33 35 41', P.leafD, 5.2) + line('M16 6C22 18 28 29 41 34', P.leaf, 5.2) + line('M5 15C10 27 16 37 28 44', P.leafM, 5.2) +
    line('M35 41l3 1M41 34l3 .4M28 44l2.6 1.4', P.leafD, 1.6),

  'broad-beans': () =>
    path('M6 36C5 25 27 9 40 10.5C45.5 11.5 44 19 37 25.5C28.5 33.5 13 43 6 36Z', '#79ad55') +
    path('M10.5 34C11 27 27 15 38 14C40.5 15 39 19.5 34 23.5C26.5 29.5 15.5 37.5 10.5 34Z', '#a9cf78') +
    ell(15.5, 31, 4.6, 3.3, '#d9eab0', -36) + ell(23.5, 25, 4.6, 3.3, '#d9eab0', -36) + ell(31.5, 19.5, 4.4, 3.2, '#d9eab0', -36) +
    line('M40 10.5Q43 7 41 4', P.leaf, 2),

  broccoli: () =>
    path('M19.5 44L21 31.5L16.5 27H19.5L24 30L28.5 27H31.5L27 31.5L28.5 44Q24 45.5 19.5 44Z', '#9cc35a') +
    blobs([[13.5, 24, 7.5], [34.5, 24, 7.5]], P.leafD) +
    blobs([[18.5, 18, 8.5], [29.5, 18, 8.5], [24, 25, 8.5], [15, 27, 5], [33, 27, 5]], '#2f7d45') +
    hl(17, 14.5, 2.4, 1.6),

  cauliflower: () =>
    leaf(24, 42, 24, 20, -58, P.leaf, P.leafM) + leaf(24, 42, 24, 20, 58, P.leaf, P.leafM) +
    blobs([[15.5, 25, 7], [32.5, 25, 7]], P.creamD) +
    blobs([[18, 20, 7.5], [30, 20, 7.5], [24, 16, 7], [24, 26, 8], [14.5, 28, 4.6], [33.5, 28, 4.6]], P.cream) +
    path('M9 31C14 40 34 40 39 31C36 39 30 42.5 24 42.5C18 42.5 12 39 9 31Z', P.leafM),

  cabbage: () =>
    leaf(24, 43, 24, 26, -52, P.leafD) + leaf(24, 43, 24, 26, 52, P.leafD) +
    circ(24, 26, 14, '#a9cf7a') +
    line('M24 39V15M24 33L16 25M24 29L32 21.5M24 35L33.5 29', '#6aa556', 1.4) +
    path('M9.5 30C13 42.5 35 42.5 38.5 30C33 37.5 15 37.5 9.5 30Z', '#5c9a4a') + hl(17, 19.5, 2.8, 1.8),

  'brussels-sprouts': () =>
    [[15, 30, 10, '#4f8f45', '#86b85c'], [33, 29, 10, '#4f8f45', '#86b85c'], [24, 18, 11, '#5c9a4a', '#9cc86c']].map(([x, y, r, c, l]) =>
      circ(x, y, r, c) +
      path(`M${x - r} ${y + 1}C${x - r * 0.6} ${y + r * 1.05} ${x + r * 0.6} ${y + r * 1.05} ${x + r} ${y + 1}C${x + r * 0.4} ${y + r * 0.55} ${x - r * 0.4} ${y + r * 0.55} ${x - r} ${y + 1}Z`, l) +
      line(`M${x} ${y + r * 0.62}V${y - r * 0.55}`, l, 1.4)).join('') +
    hl(19.5, 12.5, 2.6, 1.6),

  lettuce: () =>
    rleaf(24, 42, 26, 21, -52, '#5f9e3f') + rleaf(24, 42, 26, 21, 52, '#5f9e3f') +
    rleaf(24, 42, 31, 22, -22, '#79b44d', '#a9d27a') + rleaf(24, 42, 31, 22, 22, '#79b44d', '#a9d27a') +
    rleaf(24, 42, 25, 17, 0, '#b4d97c', '#d9ecb0') + path('M19 40H29L27 44H21Z', '#e3efc0'),

  kale: () =>
    line('M24 46V36', '#6f9a7d', 3) +
    tleaf(24, 38, 33, 22, -10, '#2f6b4f', { n: 9, amp: 2.1, rib: '#7fa98b' }) +
    tleaf(17, 41, 22, 15, -42, '#3f7d5e', { n: 6, amp: 1.8, rib: '#8fb59a' }),

  spinach: () =>
    rleaf(18, 43, 30, 21, -24, P.leaf, P.leafM) + rleaf(30, 43, 27, 19, 26, '#2f8a4f', '#5fb07a') + line('M18 46v-3M30 46v-3', P.leafM, 2),

  'swiss-chard': () =>
    rleaf(30, 41, 28, 19, 22, '#2f6b45') + line('M30 46V41L36 22', P.butter, 3.2) +
    rleaf(19, 41, 32, 22, -16, P.leaf) + line('M19 46V41L13.5 18', P.redD, 3.4),

  rocket: () =>
    line('M24 46V9', '#4f8a48', 2.2) +
    [[38, 7, 5], [31, 8.5, 6.5], [24, 10, 8], [17, 11, 9.5]].map(([y, L, W]) =>
      leaf(24, y, L, W, -62, '#3f8a48') + leaf(24, y + 2.5, L, W, 62, '#3f8a48')).join('') +
    rleaf(24, 13, 11, 10, 0, '#3f8a48'),

  'pak-choi': () =>
    rleaf(15, 29, 21, 16, -24, '#2f7d45') + rleaf(33, 29, 21, 16, 24, '#2f7d45') + rleaf(24, 27, 24, 17, 0, P.leaf) +
    line('M21 44Q16 36 15.5 27M27 44Q32 36 32.5 27', '#e6efcf', 5) + line('M24 44V22', '#f4f6e4', 5.4) +
    line('M24 21V9M15.5 26L11 12M32.5 26L37 12', '#7fb48c', 1.3),

  beetroot: () =>
    rleaf(22, 19, 17, 12, -26, P.leaf) + rleaf(26, 19, 17, 12, 26, P.leafD) +
    line('M22 19L15 6M26 19L33 6', '#b0305a', 1.6) +
    path('M24 18.5C34 18.5 40 24.5 39 31.5C38 38 30.5 40.5 25.5 44Q24 45.5 22.5 44C17.5 40.5 10 38 9 31.5C8 24.5 14 18.5 24 18.5Z', P.beet) +
    line('M24 44.5Q25 46.5 27.5 47', P.beet, 1.4) + hl(15.5, 26.5, 3, 2),

  radish: () =>
    rleaf(24, 21, 16, 10, -34, P.leafM) + rleaf(24, 21, 16, 10, 34, P.leafM) + rleaf(24, 21, 18, 11, 0, P.leaf) +
    path('M24 20C33 20 38 26 37 32C36 37 30 40 24 42C18 40 12 37 11 32C10 26 15 20 24 20Z', '#d8405a') +
    path('M14.5 37.5C18 40.5 21 41.5 24 42C27 41.5 30 40.5 33.5 37.5C31 41.5 27.5 43.5 24 44C20.5 43.5 17 41.5 14.5 37.5Z', '#f7e8e6') +
    line('M24 44v3.4', P.creamD, 1.4) + hl(16.5, 26.5, 2.8, 1.8),

  turnip: () =>
    rleaf(24, 19, 15, 11, -30, P.leafM) + rleaf(24, 19, 15, 11, 30, P.leafM) + rleaf(24, 19, 17, 11, 0, P.leaf) +
    path('M24 18C34 18 40 24 39.5 31C39 37.5 31 40.5 25.5 43.5Q24 44.5 22.5 43.5C17 40.5 9 37.5 8.5 31C8 24 14 18 24 18Z', '#f4ecd8') +
    path('M8.6 29.5C9.5 22.5 15 18 24 18C33 18 38.5 22.5 39.4 29.5C33 26 15 26 8.6 29.5Z', P.berry) +
    line('M24 44v3', P.creamD, 1.4) + hl(15, 33, 2.6, 1.6, -60),

  cucumber: () => grp('rotate(-38 24 24)',
    `<rect x="4" y="17" width="40" height="14" rx="7" fill="#2f7a3f"/>` +
    [[11, 21], [17, 27], [23, 21.5], [29, 26.5], [35, 21.5], [14, 24], [26, 24.5], [38, 26]].map(([x, y]) => circ(x, y, 0.9, '#7fb86a')).join('') +
    hl(22, 20, 8, 1.4, 0) + `<rect x="41" y="22" width="4.5" height="4" rx="2" fill="#5e8f3a"/>`),

  courgette: () => grp('rotate(36 24 24)',
    path('M5 24C5 19 9 17.5 14 17.5H38C42 17.5 44.5 20 44.5 24C44.5 28 42 30.5 38 30.5H14C9 30.5 5 29 5 24Z', '#3c7d3a') +
    line('M12 21.5H38M14 26.5H40', '#6aa84f', 1.3) +
    star(5.5, 24, 6.5, 2.6, P.butter, 0) + circ(5.5, 24, 1.8, P.yellowD) +
    path('M44 21.5L47.5 22.5V25.5L44 26.5Z', '#5e8f3a')),

  pumpkin: () =>
    ell(13.5, 30, 9, 12.5, P.orangeD) + ell(34.5, 30, 9, 12.5, P.orangeD) +
    ell(18.5, 30, 9, 13.5, P.orange) + ell(29.5, 30, 9, 13.5, P.orange) + ell(24, 30, 7.5, 14, '#f39a3c') +
    path('M21.5 17.5L22.5 10Q25.5 8.5 27.5 10.5L26.5 17.5Z', '#6b7a32') + line('M27 12Q32 10 33 14', P.leafM, 1.6) +
    hl(16, 24, 2.4, 3.6, 10),

  'butternut-squash': () => grp('rotate(-16 24 26)',
    path('M19 13C19 9.5 21 8 24 8C27 8 29 9.5 29 13L29.6 21.5C36.5 24.5 39.5 30.5 38.5 36.5C37.5 42.5 31 45.5 24 45.5C17 45.5 10.5 42.5 9.5 36.5C8.5 30.5 11.5 24.5 18.4 21.5Z', '#e8b56b') +
    ell(24, 36, 9, 6.5, '#e09a4c') + hl(21.5, 15, 1.4, 4, 0) + path('M22 8.6L22.5 4.5H25.5L26 8.6Z', '#7a8a3a')),

  melon: () =>
    path('M3.5 19A20.5 21 0 0 0 44.5 19Z', '#a2b04a') +
    line('M8 31Q24 38.5 40 31M13.5 37.5Q24 42 34.5 37.5', '#879537', 1.4) +
    ell(24, 19, 20.5, 8.5, '#f2a35e') + ell(24, 19, 16, 6.4, '#f7c27e') + ell(24, 19, 8.6, 3.6, '#e6d6a6') +
    [[19.5, 19], [22.5, 18], [25.5, 18], [28.5, 19], [24, 20.4]].map(([x, y]) => ell(x, y, 0.95, 0.65, '#b98f55')).join(''),

  watermelon: () =>
    path('M3 14A21 21 0 0 0 45 14Z', '#2f7d45') + path('M6.4 14A17.6 17.6 0 0 0 41.6 14Z', '#e8efd0') + path('M8.6 14A15.4 15.4 0 0 0 39.4 14Z', '#e0484f') +
    [[15.5, 19.5, -30], [24, 23.5, 0], [32.5, 19.5, 30], [19.5, 26.5, -15], [28.5, 26.5, 15]].map(([x, y, a]) => ell(x, y, 1.1, 1.9, P.ink, a)).join('') +
    hl(14, 16.4, 2.6, 1.3, 20),

  pepper: () =>
    path('M11.5 21C11.5 15.5 16.5 13.5 20 15.5C22 13.5 26 13.5 28 15.5C31.5 13.5 36.5 15.5 36.5 21C38.5 29 37.5 37.5 33.5 42.5C31.5 44.5 28.5 43.5 26.5 41.5C25.5 43.5 22.5 43.5 21.5 41.5C19.5 43.5 16.5 44.5 14.5 42.5C10.5 37.5 9.5 29 11.5 21Z', '#cf3a2c') +
    line('M20 18C19 26 19 34 21.5 41M28 18C29 26 29 34 26.5 41', P.redD, 1.4) +
    hl(15.5, 24, 1.8, 4, 8) + ell(24, 15.5, 6.5, 2.6, P.leafD) + line('M24 15Q24 9 28.5 6', P.leaf, 3.6),

  chilli: () =>
    path('M15 12C21 13.5 22.5 18.5 24.5 24.5C27.5 32.5 33 38.5 41.5 42C31 45 20.5 39 16.5 30.5C13.5 24.5 12.5 18 15 12Z', '#d2342b') +
    hl(17.5, 22, 1.2, 4.5, -18) +
    path('M10 12.5C12 9 18 9 20 12.5C18 15.5 12 15.5 10 12.5Z', P.leaf) + line('M15 10.5Q14 6.5 17.5 3.8', P.leaf, 2.4),

  aubergine: () =>
    path('M19 15C26 12 32.5 16 36.5 24C41.5 33.5 40 42.5 32 44.5C24 46.5 15.5 41.5 13.5 32.5C12 24.5 13 17.5 19 15Z', P.aub) +
    hl(19.5, 27, 1.8, 6, -20) +
    path('M12.5 19.5L16.5 11.5L20 15.5L24 9L27 15.5L31.5 12L30.5 20C26 17 18 19.5 12.5 19.5Z', P.leaf) +
    line('M23.5 11Q22.5 6 26 3.5', P.leaf, 3),

  sweetcorn: () =>
    path('M24 5.5C30 5.5 32.5 15.5 32.5 26C32.5 36.5 29.5 42 24 42C18.5 42 15.5 36.5 15.5 26C15.5 15.5 18 5.5 24 5.5Z', P.yellow) +
    Array.from({ length: 7 }, (_, i) => [19.8, 24, 28.2].map((x) => circ(x, 11 + i * 4, 1.3, P.yellowD)).join('')).join('') +
    path('M24 46C13 42.5 9 30 12.5 15C15 26 19 36.5 24 46Z', P.leafM) + path('M24 46C35 42.5 39 30 35.5 15C33 26 29 36.5 24 46Z', P.leaf),

  celery: () =>
    line('M17 45L14 17M22 45.5L21 14M27 45.5L28 14M31.5 45L35 17', '#a6c96a', 4.4) +
    line('M22 45.5L21 14M27 45.5L28 14', '#c3dc8e', 4.4) +
    [[14, 16], [21, 13], [28, 13], [35, 16]].map(([x, y], i) =>
      leaf(x, y, 9, 7, -30 + i * 20, P.leafM) + leaf(x, y, 8, 6, (-30 + i * 20) + 40, P.leaf)).join(''),

  asparagus: () =>
    line('M15 45L18 13M24 45.5V10M33 45L30 13', '#6fa043', 4.4) +
    [[18, 13, -5], [24, 10, 0], [30, 13, 5]].map(([x, y, a]) => leaf(x, y + 4, 9, 6, a, '#557a32')).join('') +
    line('M16.2 28l-2 -1.6M25.6 25l2 -1.6M31.4 30l2 -1.6', '#557a32', 1.3) +
    `<rect x="12" y="34" width="24" height="4.6" rx="2.3" fill="${P.pot}"/>`,

  rhubarb: () =>
    line('M19 45L21 23M26 45.5L25 21M32 44.5L29 24', '#c8435a', 4.6) + line('M26 45.5L25 21', '#de6a7f', 4.6) +
    tleaf(25, 23, 21, 30, 0, '#3f8a48', { n: 6, amp: 1.6, rib: '#7fb07a' }),

  sunflower: () =>
    Array.from({ length: 12 }, (_, i) => leaf(24, 24, 20, 8, i * 30, i % 2 ? P.butter : P.yellow)).join('') +
    circ(24, 24, 8.5, P.bark) + circ(24, 24, 5.5, '#5c3d24') + hl(21, 21, 1.6, 1),

  // ---------- herbs ----------
  basil: () =>
    line('M24 46V16', P.leafM, 2.4) +
    rleaf(24, 38, 15, 13, -62, '#3f9b4f', '#7cc282') + rleaf(24, 38, 15, 13, 62, '#3f9b4f', '#7cc282') +
    rleaf(24, 28, 13, 11.5, -40, '#4fae5c', '#8fd292') + rleaf(24, 28, 13, 11.5, 40, '#4fae5c', '#8fd292') +
    rleaf(24, 20, 12, 10, 0, '#62bd6c', '#a2dca2'),

  mint: () =>
    line('M24 46V12', '#5c8f5a', 2.2) +
    tleaf(24, 39, 14, 10, -70, '#4fb07a', { n: 5, amp: 1, rib: '#9fd8b2' }) + tleaf(24, 39, 14, 10, 70, '#4fb07a', { n: 5, amp: 1, rib: '#9fd8b2' }) +
    tleaf(24, 29, 12.5, 9, -55, '#5cbf86', { n: 4, amp: 1, rib: '#a8e0bb' }) + tleaf(24, 29, 12.5, 9, 55, '#5cbf86', { n: 4, amp: 1, rib: '#a8e0bb' }) +
    tleaf(24, 19, 10, 7, -25, '#6fca94', { n: 3, amp: 0.9 }) + tleaf(24, 19, 10, 7, 25, '#6fca94', { n: 3, amp: 0.9 }),

  parsley: () =>
    line('M24 46L14 22M24 46V14M24 46L34 22', '#4f8a3a', 2) +
    [[14, 22, -24], [24, 14, 0], [34, 22, 24]].map(([x, y, a]) =>
      tleaf(x, y + 1, 9, 7, a - 46, '#2f7d3c', { n: 3, amp: 1.2 }) + tleaf(x, y + 1, 9, 7, a + 46, '#2f7d3c', { n: 3, amp: 1.2 }) + tleaf(x, y + 1, 11, 7.5, a, '#2f7d3c', { n: 3, amp: 1.2 })).join(''),

  coriander: () =>
    line('M24 46L14 24M24 46V15M24 46L34 24', '#7aa84a', 1.8) +
    [[14, 24], [24, 15], [34, 24]].map(([x, y]) => blobs([[x - 3.6, y - 1.4, 3.8], [x + 3.6, y - 1.4, 3.8], [x, y - 5, 4]], '#5aa64a')).join('') +
    blobs([[17, 35, 3], [31, 35, 3]], '#5aa64a'),

  chives: () =>
    line('M18 46L12 10M22 46L20 6M26 46L28 8M30 46L36 12M20 46L15 18M28 46L33 20', P.leafM, 2.4) +
    line('M22 46L20 6M26 46L28 8', P.leaf, 2.4) +
    circ(20, 7, 5, '#a46ac8') + circ(28, 9, 4.2, '#b682d6') +
    [[18, 5], [21.5, 4.5], [22, 8.5], [18, 9]].map(([x, y]) => circ(x, y, 0.9, '#7c45a3')).join(''),

  rosemary: () =>
    line('M14 45Q22 26 34 6', P.barkL, 2) + line('M30 45Q30 34 37 24', P.barkL, 1.8) +
    Array.from({ length: 9 }, (_, i) => {
      const t = i / 8, x = 14 + 20 * t - 2 * Math.sin(Math.PI * t), y = 45 - 39 * t, L = 7 - t * 2.2;
      const a = -28 + t * 6;
      return leaf(x, y, L, 2.6, a - 52, '#4f7a5f') + leaf(x, y, L, 2.6, a + 52, '#5e8a6c');
    }).join('') +
    Array.from({ length: 4 }, (_, i) => { const x = 30.5 + i * 1.8, y = 41 - i * 4.5; return leaf(x, y, 5.5, 2.4, -20, '#4f7a5f') + leaf(x, y, 5.5, 2.4, 70, '#5e8a6c'); }).join(''),

  thyme: () =>
    line('M24 46Q22 30 14 12M24 46Q25 28 30 8M24 46Q28 36 38 26', '#8a6a48', 1.6) +
    [[16.5, 18], [18.5, 24], [20.5, 30], [22.2, 36], [14.6, 14], [28.8, 14], [27.8, 20], [26.6, 27], [25.6, 34], [29.8, 9.8], [33.5, 30.5], [30, 33.5], [36.5, 27.4]]
      .map(([x, y], i) => ell(x - 2, y, 1.9, 1.3, i % 2 ? '#6f9a5a' : '#5e8a4c', -30) + ell(x + 2, y + 0.6, 1.9, 1.3, i % 2 ? '#5e8a4c' : '#6f9a5a', 30)).join(''),

  sage: () =>
    line('M24 46V38', '#7f9a7c', 2.6) +
    rleaf(23, 40, 24, 12, -42, '#8faa8c', '#c5d6c2') + rleaf(25, 40, 24, 12, 42, '#8faa8c', '#c5d6c2') +
    rleaf(24, 40, 33, 13.5, 0, '#a2bb9e', '#d5e2d2'),

  dill: () =>
    line('M24 46V16', '#5a9a6a', 1.8) +
    line('M24 38L13 30M24 38L35 30M24 30L15 23M24 30L33 23M13 30l-3 -5M13 30l-4 1M35 30l3 -5M35 30l4 1M15 23l-3 -4M33 23l3 -4', '#5a9a6a', 1.3) +
    line('M24 16L15 9M24 16L19.5 6.5M24 16V5.5M24 16L28.5 6.5M24 16L33 9', '#7aa84a', 1.2) +
    [[15, 9], [19.5, 6.5], [24, 5.5], [28.5, 6.5], [33, 9]].map(([x, y]) => circ(x, y, 2.2, P.butter)).join(''),

  // ---------- trees (silhouettes) ----------
  oak: () =>
    path('M21 45L22 32L17 27.5L19 26L24 29.5L29 26L31 27.5L26 32L27 45Z', P.bark) +
    blobs([[12, 22, 7.5], [36, 22, 7.5], [17, 14, 8], [31, 14, 8], [24, 10, 8]], '#2f6a33') +
    blobs([[16, 23, 8], [32, 23, 8], [24, 18, 10], [20, 28, 6], [28, 28, 6]], '#3f7d3c') + hl(19, 11.5, 2.6, 1.6),

  birch: () =>
    line('M24 22L16 15M24 28L32 20M24 17L29 10', '#d9d0bd', 1.4) +
    blobs([[15, 17, 6], [33, 20, 6.5], [24, 10, 7], [17, 26, 5], [31, 28, 4.6], [28, 12, 5]], '#86bb52') +
    blobs([[14, 15, 3.6], [24, 7.5, 4], [33, 18, 3.6]], '#9ccb64') +
    path('M22 45.5L22.6 12H25.4L26 45.5Z', '#efe9dc') + line('M22.2 45.5L22.7 12M25.8 45.5L25.3 12', '#b3a78f', 0.9) +
    line('M22.8 19h1.8M24.3 26h1.6M22.7 33h2M24.2 40h1.5', '#2c2a26', 1.6),

  rowan: () =>
    trunk(24, 26, 45, 4.2) + ell(24, 18, 12, 14.5, '#4f8a3a') + ell(20, 16, 6, 9, '#5f9a48', -10) +
    [[17, 13], [30, 18], [21, 25]].map(([x, y]) => circ(x, y, 1.9, '#e0562f') + circ(x + 2.6, y + 1, 1.9, '#e0562f') + circ(x + 0.8, y + 3, 1.9, '#c8432a')).join(''),

  'scots-pine': () =>
    path('M22.5 45L23 18H25L25.5 45Z', '#b5653a') + line('M24 24L16 17M24 20L31 13M24 29L33 24', '#b5653a', 1.6) +
    ell(15.5, 15, 8.5, 4.5, '#2f5e3a') + ell(30, 11, 8.5, 4.6, '#2f5e3a') + ell(32.5, 22.5, 7, 4, '#3a6e46') + ell(22, 8, 6, 3.6, '#3a6e46'),

  beech: () =>
    path('M21.8 45.5L22.6 29L17 23.5L19 22.5L24 26.5L29 22.5L31 23.5L25.4 29L26.2 45.5Z', '#8b8a80') +
    path('M24 3C35.5 3 42.5 11 42.5 19.5C42.5 23 41 25 38.5 25.5C37.5 28 34.5 29 32 27.5C30 30 26.5 30.5 24 28.5C21.5 30.5 18 30 16 27.5C13.5 29 10.5 28 9.5 25.5C7 25 5.5 23 5.5 19.5C5.5 11 12.5 3 24 3Z', '#5a8f3a') +
    path('M24 3C35.5 3 42.5 11 42.5 19.5C42.5 23 41 25 38.5 25.5C37.5 28 34.5 29 32 27.5C30 30 26.5 30.5 24 28.5C31 24 33 11 24 3Z', '#4a7d30') + hl(15.5, 11.5, 3.6, 2.2),

  hazel: () =>
    line('M24 45L18 26M24 45V24M24 45L31 26', P.bark, 2.6) +
    blobs([[13, 23, 8], [35, 23, 8], [24, 16, 10], [18, 15, 7], [30, 15, 7], [24, 26, 7]], '#5f9a44') +
    [[16, 22], [31, 20], [24, 13]].map(([x, y]) => ell(x, y, 1.8, 2.2, '#a0703f') + ell(x + 2.6, y + 0.6, 1.8, 2.2, '#8a5d33')).join(''),

  hawthorn: () =>
    path('M22.5 45.5Q22.5 37 17 30L19.2 28.8Q23 32.5 24.6 35Q26.5 30 30.5 27L32 28.6Q27.2 33 26.8 45.5Z', P.bark) +
    blobs([[12, 21, 7.5], [36, 21, 7.5], [18, 13.5, 8], [30, 13.5, 8], [24, 22, 9], [16, 26, 5.5], [32, 26, 5.5]], '#4a8a40') +
    [[11, 19], [17, 11.5], [25.5, 10], [32.5, 14], [37, 22.5], [21.5, 19.5], [29, 21], [15.5, 26.5], [24.5, 27]].map(([x, y]) => circ(x, y, 1.8, '#fffaf0')).join(''),

  holly: () =>
    trunk(24, 39, 46, 4) +
    path('M24 3L29 12L27 12.5L33 22L30.5 22.5L37 33L34 33.5L38 40H10L14 33.5L11 33L17.5 22.5L15 22L21 12.5L19 12Z', '#1f5a3a') +
    [[22, 15], [28, 24], [18, 28], [31, 35], [21, 36], [25, 30]].map(([x, y]) => circ(x, y, 1.9, '#c8312c')).join(''),

  alder: () =>
    trunk(24, 30, 45, 3.8) + path('M24 3C32 9 34.5 18 33.5 26C32.5 32 28.5 34 24 34C19.5 34 15.5 32 14.5 26C13.5 18 16 9 24 3Z', '#3f7a4a') +
    path('M24 3C29 9 30 18 29.5 25C29 30 27 33.5 24 34C19.5 34 15.5 32 14.5 26C13.5 18 16 9 24 3Z', '#4a8a55') +
    [[20, 14], [27, 20], [21, 26], [27, 29]].map(([x, y]) => ell(x, y, 1.3, 2, '#5a3a2a')).join(''),

  'red-maple': () =>
    path('M21.5 45L22.5 30L18 26L20 25L24 28L28 25L30 26L25.5 30L26.5 45Z', P.bark) +
    blobs([[13, 21, 8], [35, 21, 8], [24, 12, 9.5], [17, 13, 7], [31, 13, 7]], '#a8321f') +
    blobs([[17, 22, 8], [31, 22, 8], [24, 19, 9.5], [24, 27, 6]], '#cf4a2e') + hl(18.5, 15, 2.4, 1.5),

  'golden-wattle': () =>
    line('M24 45L24 30M24 34L18 28M24 32L30 27', P.bark, 2.6) +
    blobs([[14, 21, 8.5], [34, 21, 8.5], [24, 14, 10], [24, 25, 7.5]], '#6a9a3a') +
    [[12, 18], [17, 13], [24, 9], [31, 13], [36, 18], [20, 21], [28, 20], [15, 25], [33, 25], [24, 27], [24, 16]].map(([x, y]) => circ(x, y, 2.1, P.yellow)).join(''),

  schima: () =>
    trunk(24, 30, 45, 4.2) +
    ell(24, 28, 17, 6.5, '#245a3a') + ell(24, 19, 14, 6.5, '#2f6b45') + ell(24, 10.5, 9, 5.5, '#3a7d52') +
    [[15, 27], [31, 28], [20, 18], [30, 18.5], [24, 9.5], [24, 29]].map(([x, y]) => circ(x, y, 1.9, '#fbf3dc')).join(''),
};

// Ids that share a drawing with another id (or a near spelling).
const ALIAS = {
  'apple-tree': 'apple', 'pear-tree': 'pear', 'cherry-tree': 'cherry', 'plum-tree': 'plum', 'fig-tree': 'fig',
  pea: 'peas', 'sugar-snap': 'peas', 'mangetout': 'peas', bean: 'green-beans', 'runner-beans': 'green-beans', 'french-beans': 'green-beans',
  'sweet-pepper': 'pepper', 'bell-pepper': 'pepper', chili: 'chilli', zucchini: 'courgette', eggplant: 'aubergine', corn: 'sweetcorn',
  squash: 'butternut-squash', grapes: 'grape', beet: 'beetroot', chard: 'swiss-chard', arugula: 'rocket', scallion: 'spring-onion',
  cilantro: 'coriander', pine: 'scots-pine', maple: 'red-maple', currant: 'blackcurrant', 'red-currant': 'blackcurrant',
};

// ---------- fallbacks ----------
const FB = {
  veg: () => rleaf(24, 30, 18, 14, -38, P.leafM, P.leafLL) + rleaf(24, 30, 20, 15, 34, P.leaf, P.leafM) +
    path('M15 30H33Q33 42 24 44Q15 42 15 30Z', P.pot) + hl(19, 34, 1.4, 2.6, 0),
  fruit: () => circ(24, 28, 15.5, P.pot) + hl(16, 22, 3.6, 2.4) + line('M24 13V8', P.bark, 2.4) + leaf(24.5, 10, 11, 9, 58, P.leaf, P.leafM),
  herb: () => line('M24 46V12', P.leafM, 2.2) + [38, 29, 20].map((y, i) => leaf(24, y, 13 - i * 2, 8 - i, -58 + i * 12, P.leaf) + leaf(24, y, 13 - i * 2, 8 - i, 58 - i * 12, P.leafM)).join('') + leaf(24, 13, 8, 6, 0, P.leaf),
  tree: () => trunk(24, 28, 45, 4.4) + circ(24, 18, 14, P.leafM) + path('M24 4A14 14 0 0 1 24 32C30 26 30 10 24 4Z', P.leaf),
  leaf: () => rleaf(24, 44, 38, 26, 18, '#7f9483', '#b4c3b6'),
};
const KEYWORDS = [
  [/berry|currant/, 'blackberry'], [/bean/, 'green-beans'], [/pea\b|peas/, 'peas'], [/onion|shallot/, 'onion'], [/garlic/, 'garlic'],
  [/pepper/, 'pepper'], [/chil/, 'chilli'], [/squash|marrow|gourd/, 'butternut-squash'], [/pumpkin/, 'pumpkin'], [/melon/, 'melon'],
  [/lettuce|salad|leaves/, 'lettuce'], [/cabbage/, 'cabbage'], [/kale|collard/, 'kale'], [/potato/, 'potato'], [/carrot/, 'carrot'],
  [/apple/, 'apple'], [/pear/, 'pear'], [/plum|damson|gage/, 'plum'], [/cherry/, 'cherry'], [/citrus|lemon|lime/, 'lemon'], [/orange|mandarin/, 'orange'],
  [/oak/, 'oak'], [/pine|fir|spruce|cedar/, 'scots-pine'], [/birch/, 'birch'], [/maple/, 'red-maple'], [/willow|alder/, 'alder'],
  [/mint/, 'mint'], [/basil/, 'basil'], [/thyme|oregano|marjoram/, 'thyme'],
];

const nameOf = (id) => String(id).replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

function drawingFor(id, group) {
  const k = String(id || '').toLowerCase();
  if (D[k]) return D[k];
  if (ALIAS[k] && D[ALIAS[k]]) return D[ALIAS[k]];
  for (const [re, to] of KEYWORDS) if (re.test(k)) return D[to];
  if (group && FB[group]) return FB[group];
  return FB.leaf;
}

const cache = new Map();

/** A flat, coloured produce symbol for a plant or tree id, as an inline SVG string. */
export function produceIcon(id, { size = 40, cls = '', label, group } = {}) {
  const key = `${id}|${group || ''}`;
  let inner = cache.get(key);
  if (inner == null) { inner = drawingFor(id, group)(); cache.set(key, inner); }
  const name = label === true ? nameOf(id) : (typeof label === 'string' && label ? label : '');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const a11y = name ? `role="img" aria-label="${esc(name)}"` : 'aria-hidden="true"';
  return `<svg class="produce ${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" ${a11y} focusable="false" data-produce="${esc(id)}" style="flex:none;stroke:none">${inner}</svg>`;
}

/** True when the id has its own drawing (not a fallback). */
export const hasProduceIcon = (id) => !!(D[id] || (ALIAS[id] && D[ALIAS[id]]));

/** Every id with its own drawing, for galleries and tests. */
export const PRODUCE_IDS = Object.keys(D);
