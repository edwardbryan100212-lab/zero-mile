// Procedural 3D plants. Every plant is built in code from its "look" (habit, leaf, fruit),
// so one small engine draws all 68 plants at any growth stage, from seed (t=0) to fruiting (t=1).
import * as THREE from 'three';
import { rng } from './plants3d-rng.js';
import { leafTexture, LEAF_ASPECT, barkTexture, soilTexture, grassTexture, fruitTexture } from './textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export { rng };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- The look of each plant ----------
// habit decides the builder; the rest tunes it. Sizes are metres at full growth.
const F = (kind, r, color, extra = {}) => ({ kind, r, color, ...extra });
export const LOOKS = {
  // fruiting vegetables
  tomato:     { habit: 'vine', calyx: true, h: 1.5, leaf: 'compound', leafSize: .2, leafColor: '#3d7a35', stake: true, fruit: F('tomato', .042, '#d9301c', { truss: 4 }), flower: '#f4d21f' },
  pepper:     { habit: 'fork', glossy: true, calyx: true, h: .7, leaf: 'oval', leafSize: .11, leafColor: '#2f6e2c', fruit: F('pepper', .036, '#c9221a', { count: 5 }), flower: '#f6f4ea' },
  chilli:     { habit: 'fork', h: .6, leaf: 'lance', leafSize: .08, leafColor: '#33702e', fruit: F('chilli', .014, '#d61c12', { count: 16 }), flower: '#f6f4ea' },
  aubergine:  { habit: 'fork', glossy: true, calyx: true, h: .8, leaf: 'oval', leafSize: .15, leafColor: '#4b6e48', fruit: F('aubergine', .032, '#3b1a46', { count: 4 }), flower: '#9a6bc0' },
  cucumber:   { habit: 'climber', h: 1.8, leaf: 'heart', leafSize: .17, leafColor: '#3c7d33', support: 'trellis', fruit: F('cucumber', .025, '#2d5e1f', { len: .26 }), flower: '#f2cf1d' },
  'green-beans': { habit: 'climber', h: 2.0, leaf: 'trifoliate', leafSize: .14, leafColor: '#46852f', support: 'canes', fruit: F('pod', .007, '#58a33a', { len: .15 }), flower: '#e64a3a' },
  peas:       { habit: 'climber', h: 1.2, leaf: 'pinnate', leafSize: .05, leafColor: '#6aa349', support: 'twigs', fruit: F('pod', .011, '#6fb24a', { len: .08 }), flower: '#f7f5f0' },
  'broad-beans': { habit: 'canes', caneColor: '#4f7a3c', h: 1.0, leaf: 'pinnate', leafSize: .07, leafColor: '#6f8f68', fruit: F('pod', .012, '#5f9a3d', { len: .13, hang: true }), flower: '#f4f2ee', canes: 4 },
  courgette:  { habit: 'giantleaf', h: .7, leaf: 'lobed', leafSize: .3, leafK: 1.3, leafColor: '#2d6a2a', fruit: F('courgette', .045, '#2f5a22', { len: .3, count: 3 }), flower: '#f2b01d' },
  sweetcorn:  { habit: 'corn', h: 2.0, leaf: 'strap', leafSize: .7, leafK: 1, leafColor: '#4f8c37', fruit: F('cob', .025, '#ffffff', { len: .2 }) },
  pumpkin:    { habit: 'sprawl', h: .5, leaf: 'palm', leafSize: .26, leafK: 1.6, leafColor: '#36702e', fruit: F('pumpkin', .15, '#e2741c', { count: 2 }), flower: '#f2b01d' },
  'butternut-squash': { habit: 'sprawl', h: .45, leaf: 'palm', leafSize: .24, leafK: 1.6, leafColor: '#3c7431', fruit: F('squash', .09, '#e9b768', { count: 3 }), flower: '#f2b01d' },
  melon:      { habit: 'sprawl', h: .35, leaf: 'heart', leafSize: .13, leafK: 1.9, leafColor: '#3f7a34', fruit: F('melon', .075, '#e4cf86', { count: 2 }), flower: '#f2cf1d' },
  watermelon: { habit: 'sprawl', h: .35, leaf: 'oak', leafSize: .14, leafK: 1.9, leafColor: '#3d6f33', fruit: F('watermelon', .13, '#ffffff', { count: 1 }), flower: '#f2cf1d' },
  // berries and fruit bushes
  strawberry: { habit: 'crown', calyx: true, h: .16, leaf: 'trifoliate', leafSize: .1, leafColor: '#357a2f', fruit: F('strawberry', .028, '#d4202a', { count: 9 }), flower: '#ffffff' },
  raspberry:  { habit: 'canes', h: 1.6, leaf: 'pinnate', leafSize: .09, leafColor: '#3a7432', fruit: F('raspberry', .016, '#c2183b'), flower: '#fbfbf5' },
  blackberry: { habit: 'canes', arch: true, h: 1.4, leaf: 'pinnate', leafSize: .09, leafColor: '#2f5f2c', caneColor: '#6b3a3a', fruit: F('blackberry', .015, '#16121c'), flower: '#f5e6ef' },
  blueberry:  { habit: 'shrub', h: 1.2, leaf: 'oval', leafSize: .06, leafColor: '#3f6f3a', wood: '#7a4b35', fruit: F('blueberry', .009, '#3a4f9c', { per: 4 }), flower: '#f6efe8' },
  gooseberry: { habit: 'shrub', h: 1.0, leaf: 'oak', leafSize: .05, leafColor: '#4a7a3a', wood: '#6e5a42', fruit: F('gooseberry', .013, '#b6d27a', { per: 3 }), flower: '#c9b38a' },
  blackcurrant: { habit: 'shrub', h: 1.2, leaf: 'palm', leafSize: .07, leafColor: '#3c6e35', wood: '#5e4a38', fruit: F('blackcurrant', .006, '#1a1420', { per: 6, string: true }), flower: '#c9d48a' },
  grape:      { habit: 'climber', h: 1.8, leaf: 'palm', leafSize: .16, leafColor: '#4a7f36', support: 'wire', fruit: F('grape', .014, '#5b2a5e', { bunch: 34 }), wood: '#6a4e36' },
  rhubarb:    { habit: 'stalks', h: .7, leaf: 'palm', leafSize: .32, leafK: 1.2, leafColor: '#3c6e2c', stalkColors: ['#b8203a', '#c7334a', '#a81c33'], stalkR: .013, count: 7 },
  // leafy and brassicas
  lettuce:    { habit: 'rosette', h: .22, leaf: 'frilly', leafSize: .17, leafColor: '#86c04a', count: 26, cup: true },
  spinach:    { habit: 'rosette', h: .25, leaf: 'crinkle', leafSize: .15, leafColor: '#2f6f2b', count: 16, petiole: .08 },
  kale:       { habit: 'rosette', h: .6, leaf: 'frilly', leafSize: .28, leafColor: '#36543a', count: 14, petiole: .2, tall: true },
  rocket:     { habit: 'rosette', h: .2, leaf: 'oak', leafSize: .13, leafColor: '#4b7f3a', count: 18, petiole: .03 },
  'swiss-chard': { habit: 'stalks', h: .55, leaf: 'crinkle', leafSize: .24, leafColor: '#2e5f2a', stalkColors: ['#d4263a', '#f2c230', '#f07a2a', '#e8e2c8', '#c9338a'], stalkR: .008, count: 9 },
  'pak-choi': { habit: 'stalks', h: .3, leaf: 'round', leafSize: .13, leafColor: '#2f6a2c', stalkColors: ['#eef2e2'], stalkR: .012, count: 10, upright: true },
  celery:     { habit: 'stalks', h: .5, leaf: 'compound', leafSize: .08, leafColor: '#5d9a3e', stalkColors: ['#a9c97a', '#9bc06c'], stalkR: .01, count: 11, upright: true },
  broccoli:   { habit: 'brassica', h: .6, leaf: 'oval', leafSize: .26, leafColor: '#4d6f5a', head: F('broccoli', .1, '#2f5a33') },
  cauliflower:{ habit: 'brassica', h: .5, leaf: 'oval', leafSize: .26, leafColor: '#4f7a54', head: F('cauliflower', .11, '#f1ead6') },
  cabbage:    { habit: 'brassica', h: .4, leaf: 'round', leafSize: .2, leafColor: '#6f9f6a', head: F('cabbage', .1, '#b8d49a'), wrap: true },
  'brussels-sprouts': { habit: 'brassica', h: .8, leaf: 'round', leafSize: .16, leafColor: '#4f7a54', head: F('sprout', .018, '#7aa35a'), stalk: true },
  asparagus:  { habit: 'spears', h: 1.3, leaf: 'feather', leafSize: .2, leafColor: '#4f8a3a' },
  // roots, tubers and alliums
  carrot:     { habit: 'root', h: .35, leaf: 'feather', leafSize: .22, leafColor: '#3f8b33', root: F('carrot', .022, '#ec7a14', { len: .17 }) },
  parsnip:    { habit: 'root', h: .4, leaf: 'compound', leafSize: .14, leafColor: '#4f8a3a', root: F('carrot', .03, '#eadcb5', { len: .22 }) },
  radish:     { habit: 'root', h: .15, leaf: 'oval', leafSize: .09, leafColor: '#4a8f3a', root: F('radish', .022, '#d6214f') },
  beetroot:   { habit: 'root', h: .3, leaf: 'crinkle', leafSize: .14, leafColor: '#3b6a2c', petioleColor: '#9a1838', root: F('beet', .035, '#6e1230') },
  turnip:     { habit: 'root', h: .3, leaf: 'oak', leafSize: .16, leafColor: '#4f8a3a', root: F('turnip', .04, '#ffffff') },
  potato:     { habit: 'potato', h: .6, leaf: 'compound', leafSize: .13, leafColor: '#3a7232', root: F('potato', .055, '#b98a52'), flower: '#e8e2f2' },
  'sweet-potato': { habit: 'potato', h: .4, leaf: 'heart', leafSize: .1, leafColor: '#3f7a34', root: F('sweetpotato', .05, '#a9502c'), flower: '#d9b8e6' },
  onion:      { habit: 'allium', h: .45, leafColor: '#4f8a49', root: F('onion', .045, '#b4652b') },
  garlic:     { habit: 'allium', h: .5, leafColor: '#5f8f53', flat: true, root: F('garlic', .03, '#efe9dc') },
  leek:       { habit: 'allium', leek: true, h: .7, leafColor: '#4d7a55', root: F('leek', .022, '#f2f0e4') },
  'spring-onion': { habit: 'allium', h: .4, leafColor: '#4f944a', bunch: 5, root: F('onion', .012, '#f4f2ea') },
  chives:     { habit: 'allium', h: .35, leafColor: '#3f8a3e', tuft: 26, flower: '#b57ad0', root: F('onion', .004, '#e9e6d8') },
  // herbs
  basil:      { habit: 'herb', glossy: true, h: .45, leaf: 'oval', leafSize: .065, leafColor: '#3e9a36', stems: 4 },
  mint:       { habit: 'herb', h: .5, leaf: 'serrate', leafSize: .05, leafColor: '#4b9a49', stems: 7 },
  sage:       { habit: 'shrub', h: .5, leaf: 'oval', leafSize: .07, leafColor: '#8aa08a', wood: '#7a6a55', density: 5, flower: '#8a6fc4' },
  rosemary:   { habit: 'shrub', h: .9, leaf: 'lance', leafSize: .045, leafK: 1.2, leafColor: '#3f5f4a', wood: '#6a5a46', density: 16, upright: true, flower: '#8fa8e0' },
  thyme:      { habit: 'shrub', h: .25, leaf: 'tiny', leafSize: .018, leafK: 1.3, leafColor: '#5e7a4e', wood: '#7a5f48', density: 14, flower: '#d9a3d0' },
  parsley:    { habit: 'rosette', upright: true, h: .3, leaf: 'compound', leafSize: .12, leafColor: '#2f8a32', count: 20, petiole: .12 },
  coriander:  { habit: 'rosette', upright: true, h: .3, leaf: 'trifoliate', leafSize: .12, leafColor: '#4a9a3e', count: 22, petiole: .12 },
  dill:       { habit: 'herb', h: .9, leaf: 'feather', leafSize: .12, leafColor: '#5a9a48', stems: 3, umbel: '#e8d43a' },
  sunflower:  { habit: 'sunflower', h: 2.0, leaf: 'heart', leafSize: .22, leafColor: '#4a7f33' },
  // trees
  apple:      { habit: 'tree', h: 3.2, leaf: 'oval', leafSize: .07, leafColor: '#3c7a34', bark: 'apple', fruit: F('apple', .04, '#c22a21', { count: 46, stalk: true }), flower: '#f8dfe6', depth: 4 },
  pear:       { habit: 'tree', h: 3.6, leaf: 'oval', leafSize: .07, leafColor: '#3f7a35', bark: 'apple', fruit: F('pear', .038, '#c9c34a', { count: 34, stalk: true }), flower: '#ffffff', depth: 4, slim: true },
  plum:       { habit: 'tree', h: 3.4, leaf: 'oval', leafSize: .065, leafColor: '#3a6f30', bark: 'oak', fruit: F('plum', .025, '#5a2350', { count: 50, stalk: true }), flower: '#ffffff', depth: 4 },
  cherry:     { habit: 'tree', h: 4.0, leaf: 'oval', leafSize: .08, leafColor: '#3a7a33', bark: 'cherry', fruit: F('cherry', .012, '#a8101e', { count: 80, stalk: true, pairs: true }), flower: '#fbe3ec', depth: 4 },
  peach:      { habit: 'tree', h: 3.0, leaf: 'lance', leafSize: .1, leafColor: '#4a8a3a', bark: 'apple', fruit: F('peach', .035, '#ffffff', { count: 30 }), flower: '#f6a8c2', depth: 4 },
  fig:        { habit: 'tree', h: 3.0, leaf: 'palm', leafSize: .18, leafK: 1.1, leafColor: '#4a7f36', bark: 'beech', fruit: F('fig', .028, '#5b3550', { count: 24 }), depth: 3, wide: true },
  lemon:      { habit: 'tree', glossy: true, h: 2.4, leaf: 'oval', leafSize: .08, leafColor: '#2d5f2a', bark: 'apple', fruit: F('lemon', .04, '#f3d221', { count: 26 }), flower: '#ffffff', depth: 4, dense: true },
  orange:     { habit: 'tree', glossy: true, h: 3.0, leaf: 'oval', leafSize: .09, leafColor: '#2a5a28', bark: 'apple', fruit: F('orange', .04, '#f08a12', { count: 34 }), flower: '#ffffff', depth: 4, dense: true },
  rowan:      { habit: 'tree', h: 9, leaf: 'pinnate', leafSize: .16, leafColor: '#4a7f36', bark: 'beech', fruit: F('sphere', .05, '#d9341c', { count: 12, bunch: 16 }), depth: 4 },
  birch:      { habit: 'tree', h: 14, leaf: 'birch', leafSize: .24, leafColor: '#6c9636', bark: 'birch', depth: 5, slender: true },
  oak:        { habit: 'tree', h: 16, leaf: 'oak', leafSize: .42, leafColor: '#3c6a2c', bark: 'oak', fruit: F('acorn', .12, '#8a6a2c', { count: 30 }), depth: 5, wide: true },
  beech:      { habit: 'tree', h: 18, leaf: 'oval', leafSize: .32, leafColor: '#4f8a35', bark: 'beech', depth: 5, wide: true, dense: true },
  'scots-pine': { habit: 'tree', conifer: true, h: 18, leaf: 'needle', leafSize: 1.5, leafK: 1, leafColor: '#2f5a44', bark: 'pine', fruit: F('cone', .1, '#ffffff', { count: 24 }), depth: 3 },
};

// ---------- shared materials (cached once, never disposed) ----------
const matCache = new Map();
function mat(key, make) {
  if (!matCache.has(key)) { const m = make(); m.userData.shared = true; matCache.set(key, m); }
  return matCache.get(key);
}
const stdMat = (color, rough = .7, extra = {}) => mat(`std:${color}:${rough}:${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
const leafMat = (type, glossy) => mat(`leaf:${type}:${!!glossy}`, () => new THREE.MeshStandardMaterial({ color: '#ffffff', map: leafTexture(type), alphaTest: .45, side: THREE.DoubleSide, roughness: glossy ? .38 : .62 }));
const GLOSSY = new Set(['tomato', 'apple', 'pepper', 'cherry', 'plum', 'aubergine', 'grape', 'blackcurrant', 'gooseberry', 'blueberry', 'sphere', 'pear']);
const TEXOF = { cauliflower: 'brassica', broccoli: 'brassica', sprout: 'cabbage' };
const fruitMat = (kind) => mat(`fruit:${kind}`, () => new THREE.MeshPhysicalMaterial({
  color: '#ffffff', map: fruitTexture(TEXOF[kind] || kind), roughness: GLOSSY.has(kind) ? .3 : kind === 'lemon' || kind === 'orange' ? .45 : .62,
  clearcoat: GLOSSY.has(kind) ? .55 : 0, clearcoatRoughness: .25,
  transmission: kind === 'gooseberry' ? .25 : 0, thickness: .01,
}));

// ---------- geometry (cached) ----------
const geoCache = new Map();
function cached(key, make) { if (!geoCache.has(key)) { const g = make(); g.userData.shared = true; geoCache.set(key, g); } return geoCache.get(key); }

// Squeeze a round shape into ribs/lobes around its vertical axis (tomatoes, peppers, pumpkins, courgettes)
function ribs(g, n, depth, sharp = 2) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 - depth * Math.pow(1 - Math.abs(Math.cos(n * a / 2)), sharp);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals(); return g;
}
// Many little bumps over a ball: raspberry and blackberry drupelets, cauliflower curd, broccoli florets
function bumpy(g, n, height, width = .9) {
  const pts = []; for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; pts.push(V(Math.cos(a) * r, y, Math.sin(a) * r)); }
  const p = g.attributes.position, v = V();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const len = v.length(); v.normalize();
    let best = -1; for (const q of pts) { const d = v.dot(q); if (d > best) best = d; }
    const bump = Math.sqrt(Math.max(0, (best - width) / (1 - width)));
    v.multiplyScalar(len * (1 - height + height * bump)); p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
const lathe = (prof, seg = 24) => { const pts = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(Math.max(24, prof.length * 5)); pts[0].x = 0; pts[pts.length - 1].x = 0; return new THREE.LatheGeometry(pts, Math.max(seg, 28)); };

// A leaf is a textured plane (base at origin, tip at +Y=1) bent along its midrib.
function leafGeo(type) {
  return cached('leaf:' + type, () => {
    const W = LEAF_ASPECT[type] ?? .55;
    const g = new THREE.PlaneGeometry(W, 1, 8, type === 'strap' ? 20 : 14);
    g.translate(0, .5, 0);
    const p = g.attributes.position;
    const fold = type === 'frilly' || type === 'crinkle' ? .06 : type === 'feather' || type === 'needle' ? .02 : .16;
    const curl = type === 'frilly' ? .22 : type === 'lobed' || type === 'palm' ? .12 : type === 'strap' ? .55 : type === 'needle' ? .05 : .3;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), nx = Math.abs(x) / (W / 2);
      let z = -curl * y * y + fold * Math.abs(x) * (1 - y * .4);
      if (type === 'frilly' || type === 'lobed' || type === 'palm') z += Math.sin(y * 19 + x * 9) * .035 * nx * nx;
      if (type === 'crinkle') z += Math.sin(y * 31) * Math.sin(x * 40) * .018;
      z += Math.sin(y * 7 + x * 3) * .01;
      p.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  });
}
export function fruitGeo(kind) {
  return cached('fruit:' + kind, () => {
    switch (kind) {
      case 'sphere': case 'grape': case 'blackcurrant': case 'gooseberry': { const g = new THREE.SphereGeometry(1, 18, 14); if (kind === 'grape') g.scale(.92, 1.08, .92); return g; }
      case 'tomato': return ribs(lathe([[0, -.78], [.45, -.86], [.85, -.6], [1, -.1], [.95, .4], [.7, .72], [.25, .8], [0, .7]], 32), 6, .07, 3);
      case 'blueberry': return lathe([[0, -.9], [.6, -.82], [.98, -.25], [.98, .3], [.7, .78], [.42, .86], [.3, .72], [.18, .8], [0, .72]], 20);
      case 'apple': return lathe([[0, -.78], [.32, -.9], [.8, -.62], [1, -.05], [.92, .55], [.6, .86], [.22, .82], [.06, .62], [0, .58]], 32);
      case 'pear': return lathe([[0, -1], [.6, -.95], [.98, -.55], [.95, -.05], [.62, .4], [.42, .85], [.25, 1.15], [0, 1.2]], 28);
      case 'plum': { const g = new THREE.SphereGeometry(1, 24, 18); g.scale(.9, 1.1, .95); return ribs(g, 2, .05, 6); }
      case 'cherry': return lathe([[0, -.85], [.6, -.9], [.98, -.4], [1, .2], [.75, .78], [.3, .85], [.08, .68], [0, .66]], 24);
      case 'peach': { const g = new THREE.SphereGeometry(1, 28, 20); return ribs(g, 2, .07, 8); }
      case 'fig': return lathe([[0, -.85], [.55, -.8], [.9, -.35], [.85, .2], [.5, .7], [.18, 1.05], [.1, 1.15], [0, 1.15]], 24);
      case 'lemon': { const g = new THREE.SphereGeometry(1, 22, 16); g.scale(.78, 1.12, .78); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) > 1.0) p.setY(i, y * 1.12); } g.computeVertexNormals(); return g; }
      case 'orange': { const g = new THREE.SphereGeometry(1, 26, 20); g.scale(1, .94, 1); return g; }
      case 'pepper': return ribs(lathe([[0, -1.05], [.5, -1.1], [.9, -.75], [1, .1], [.98, .75], [.62, 1], [.2, .9], [0, .95]], 32), 4, .15, 2.5);
      case 'chilli': return lathe([[0, -6], [.25, -5], [.6, -3], [.9, -1], [1, .5], [.6, 1], [0, 1]], 14);
      case 'aubergine': return lathe([[0, -3.1], [.6, -3.0], [1, -2.3], [1.05, -1.2], [.8, -.1], [.55, .8], [.35, 1.0], [0, 1.0]], 24);
      case 'cucumber': { const g = new THREE.CapsuleGeometry(1, 2, 8, 16); return ribs(g, 8, .05, 2); }
      case 'courgette': { const g = new THREE.CapsuleGeometry(1, 2.2, 8, 20); return ribs(g, 7, .07, 1.5); }
      case 'pod': { const prof = []; for (let i = 0; i <= 40; i++) { const y = -2.5 + 5 * i / 40, end = Math.sin(Math.PI * i / 40) ** .5; prof.push([end * (1 + .16 * Math.max(0, Math.sin((y + 2.5) * Math.PI * 1.1))), y]); } const g = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18); g.scale(1, 1, .6); g.computeVertexNormals(); return g; }
      case 'strawberry': return lathe([[0, -1.3], [.45, -1], [.85, -.2], [1, .45], [.7, .85], [0, .9]], 20);
      case 'raspberry': { const g = new THREE.SphereGeometry(1, 56, 42); g.scale(.95, 1.05, .95); return bumpy(g, 80, .2, .93); }
      case 'blackberry': { const g = new THREE.SphereGeometry(1, 56, 42); g.scale(.85, 1.15, .85); return bumpy(g, 70, .14, .92); }
      case 'acorn': return lathe([[0, -1], [.5, -.8], [.62, 0], [.66, .4], [.7, .45], [.6, .9], [0, 1]]);
      case 'cone': return lathe([[0, -1], [.35, -.85], [.55, -.4], [.58, .1], [.45, .6], [.2, .95], [0, 1]], 18);
      case 'beechnut': { const g = new THREE.OctahedronGeometry(1, 1); g.scale(.6, 1, .6); return g; }
      case 'catkin': { const g = new THREE.CapsuleGeometry(.18, 1.6, 4, 8); return bumpy(g, 40, .2, .9); }
      case 'carrot': return lathe([[0, -1], [.08, -.8], [.3, -.3], [.5, .3], [.62, .85], [.45, 1], [0, 1]]);
      case 'radish': return lathe([[0, -1.5], [.06, -1.1], [.55, -.75], [.95, -.2], [.95, .3], [.6, .7], [0, .75]]);
      case 'beet': return lathe([[0, -1.6], [.05, -1.2], [.5, -.75], [.95, -.2], [1, .3], [.7, .75], [.15, .9], [0, .95]]);
      case 'turnip': return lathe([[0, -1.4], [.05, -1.05], [.6, -.65], [1, -.05], [.92, .45], [.5, .78], [.12, .85], [0, .88]]);
      case 'potato': case 'sweetpotato': { const g = new THREE.SphereGeometry(1, 28, 20); const p = g.attributes.position; const r = rng(kind.length); const sx = kind === 'sweetpotato' ? 1.9 : 1.35; for (let i = 0; i < p.count; i++) { const k = .85 + r() * .12; let x = p.getX(i) * sx; if (kind === 'sweetpotato') { const t = Math.abs(p.getX(i)); const taper = 1 - t * t * .55; p.setXYZ(i, x * k, p.getY(i) * k * .8 * taper, p.getZ(i) * k * taper); } else p.setXYZ(i, x * k, p.getY(i) * k * .8, p.getZ(i) * k); } g.computeVertexNormals(); return g; }
      case 'onion': return lathe([[0, -.95], [.6, -.85], [.98, -.2], [.9, .35], [.4, .8], [.12, 1.1], [0, 1.15]]);
      case 'garlic': return ribs(lathe([[0, -.8], [.75, -.7], [1, -.1], [.8, .45], [.3, .85], [.1, 1.1], [0, 1.1]], 28), 8, .08, 2);
      case 'leek': { const g = new THREE.CylinderGeometry(1, 1.1, 12, 16, 4); g.translate(0, 6, 0); return g; }
      case 'pumpkin': return ribs(lathe([[0, -.62], [.6, -.72], [.95, -.45], [1, 0], [.92, .45], [.55, .68], [.15, .6], [0, .52]], 40), 10, .12, 1.6);
      case 'squash': return lathe([[0, -1], [.55, -.98], [.92, -.7], [1, -.3], [.8, .1], [.5, .5], [.48, 1.1], [.4, 1.5], [0, 1.55]], 28);
      case 'melon': return ribs(new THREE.SphereGeometry(1, 28, 20), 10, .03, 3);
      case 'watermelon': { const g = new THREE.SphereGeometry(1, 30, 22); g.scale(.8, .76, 1.1); return g; }
      case 'cob': { const g = new THREE.CapsuleGeometry(1, 5.5, 6, 18); return g; }
      case 'cabbage': case 'sprout': { const g = new THREE.SphereGeometry(1, 26, 20); g.scale(1, .88, 1); return bumpy(g, 14, .05, .7); }
      case 'cauliflower': { const g = new THREE.SphereGeometry(1, 40, 30, 0, Math.PI * 2, 0, Math.PI * .58); return bumpy(g, 90, .12, .92); }
      case 'broccoli': { const g = new THREE.SphereGeometry(1, 24, 18); return bumpy(g, 40, .22, .9); }
      default: return new THREE.SphereGeometry(1, 14, 10);
    }
  });
}
const flowerGeo = () => cached('flower', () => {
  const g = new THREE.CircleGeometry(1, 30);
  const p = g.attributes.position;
  for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)); const k = .45 + .55 * Math.abs(Math.cos(a * 2.5)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, (1 - k) * .25); }
  g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g;
});
const calyxGeo = () => cached('calyx', () => { const g = new THREE.CircleGeometry(1, 10); const p = g.attributes.position; for (let i = 1; i < p.count; i++) { const k = (i % 2) ? 1 : .35; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, k > .5 ? -.25 : 0); } g.rotateX(-Math.PI / 2); g.computeVertexNormals(); return g; });
const stalkGeo = () => cached('stalk', () => { const g = new THREE.CylinderGeometry(.06, .09, 1, 6); g.translate(0, .5, 0); return g; });

function barkMaterial(bark) {
  if (['birch', 'oak', 'apple', 'pine', 'beech'].includes(bark)) return mat('bark:' + bark, () => new THREE.MeshStandardMaterial({ map: barkTexture(bark), roughness: .92 }));
  if (bark === 'cherry') return mat('bark:cherry', () => new THREE.MeshStandardMaterial({ map: barkTexture('tree'), color: '#8a4a3e', roughness: .7 }));
  return mat('bark:' + bark, () => new THREE.MeshStandardMaterial({ map: barkTexture('tree'), color: bark || '#4c6b2c', roughness: .9 }));
}

// A tube that narrows toward its end, like a real stem or branch
function taperedTube(curve, segs, radius, endScale = .5, radial = 7) {
  const g = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  const p = g.attributes.position, c = V(), v = V();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const k = 1 - (1 - endScale) * (i / segs);
    for (let j = 0; j <= radial; j++) { const idx = i * (radial + 1) + j; v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c); p.setXYZ(idx, v.x, v.y, v.z); }
  }
  g.computeVertexNormals();
  return g;
}

// ---------- Builder ----------
class Builder {
  constructor(look, t, seed) {
    this.look = look; this.t = t; this.r = rng(seed);
    this.group = new THREE.Group();
    this.leaves = []; this.fruits = []; this.flowers = [];
    this.parts = new Map(); // extra instanced parts: calyxes, stalks, petals, husks, florets
    this.leafSizeK = lerp(.35, 1, smooth(0, .7, t)) * (look.leafK ?? 1.7);
  }
  // Orient something whose local +Y should point along `dir`, with its face (+Z) as close to `face` as possible.
  frame(pos, dir, scale, face = UP) {
    const d = dir.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
    const n = Z.clone().applyQuaternion(q);
    const want = face.clone().sub(d.clone().multiplyScalar(face.dot(d)));
    if (want.lengthSq() > 1e-6) {
      want.normalize();
      let ang = n.angleTo(want);
      if (V().crossVectors(n, want).dot(d) < 0) ang = -ang;
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(d, ang));
    }
    return new THREE.Matrix4().compose(pos, q, typeof scale === 'number' ? V(scale, scale, scale) : scale);
  }
  part(key, geo, material, m, color) {
    if (!this.parts.has(key)) this.parts.set(key, { geo, material, items: [] });
    this.parts.get(key).items.push({ m, color });
  }
  leaf(pos, dir, size, type = this.look.leaf) {
    const s = size * this.leafSizeK * (0.85 + this.r() * .3);
    if (s < 1e-4) return;
    if (type === 'compound' || type === 'pinnate' || type === 'trifoliate' || type === 'feather') {
      const d = dir.clone().normalize();
      const pairs = type === 'trifoliate' ? 1 : type === 'feather' ? 3 : type === 'pinnate' ? 4 : 4;
      const len = s * (type === 'feather' ? 1 : 1.6);
      const end = pos.clone().addScaledVector(d, len);
      if (!this.noPetiole) this.stem([pos, pos.clone().addScaledVector(d, len * .5).add(V(0, len * .08, 0)), end], s * .025, this.look.leafColor);
      const side = V().crossVectors(d, UP); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
      for (let i = 0; i < pairs; i++) {
        const k = type === 'trifoliate' ? 1 : (i + 1) / (pairs + 1);
        const p = pos.clone().addScaledVector(d, len * k);
        const ls = s * (type === 'feather' ? .45 : .55) * (1 - k * .25);
        for (const sg of [1, -1]) this.leaves.push(this.frame(p, side.clone().multiplyScalar(sg).addScaledVector(d, .5).add(V(0, .15, 0)), ls));
      }
      this.leaves.push(this.frame(end, d.clone().add(V(0, .1, 0)), s * (type === 'feather' ? .45 : .62)));
      return;
    }
    this.leaves.push(this.frame(pos, dir, s, UP));
  }
  stem(points, radius, color = this.look.leafColor, material) {
    if (points.length < 2 || radius <= 0) return;
    const curve = new THREE.CatmullRomCurve3(points);
    const g = taperedTube(curve, Math.max(4, points.length * 4), Math.max(radius, .002), .45);
    const m = new THREE.Mesh(g, material || stdMat('#' + new THREE.Color(color).multiplyScalar(.8).getHexString(), .7));
    m.castShadow = true; this.group.add(m);
  }
  // one fruit (or a bunch of them) hanging at pos; grows in and ripens late in the season
  fruitAt(pos, size, hang = true) {
    const f = this.look.fruit; if (!f) return;
    const k = smooth(.72, .98, this.t); if (k <= 0) return;
    const ripe = this.t, r = this.r;
    if (f.bunch) { // grapes, rowan berries: a cone-shaped cluster
      const n = f.bunch, R = f.r * k;
      for (let i = 0; i < n; i++) {
        const y = i / n, ring = (1 - y) * 3.2 + .6, a = i * 2.39996;
        this.fruits.push({ m: new THREE.Matrix4().compose(pos.clone().add(V(Math.cos(a) * R * ring * .7, -y * R * 9, Math.sin(a) * R * ring * .7)), new THREE.Quaternion(), V(R, R, R)), ripe });
      }
      this.stem([pos.clone().add(V(0, .03, 0)), pos.clone().add(V(0, -R * 6, 0))], R * .2, '#6a5a3a');
      return;
    }
    if (f.string) { // currants hang on a short string
      for (let i = 0; i < 7; i++) this.fruits.push({ m: new THREE.Matrix4().compose(pos.clone().add(V(Math.sin(i) * f.r * .9, -i * f.r * 2.1, Math.cos(i) * f.r * .9)), new THREE.Quaternion(), V(f.r, f.r, f.r).multiplyScalar(k * (1 - i * .05))), ripe });
      return;
    }
    const q = new THREE.Quaternion();
    const long = ['chilli', 'cucumber', 'courgette', 'pod', 'aubergine'].includes(f.kind);
    if (hang && long) q.setFromAxisAngle(V(1, 0, 0).applyAxisAngle(UP, r() * 6.28), (r() - .5) * .5);
    else q.setFromAxisAngle(UP, r() * 6.28);
    let sc;
    if (f.kind === 'cucumber' || f.kind === 'courgette' || f.kind === 'pod') sc = V(f.r, f.len / (f.kind === 'pod' ? 5 : 4), f.r).multiplyScalar(k);
    else if (f.kind === 'chilli') sc = V(f.r, f.r * 1.3, f.r).multiplyScalar(k);
    else sc = V(size, size, size).multiplyScalar(k);
    const p = pos.clone();
    if (hang && long && f.kind !== 'aubergine' && f.kind !== 'chilli') p.y -= (f.len || 0) * .5 * k;
    if (f.kind === 'aubergine' || f.kind === 'chilli') { q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), (r() - .5) * .3)); }
    const m = new THREE.Matrix4().compose(p, q, sc);
    this.fruits.push({ m, ripe });
    if (f.stalk) { // a short woody stalk on top of apples, pears, plums and cherries
      const top = p.clone().add(V(0, sc.y * (f.kind === 'pear' ? 1.15 : .6), 0));
      const len = f.kind === 'cherry' ? .04 : .022;
      this.part('stalk', stalkGeo(), stdMat('#5a4128', .8), new THREE.Matrix4().compose(top, new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), .25 + r() * .3), V(sc.x * .9, len, sc.x * .9)));
      if (f.pairs) this.fruits.push({ m: new THREE.Matrix4().compose(p.clone().add(V(sc.x * 2.1, -sc.y * .3, 0)), q, sc), ripe });
    }
  }
  flowerAt(pos, size) {
    if (!this.look.flower) return;
    const k = smooth(.5, .62, this.t) * (1 - smooth(.86, .97, this.t));
    if (k <= 0) return;
    this.flowers.push(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(UP, this.r() * 6), V(size * k, size * k, size * k)));
  }
  finish() {
    const L = this.look;
    if (this.leaves.length) {
      const type = L.leaf === 'compound' ? 'serrate' : L.leaf === 'pinnate' ? 'oval' : L.leaf === 'trifoliate' ? 'serrate' : (L.leaf || 'oval');
      const im = new THREE.InstancedMesh(leafGeo(type), leafMat(type, L.glossy), this.leaves.length);
      const base = new THREE.Color(L.leafColor), c = new THREE.Color();
      const n = this.leaves.length;
      this.leaves.forEach((m, i) => {
        im.setMatrixAt(i, m);
        // older (earlier) leaves a touch darker and duller, plus a little random variation
        c.copy(base).offsetHSL((this.r() - .5) * .035, (this.r() - .5) * .1 - (1 - i / n) * .04, (this.r() - .5) * .09 - (1 - i / n) * .03);
        im.setColorAt(i, c);
      });
      im.castShadow = true; this.group.add(im);
    }
    const f = L.fruit || L.head || L.root;
    if (this.fruits.length && f) {
      const im = new THREE.InstancedMesh(fruitGeo(f.kind), fruitMat(f.kind), this.fruits.length);
      const ripeC = new THREE.Color(f.color), green = new THREE.Color(L.fruit ? (f.unripe || '#6aa040') : f.color);
      this.fruits.forEach((o, i) => { im.setMatrixAt(i, o.m); im.setColorAt(i, green.clone().lerp(ripeC, smooth(.8, 1, o.ripe)).offsetHSL(0, 0, (this.r() - .5) * .06)); });
      im.castShadow = true; this.group.add(im);
      if (L.calyx) {
        const cm = new THREE.InstancedMesh(calyxGeo(), stdMat('#3d6e2a', .7, { side: THREE.DoubleSide }), this.fruits.length);
        const pos = V(), q = new THREE.Quaternion(), sc = V(), m = new THREE.Matrix4();
        const top = { strawberry: .9, aubergine: 1.0, pepper: .95 }[f.kind] ?? .8;
        this.fruits.forEach((o, i) => { o.m.decompose(pos, q, sc); m.compose(pos.clone().add(V(0, sc.y * top, 0).applyQuaternion(q)), q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, i)), V(sc.x * (f.kind === 'aubergine' ? 1.1 : .7), sc.x, sc.x * (f.kind === 'aubergine' ? 1.1 : .7))); cm.setMatrixAt(i, m); });
        this.group.add(cm);
      }
    }
    if (this.flowers.length) {
      const im = new THREE.InstancedMesh(flowerGeo(), stdMat(L.flower, .6, { side: THREE.DoubleSide }), this.flowers.length);
      this.flowers.forEach((m, i) => im.setMatrixAt(i, m));
      this.group.add(im);
    }
    for (const { geo, material, items } of this.parts.values()) {
      const im = new THREE.InstancedMesh(geo, material, items.length);
      items.forEach((it, i) => { im.setMatrixAt(i, it.m); if (it.color) im.setColorAt(i, new THREE.Color(it.color)); });
      im.castShadow = true; this.group.add(im);
    }
    return this.group;
  }
}

// Wobbly upward path
function upPath(r, base, height, n, wobble, lean = V()) {
  const pts = [base.clone()];
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push(V(base.x + lean.x * k * height + (r() - .5) * wobble, base.y + height * k, base.z + lean.z * k * height + (r() - .5) * wobble));
  }
  return pts;
}

const BUILD = {
  vine(b) {
    const L = b.look, H = L.h * b.t ** .9, r = b.r;
    const nodes = Math.max(2, Math.round(lerp(2, 16, b.t)));
    const pts = upPath(r, V(), H, nodes, .05);
    b.stem(pts, .012 * (.4 + b.t));
    if (L.stake && b.t > .3) b.stem([V(.06, -.1, 0), V(.06, L.h * 1.05, 0)], .009, '#a07b52');
    pts.forEach((p, i) => {
      if (i === 0) return;
      const az = i * 2.4;
      b.leaf(p, V(Math.cos(az), .25, Math.sin(az)), L.leafSize * (1 - i / (nodes * 1.6)));
      if (i % 2 === 0) b.leaf(p, V(Math.cos(az + 2.6), .35, Math.sin(az + 2.6)), L.leafSize * .55 * (1 - i / (nodes * 1.6)));
      if (i % 3 === 1 && i < nodes - 1) {
        const tp = p.clone().addScaledVector(V(Math.cos(az + 3.1), -.3, Math.sin(az + 3.1)), .08);
        b.stem([p, tp], .004);
        const n = L.fruit.truss || 4;
        for (let j = 0; j < n; j++) {
          const fp = tp.clone().add(V((r() - .5) * .09, -.03 - j * .035, (r() - .5) * .09));
          b.fruitAt(fp, L.fruit.r * (.8 + r() * .35));
          b.flowerAt(fp.clone().add(V(0, .02, 0)), .018);
        }
      }
    });
  },
  fork(b) {
    const L = b.look, H = L.h * b.t ** .9, r = b.r;
    const trunk = [V(), V(0, H * .35, 0)];
    b.stem(trunk, .01 * (.4 + b.t));
    for (let k = 1; k <= 4; k++) b.leaf(V(0, H * .35 * k / 4.5, 0), V(Math.cos(k * 2.4), .3, Math.sin(k * 2.4)), L.leafSize * 1.1);
    const tips = [];
    const grow = (p, dir, len, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      b.stem([p, p.clone().lerp(end, .5).add(V((r() - .5) * .02, 0, 0)), end], .007 * (depth + 1) / 3);
      for (let k = 1; k <= 4; k++) b.leaf(p.clone().lerp(end, k / 4), V(r() - .5, .3, r() - .5), L.leafSize);
      if (depth > 0 && b.t > .25) for (const s of [-1, 1]) grow(end, dir.clone().applyAxisAngle(UP, r() * 3).add(V(s * .35, .1, (r() - .5) * .4)).normalize(), len * .78, depth - 1);
      else tips.push(end);
    };
    grow(trunk[1], V(0, 1, 0), H * .25, 2);
    const count = L.fruit?.count || 0;
    for (let i = 0; i < count && b.t > .5; i++) {
      const tp = tips[i % tips.length].clone().add(V((r() - .5) * .1, -.06 - r() * .1, (r() - .5) * .1));
      b.fruitAt(tp, L.fruit.r, true);
      b.flowerAt(tp.clone().add(V(0, .05, 0)), .014);
    }
  },
  climber(b) {
    const L = b.look, H = L.h * b.t ** .85, r = b.r;
    if (b.t > .2) {
      const wood = '#9a7a55';
      if (L.support === 'trellis') { for (const x of [-.18, .18]) b.stem([V(x, -.1, -.05), V(x, L.h, -.05)], .008, wood); for (let y = .3; y < L.h; y += .3) b.stem([V(-.18, y, -.05), V(.18, y, -.05)], .004, wood); }
      else if (L.support === 'canes') for (const a of [0, 2.1, 4.2]) b.stem([V(Math.cos(a) * .15, -.1, Math.sin(a) * .15), V(0, L.h * 1.05, 0)], .008, '#b49058');
      else if (L.support === 'wire') { for (const x of [-.5, .5]) b.stem([V(x, -.1, 0), V(x, L.h, 0)], .02, wood); for (const y of [.6, 1.1, 1.6]) b.stem([V(-.5, y, 0), V(.5, y, 0)], .0025, '#8a8a8a'); }
      else b.stem([V(.05, -.1, -.05), V(.02, L.h, -.06), V(-.04, L.h * .9, -.04)], .006, '#8a6a4a');
    }
    if (L.support === 'wire') { // a grapevine: woody trunk trained along the wires
      b.stem([V(0, 0, 0), V(.02, .55, 0)], .025 * b.t + .004, L.wood);
      for (const s of [-1, 1]) {
        const pts = []; for (let i = 0; i <= 8; i++) pts.push(V(s * i / 8 * .48 * b.t, .6 + Math.sin(i) * .02, .01));
        b.stem(pts, .012 * b.t + .003, L.wood);
        pts.forEach((p, i) => {
          if (i === 0) return;
          for (let k = 0; k < 3; k++) b.leaf(p.clone().add(V((r() - .5) * .05, .04 + k * .2, .02)), V(s * .4 + (r() - .5) * .4, 1.2, .35 + r() * .3), L.leafSize * (1 - k * .15));
          if (i % 2 === 1) b.fruitAt(p.clone().add(V(0, -.02, .06)), L.fruit.r);
        });
      }
      return;
    }
    const n = Math.max(3, Math.round(lerp(3, 22, b.t)));
    const pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n, a = k * 9 + .5; const rad = L.support === 'canes' ? .15 * (1 - k) + .02 : .06; pts.push(V(Math.cos(a) * rad, H * k, Math.sin(a) * rad - .02)); }
    b.stem(pts, .006 * (.5 + b.t));
    pts.forEach((p, i) => {
      if (i === 0) return;
      const az = i * 2.2;
      b.leaf(p, V(Math.cos(az), .2, Math.sin(az) + .6), L.leafSize);
      if (i % 2 === 0 && i > 2) {
        const fp = p.clone().add(V(Math.cos(az + 2) * .07, -.02, Math.sin(az + 2) * .07 + .05));
        b.fruitAt(fp, L.fruit.r, true);
        b.flowerAt(fp.clone().add(V(0, .03, 0)), .02);
      }
    });
  },
  giantleaf(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(2, 11, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, rise = .25 + r() * .4, len = L.h * (.5 + r() * .5) * b.t ** .6;
      const end = V(Math.cos(a) * len * .7, len * rise + .05, Math.sin(a) * len * .7);
      b.stem([V(), V(end.x * .4, end.y * .9, end.z * .4), end], .01);
      b.leaf(end, V(Math.cos(a), .15, Math.sin(a)), L.leafSize);
    }
    const k = smooth(.72, .98, b.t);
    for (let i = 0; i < L.fruit.count; i++) {
      const a = i * 2.1 + .4;
      const p = V(Math.cos(a) * .12, .04, Math.sin(a) * .12);
      if (k > 0) { const q = new THREE.Quaternion().setFromUnitVectors(UP, V(Math.cos(a), .25, Math.sin(a)).normalize()); b.fruits.push({ m: new THREE.Matrix4().compose(p.addScaledVector(V(Math.cos(a), .1, Math.sin(a)), L.fruit.len * .45 * k), q, V(L.fruit.r, L.fruit.len / 4.2, L.fruit.r).multiplyScalar(k)), ripe: 1 }); }
      b.flowerAt(V(Math.cos(a + 1) * .1, .12, Math.sin(a + 1) * .1), .05);
    }
  },
  // pumpkins, squash and melons: vines crawling over the ground, big fruit sitting on it
  sprawl(b) {
    const L = b.look, r = b.r;
    const vines = 5, reach = .7 * b.t ** .8;
    const tips = [];
    for (let v = 0; v < vines; v++) {
      const a = v * 1.57 + r() * .5, pts = [];
      for (let i = 0; i <= 10; i++) { const k = i / 10, aa = a + Math.sin(k * 4 + v) * .3; pts.push(V(Math.cos(aa) * reach * k, .015 + Math.sin(k * 9) * .006, Math.sin(aa) * reach * k)); }
      b.stem(pts, .009);
      pts.forEach((p, i) => {
        if (i === 0) return;
        const up = p.clone().add(V(0, L.h * (.4 + r() * .5) * (1 - i / 14), 0));
        b.stem([p, p.clone().lerp(up, .6).add(V(0, 0, .01)), up], .005);
        b.leaf(up, V(Math.cos(a + r()), .6, Math.sin(a + r())), L.leafSize * (1 - i / 16));
        if (i === 4) b.flowerAt(p.clone().add(V(0, .06, 0)), .045);
      });
      tips.push(pts[6]);
    }
    const k = smooth(.7, .98, b.t);
    for (let i = 0; i < (L.fruit.count || 1) && k > 0; i++) {
      const p = tips[(i * 2 + 1) % tips.length].clone(); const R = L.fruit.r * k;
      const lie = L.fruit.kind === 'squash' ? new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), 1.45).premultiply(new THREE.Quaternion().setFromAxisAngle(UP, i * 2)) : new THREE.Quaternion().setFromAxisAngle(UP, r() * 6);
      p.y = L.fruit.kind === 'squash' ? R * .9 : R * (L.fruit.kind === 'pumpkin' ? .62 : .76);
      b.fruits.push({ m: new THREE.Matrix4().compose(p, lie, V(R, R, R)), ripe: b.t });
      if (L.fruit.kind === 'pumpkin') b.part('stalk', stalkGeo(), stdMat('#6b6a3a', .8), new THREE.Matrix4().compose(p.clone().add(V(0, R * .5, 0)), new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), .3), V(R * .5, R * .35, R * .5)));
    }
  },
  crown(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(2, 16, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, len = L.h * (.6 + r() * .5) * (.4 + b.t * .6);
      const end = V(Math.cos(a) * len * .5, len, Math.sin(a) * len * .5);
      b.stem([V(), end.clone().multiplyScalar(.5).add(V(0, len * .2, 0)), end], .003);
      b.leaf(end, V(Math.cos(a), .4, Math.sin(a)), L.leafSize, 'trifoliate');
    }
    for (let i = 0; i < L.fruit.count; i++) {
      const a = i * 2.7 + 1, d = .12 + r() * .1;
      const tip = V(Math.cos(a) * d, .02 + r() * .03, Math.sin(a) * d);
      b.stem([V(0, .02, 0), V(tip.x * .5, .1, tip.z * .5), tip.clone().add(V(0, .02, 0))], .002);
      b.fruitAt(tip, L.fruit.r * (.8 + r() * .4), false);
      b.flowerAt(tip.clone().add(V(0, .03, 0)), .014);
    }
  },
  canes(b) {
    const L = b.look, r = b.r;
    const canes = L.canes || 5;
    for (let c = 0; c < canes; c++) {
      const a = c * 1.3, H = L.h * (.7 + r() * .3) * b.t ** .8;
      const lean = V(Math.cos(a) * (L.arch ? .5 : .12), 0, Math.sin(a) * (L.arch ? .5 : .12));
      let pts = upPath(r, V(Math.cos(a) * .05, 0, Math.sin(a) * .05), H, 8, .03, lean);
      if (L.arch) pts = pts.map((p, i) => { const k = i / 8; p.y = H * Math.sin(k * Math.PI * .8) * .9; return p; });
      b.stem(pts, .008, L.caneColor || '#7d5a3e');
      pts.forEach((p, i) => {
        if (i < 2) return;
        b.leaf(p, V(Math.cos(a + i * 2), .2, Math.sin(a + i * 2)), L.leafSize);
        b.leaf(p, V(Math.cos(a + i * 2 + 2.5), .35, Math.sin(a + i * 2 + 2.5)), L.leafSize * .7);
        if (i > 3) for (let k = 0; k < 2; k++) {
          const fp = p.clone().add(V((r() - .5) * .12, -.04, (r() - .5) * .12));
          b.fruitAt(fp, L.fruit.r, true);
          b.flowerAt(fp.clone().add(V(0, .02, 0)), .012);
        }
      });
    }
  },
  shrub(b) {
    const L = b.look, r = b.r;
    const tips = [];
    const dens = L.density || 6;
    const grow = (p, dir, len, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      b.stem([p, end], .004 * (depth + 1) * Math.min(1, L.h * 1.1), L.wood);
      for (let k = 1; k <= dens; k++) b.leaf(p.clone().lerp(end, k / dens), V(r() - .5, L.upright ? .9 : .4, r() - .5), L.leafSize);
      if (depth > 0) for (let i = 0; i < 2; i++) grow(end, dir.clone().add(V((r() - .5) * (L.upright ? .5 : .9), .2, (r() - .5) * (L.upright ? .5 : .9))).normalize(), len * .75, depth - 1);
      else tips.push(end);
    };
    const S = L.h * b.t ** .8;
    for (let i = 0; i < (L.fruit ? 4 : 6); i++) grow(V((r() - .5) * .04, 0, (r() - .5) * .04), V((r() - .5) * (L.upright ? .3 : .7), 1, (r() - .5) * (L.upright ? .3 : .7)).normalize(), S * .32, b.t > .3 ? 3 : 1);
    tips.forEach((tp) => {
      const per = L.fruit?.per || 3;
      for (let k = 0; k < per; k++) {
        const fp = tp.clone().add(V((r() - .5) * .06, -.03 - r() * .04, (r() - .5) * .06));
        if (L.fruit) b.fruitAt(fp, L.fruit.r, true);
        b.flowerAt(L.fruit ? fp : tp.clone().add(V((r() - .5) * .03, .01, (r() - .5) * .03)), L.fruit ? .008 : L.leafSize * .5);
      }
    });
  },
  herb(b) {
    const L = b.look, r = b.r;
    for (let s = 0; s < L.stems; s++) {
      const a = s * 2.4, H = L.h * (.6 + r() * .4) * b.t ** .8;
      const pts = upPath(r, V(Math.cos(a) * .02, 0, Math.sin(a) * .02), H, 9, .02, V(Math.cos(a) * .2, 0, Math.sin(a) * .2));
      b.stem(pts, .004);
      pts.forEach((p, i) => {
        if (i === 0) return;
        const az = a + (i % 2) * Math.PI / 2;
        const ls = L.leafSize * (1.2 - i / 11);
        b.leaf(p, V(Math.cos(az), .35, Math.sin(az)), ls);
        b.leaf(p, V(-Math.cos(az), .35, -Math.sin(az)), ls);
      });
      if (L.umbel && b.t > .6) { // dill: a flat umbrella of tiny yellow flowers
        const top = pts[pts.length - 1];
        for (let i = 0; i < 14; i++) { const aa = i * 2.39996, d = .05 * Math.sqrt(i / 14 + .05); const fp = top.clone().add(V(Math.cos(aa) * d, .03, Math.sin(aa) * d)); b.stem([top, fp], .0012); b.part('umbel', new THREE.SphereGeometry(1, 6, 5), stdMat(L.umbel, .6), new THREE.Matrix4().compose(fp, new THREE.Quaternion(), V(.006, .004, .006))); }
      }
    }
  },
  rosette(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(3, L.count, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, k = i / n; // outer leaves are older
      const tilt = L.cup ? lerp(2.4, .5, k) : L.upright ? lerp(3, 1.1, k) : lerp(.15, 1.2, k);
      const base = V(0, L.tall ? (1 - k) * L.h * .5 * b.t : .01, 0);
      const pl = (L.petiole || 0) * (1 - k * .5) * b.t;
      const dir = V(Math.cos(a), tilt, Math.sin(a)).normalize();
      const start = base.clone().addScaledVector(dir, pl);
      if (pl > 0) b.stem([base, start], .004);
      b.leaf(start, dir, L.leafSize * (L.cup ? lerp(.55, 1, k) : lerp(1, .55, k)));
    }
  },
  // celery, chard, rhubarb and pak choi: a bunch of thick coloured stalks, each topped by a leaf
  stalks(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(3, L.count, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, k = i / n;
      const H = L.h * (.65 + r() * .35) * b.t ** .7, out = L.upright ? .14 + k * .2 : .35 + k * .4;
      const end = V(Math.cos(a) * H * out, H, Math.sin(a) * H * out);
      const color = L.stalkColors[i % L.stalkColors.length];
      b.stem([V(Math.cos(a) * .01, 0, Math.sin(a) * .01), V(end.x * .35, H * .55, end.z * .35), end], L.stalkR * (.6 + b.t * .5), color, stdMat(color, .45));
      b.leaf(end.clone().addScaledVector(V(Math.cos(a), 0, Math.sin(a)), -.01), V(Math.cos(a) * out, 1, Math.sin(a) * out), L.leafSize * (1 - k * .3));
    }
  },
  // broccoli, cauliflower, cabbage and sprouts: big leaves around a head (or a tall stalk of sprouts)
  brassica(b) {
    const L = b.look, r = b.r, Hd = L.head;
    const hk = smooth(.5, .95, b.t);
    if (L.stalk) { // brussels sprouts: a tall stem studded with little sprouts, a tuft of leaves on top
      const H = L.h * b.t ** .8;
      b.stem([V(), V(.01, H * .5, 0), V(0, H, 0)], .018 * (.4 + b.t), '#7f9f6a');
      for (let i = 0; i < 9; i++) b.leaf(V(0, H * (.85 + i * .015), 0), V(Math.cos(i * 2.4), .6, Math.sin(i * 2.4)), L.leafSize);
      for (let i = 0; i < 36 && hk > 0; i++) { const y = .08 + (i / 36) * H * .75, a = i * 2.39996; b.fruits.push({ m: new THREE.Matrix4().compose(V(Math.cos(a) * .028, y, Math.sin(a) * .028), new THREE.Quaternion().setFromAxisAngle(UP, a), V(Hd.r, Hd.r, Hd.r).multiplyScalar(hk * (1 - i / 60))), ripe: 1 }); }
      return;
    }
    const n = Math.round(lerp(4, 13, b.t));
    const hy = L.h * (L.head.kind === 'cabbage' ? .25 : .5) * b.t;
    b.stem([V(), V(0, hy, 0)], .02 * (.4 + b.t), '#9fb48a');
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, k = i / n;
      const dir = V(Math.cos(a), L.wrap ? lerp(2.2, .5, k) : lerp(1.1, .35, k), Math.sin(a)).normalize();
      const base = V(0, hy * (1 - k) * (L.head.kind === 'cabbage' ? .9 : .55), 0);
      b.stem([base, base.clone().addScaledVector(dir, .06)], .006, L.leafColor);
      b.leaf(base.clone().addScaledVector(dir, .05), dir, L.leafSize * (L.wrap ? lerp(.55, 1, k) : 1));
    }
    if (hk <= 0) return;
    const R = Hd.r * hk;
    if (Hd.kind === 'broccoli') { // a dome of florets on thick pale stems
      for (let i = 0; i < 22; i++) {
        const y = 1 - (i + .5) / 22 * .6, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
        const p = V(Math.cos(a) * rr * R, hy + R * .3 + y * R * .6, Math.sin(a) * rr * R);
        b.stem([V(0, hy, 0), p], R * .1, '#9fbf7a');
        b.fruits.push({ m: new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(UP, a), V(R, R, R).multiplyScalar(.36)), ripe: 1 });
      }
    } else b.fruits.push({ m: new THREE.Matrix4().compose(V(0, hy + R * (Hd.kind === 'cauliflower' ? .05 : .7), 0), new THREE.Quaternion(), V(R, R, R)), ripe: 1 });
  },
  // asparagus: spears pushing up in spring, feathery fern behind them later in the year
  spears(b) {
    const L = b.look, r = b.r;
    for (let i = 0; i < 6; i++) {
      const a = i * 2.39996, d = .04 + r() * .05, h = (.12 + r() * .14) * smooth(.1, .5, b.t);
      if (h <= 0) continue;
      const base = V(Math.cos(a) * d, 0, Math.sin(a) * d);
      b.stem([base, base.clone().add(V((r() - .5) * .01, h, 0))], .0075, '#6f9a45', stdMat('#6f9a45', .5));
      b.part('tip', fruitGeo('cone'), stdMat('#7a5a8a', .5), new THREE.Matrix4().compose(base.clone().add(V(0, h + .006, 0)), new THREE.Quaternion(), V(.0085, .016, .0085)));
    }
    const fk = smooth(.45, .9, b.t);
    for (let s = 0; s < 5 && fk > 0; s++) {
      const a = s * 1.3 + .4, H = L.h * (.6 + r() * .4) * fk;
      const pts = upPath(r, V(Math.cos(a) * .12, 0, Math.sin(a) * .12 - .1), H, 6, .03, V(Math.cos(a) * .15, 0, Math.sin(a) * .15));
      b.stem(pts, .004);
      pts.forEach((p, i) => { if (i < 2) return; for (let k = 0; k < 3; k++) b.leaf(p, V(Math.cos(a + k * 2.1 + i), .5, Math.sin(a + k * 2.1 + i)), L.leafSize * (1 - i / 9)); });
    }
  },
  // sweetcorn: three stalks, long arching blades, cobs in husks, a tassel on top
  corn(b) {
    const L = b.look, r = b.r;
    for (let s = 0; s < 3; s++) {
      const a = s * 2.1, base = V(Math.cos(a) * .12, 0, Math.sin(a) * .12), H = L.h * (.85 + r() * .15) * b.t ** .9;
      const pts = upPath(r, base, H, 6, .02);
      b.stem(pts, .014 * (.4 + b.t), '#7aa85a');
      for (let i = 1; i < 9; i++) {
        const y = H * i / 10, az = a + i * Math.PI + (r() - .5) * .6;
        b.leaf(base.clone().add(V(0, y, 0)), V(Math.cos(az), 1.3 - i * .06, Math.sin(az)), L.leafSize * (1 - Math.abs(i - 4) / 10));
      }
      if (b.t > .55) for (let i = 0; i < 8; i++) { const aa = i * .8; const top = base.clone().add(V(0, H, 0)); b.stem([top, top.clone().add(V(Math.cos(aa) * .08, .14, Math.sin(aa) * .08))], .002, '#cdb47a'); }
      const k = smooth(.72, .98, b.t);
      if (k > 0) {
        const at = base.clone().add(V(Math.cos(a + 1) * .03, H * .5, Math.sin(a + 1) * .03));
        const q = new THREE.Quaternion().setFromUnitVectors(UP, V(Math.cos(a + 1) * .35, 1, Math.sin(a + 1) * .35).normalize());
        b.fruits.push({ m: new THREE.Matrix4().compose(at, q, V(L.fruit.r, L.fruit.r, L.fruit.r).multiplyScalar(k)), ripe: 1 });
        for (let h = 0; h < 4; h++) b.part('husk', leafGeo('strap'), leafMat('strap'), b.frame(at.clone().add(V(0, -.07 * k, 0)), V(Math.cos(a + 1 + h * 1.6) * .25, 1, Math.sin(a + 1 + h * 1.6) * .25), V(.25 * k, .22 * k, .25 * k)), '#a9c47a');
        b.stem([at.clone().add(V(0, .08 * k, 0)), at.clone().add(V(Math.cos(a) * .02, .13 * k, 0))], .003, '#c8a86a');
      }
    }
  },
  sunflower(b) {
    const L = b.look, r = b.r, H = L.h * b.t ** .9;
    const pts = upPath(r, V(), H, 8, .03);
    b.stem(pts, .016 * (.4 + b.t), '#5f8a3a');
    pts.forEach((p, i) => { if (i === 0 || i > 7) return; for (const o of [0, 3.1]) { const az = i * 2.4 + o; b.leaf(p, V(Math.cos(az), .25, Math.sin(az)), L.leafSize * (1.2 - i / 10) * (o ? .8 : 1)); } });
    const k = smooth(.45, .85, b.t), top = pts[pts.length - 1];
    if (k <= 0) return;
    sunHead(b, top, V(.25, .45, 1).normalize(), .13 * k);
  },
};
function sunHead(b, top, face, R) {
  {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, face);
    const disc = new THREE.Mesh(cached('sundisc', () => new THREE.CylinderGeometry(1, .9, .25, 40)), [stdMat('#4a6a2a', .8), mat('sunhead', () => new THREE.MeshStandardMaterial({ map: fruitTexture('sunhead'), roughness: .9 })), stdMat('#4a6a2a', .8)]);
    disc.position.copy(top).addScaledVector(face, .02); disc.quaternion.copy(q); disc.scale.set(R, R * .3, R); b.group.add(disc);
    const side = V(1, 0, 0).applyQuaternion(q), up2 = V(0, 0, 1).applyQuaternion(q);
    for (let i = 0; i < 34; i++) {
      const a = i / 34 * Math.PI * 2 + (i % 2) * .09, dir = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up2, Math.sin(a)).addScaledVector(face, .12 * (i % 2));
      b.part('petal', leafGeo('lance'), leafMat('lance'), b.frame(disc.position.clone().addScaledVector(dir, R * .92), dir, V(R * .55, R * .9, R * .55), face), i % 2 ? '#f2b81a' : '#f6c935');
    }
  }
}
Object.assign(BUILD, {
  root(b) {
    const L = b.look, R = L.root, r = b.r;
    const n = Math.round(lerp(2, 10, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, dir = V(Math.cos(a) * .5, 1, Math.sin(a) * .5);
      if (L.petioleColor) { const end = dir.clone().normalize().multiplyScalar(L.h * .35 * b.t); b.stem([V(0, .01, 0), end], .004, L.petioleColor, stdMat(L.petioleColor, .5)); b.leaf(end, dir, L.leafSize * (.7 + r() * .3)); }
      else b.leaf(V(0, .01, 0), dir, L.leafSize * (.7 + r() * .3));
    }
    const k = smooth(.3, 1, b.t);
    if (k > 0) {
      const s = R.r * k;
      const sc = R.kind === 'carrot' ? V(s, R.len / 2 * k, s) : V(s, s, s);
      const sink = R.kind === 'carrot' ? -R.len / 2 * k + .015 : R.kind === 'beet' || R.kind === 'turnip' ? s * .1 : -s * .2;
      b.fruits.push({ m: new THREE.Matrix4().compose(V(0, sink, 0), new THREE.Quaternion(), sc), ripe: 1 });
      if (b.t > .9) b.fruits.push({ m: new THREE.Matrix4().compose(V(.2, (R.kind === 'carrot' ? s : s * .9), .12), new THREE.Quaternion().setFromAxisAngle(V(0, .3, 1).normalize(), 1.45), sc), ripe: 1 });
    }
  },
  potato(b) {
    const look = b.look;
    b.look = { ...look, fruit: null };
    BUILD.fork(b);
    const R = look.root;
    const k = smooth(.75, 1, b.t);
    for (let i = 0; i < 5 && k > 0; i++) {
      const a = i * 1.25 - 2.5;
      b.fruits.push({ m: new THREE.Matrix4().compose(V(.25 + Math.cos(a) * .12, R.r * .6, .1 + Math.sin(a) * .12), new THREE.Quaternion().setFromAxisAngle(UP, i), V(R.r, R.r, R.r).multiplyScalar(k * (.7 + (i % 3) * .2))), ripe: 1 });
    }
  },
  allium(b) {
    const L = b.look, R = L.root, r = b.r;
    const k = smooth(.2, 1, b.t);
    const leafM = stdMat(L.leafColor, .55, { side: THREE.DoubleSide });
    const plants = L.bunch || 1;
    for (let pI = 0; pI < plants; pI++) {
      const off = plants > 1 ? V(Math.cos(pI * 2.4) * .03, 0, Math.sin(pI * 2.4) * .03) : V();
      const bulbR = R.r * k;
      if (L.leek) { // a thick white shaft fading to green, leaves fanned in one plane
        const sh = .25 * k;
        b.part('shaft', fruitGeo('leek'), fruitMat('leek'), new THREE.Matrix4().compose(off, new THREE.Quaternion(), V(R.r * k, sh / 12, R.r * k)), '#f2f0e4');
        for (let i = 0; i < 8; i++) { const s = i % 2 ? 1 : -1, y = sh * (.85 + i * .03); const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, y, 0), V(s * .04, y + .18, 0), V(s * (.12 + i * .02), y + .3 + i * .02, 0), V(s * (.2 + i * .03), y + .28, 0)]), 12, .012, 4); g.scale(1, 1, .25); b.group.add(new THREE.Mesh(g, leafM)); }
        continue;
      }
      const n = L.tuft || Math.round(lerp(1, 8, b.t));
      for (let i = 0; i < n; i++) {
        const a = i * 2.4, H = L.h * (.7 + r() * .3) * b.t ** .7, spread = L.tuft ? .05 : .2;
        const pts = [off.clone().add(V(0, bulbR, 0)), off.clone().add(V(Math.cos(a) * .015, H * .5, Math.sin(a) * .015)), off.clone().add(V(Math.cos(a) * spread * .6, H, Math.sin(a) * spread * .6)), off.clone().add(V(Math.cos(a) * spread, H * .9, Math.sin(a) * spread))];
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, L.tuft ? .0025 : L.flat ? .008 : .006, 5);
        if (L.flat) g.scale(1, 1, .4);
        b.group.add(new THREE.Mesh(g, leafM));
        if (L.tuft && i % 4 === 0 && b.t > .6) b.part('pompom', fruitGeo('raspberry'), stdMat(L.flower, .7), new THREE.Matrix4().compose(pts[2].clone().add(V(0, .02, 0)), new THREE.Quaternion(), V(.012, .012, .012)));
      }
      if (bulbR > 0 && !L.tuft) b.fruits.push({ m: new THREE.Matrix4().compose(off.clone().add(V(0, bulbR * .6, 0)), new THREE.Quaternion(), V(bulbR, bulbR * (plants > 1 ? 1.6 : 1), bulbR)), ripe: 1 });
    }
  },
  tree(b) {
    const L = b.look, r = b.r;
    b.noPetiole = true; // a tree has hundreds of leaves: skip their little stalks
    const H = L.h * lerp(.06, 1, b.t ** 1.1);
    const material = barkMaterial(L.bark);
    const tips = [];
    if (L.conifer) { // scots pine: a tall straight trunk, branches only near the top, tufts of needles
      const trunk = new THREE.Mesh(taperedTube(new THREE.CatmullRomCurve3([V(), V(H * .01, H * .5, 0), V(-H * .01, H, 0)]), 10, H * .022, .3, 10), material);
      trunk.castShadow = true; b.group.add(trunk);
      const nb = Math.round(lerp(5, 22, b.t));
      for (let i = 0; i < nb; i++) {
        const y = H * lerp(.5, .96, i / nb), a = i * 2.39996, len = H * .26 * (1 - (i / nb) * .6);
        const dir = V(Math.cos(a), .18 + r() * .2, Math.sin(a)).normalize();
        const p = V(0, y, 0), end = p.clone().addScaledVector(dir, len);
        const g = taperedTube(new THREE.CatmullRomCurve3([p, p.clone().lerp(end, .5).add(V(0, len * .1, 0)), end]), 5, H * .007, .4, 6);
        const m = new THREE.Mesh(g, material); m.castShadow = true; b.group.add(m);
        for (let k = 0; k < 12; k++) {
          const q = p.clone().lerp(end, .35 + k * .055).add(V((r() - .5), (r() - .2) * .5, (r() - .5)).multiplyScalar(H * .05));
          b.leaf(q, V(r() - .5, .8, r() - .5), L.leafSize * (H / L.h) ** .4);
          if (k === 3 && L.fruit && b.t > .7) b.fruitAt(q.clone().add(V(0, -.1, 0)), L.fruit.r * (H / L.h) ** .3);
        }
      }
      return;
    }
    const depthMax = b.t < .3 ? 2 : b.t < .6 ? L.depth - 1 : L.depth;
    const grow = (p, dir, len, rad, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      const mid = p.clone().lerp(end, .5).add(V((r() - .5) * len * .1, 0, (r() - .5) * len * .1));
      const m = new THREE.Mesh(taperedTube(new THREE.CatmullRomCurve3([p, mid, end]), 6, rad, .62, 8), material); m.castShadow = true; b.group.add(m);
      if (depth >= depthMax) { tips.push({ p: end, dir }); return; }
      const kids = depth === 0 ? (L.slender ? 4 : 3) : 2 + (r() > .5 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = L.wide ? .95 : L.slender || L.slim ? .45 : .7;
        const nd = dir.clone().add(V(Math.cos(i * 2.4 + r()) * spread, .15 + r() * .3, Math.sin(i * 2.4 + r()) * spread));
        if (L.slender && depth >= 2) nd.y -= .5; // birch twigs droop
        nd.normalize();
        const start = depth === 0 ? p.clone().lerp(end, (L.slender ? .5 : .62) + i * ((L.slender ? .5 : .38) / kids)) : end;
        grow(start, nd, len * (L.slender ? .62 : .68), rad * .6, depth + 1);
      }
    };
    grow(V(), UP.clone(), H * (L.slender ? .55 : .42), H * (L.slender ? .018 : .03), 0);
    const per = L.dense ? 34 : L.slender ? 28 : 28;
    const fruitTips = L.fruit ? Math.ceil(L.fruit.count / tips.length) : 0;
    tips.forEach(({ p }) => {
      for (let i = 0; i < per; i++) {
        const q = p.clone().add(V((r() - .5), (r() - .5) * .8, (r() - .5)).multiplyScalar(H * (L.slender ? .07 : .09)));
        b.leaf(q, V(r() - .5, L.slender ? -.4 : .3, r() - .5), L.leafSize * .8 * (H / L.h) ** .3);
      }
      for (let i = 0; i < fruitTips && b.t > .7; i++) {
        const q = p.clone().add(V((r() - .5), -.4 - r() * .3, (r() - .5)).multiplyScalar(H * .08));
        b.fruitAt(q, L.fruit.r * (H / 2) ** .15);
        b.flowerAt(q.clone().add(V(0, .03, 0)), .02 * (H / 2));
      }
    });
  },
});

// Build a plant group for `id` at growth t (0 seed .. 1 fruiting).
export function buildPlant(id, t = 1, seed = 11) {
  const look = LOOKS[id] || LOOKS.basil;
  if (t < .08) { // just a seed in the soil
    const g = new THREE.Group();
    const s = new THREE.Mesh(cached('seed', () => new THREE.SphereGeometry(.012, 10, 8)), stdMat('#8a6a3e', .8));
    s.scale.set(1.3, .8, 1); s.position.y = .006; g.add(s);
    return g;
  }
  if (t < .2) { // sprout: two seed leaves
    const b = new Builder({ ...look, leaf: 'oval', leafSize: .035, fruit: null, root: null, head: null, flower: null, glossy: false }, 1, seed);
    const h = .03 + (t - .08) * .5;
    b.stem([V(), V(.004, h * .6, 0), V(0, h, 0)], .0025);
    b.leafSizeK = .6 + (t - .08) * 3;
    b.leaf(V(0, h, 0), V(1, .5, 0), .035, 'oval');
    b.leaf(V(0, h, 0), V(-1, .5, 0), .035, 'oval');
    return b.finish();
  }
  const b = new Builder(look, t, seed);
  BUILD[look.habit](b);
  b.look = look;
  return b.finish();
}

// Pre-build n growth stages once, so a scroll story can show one and hide the rest instead of rebuilding.
export function buildGrowthFrames(id, n = 8, seed = 11) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : lerp(.03, 1, i / (n - 1));
    const g = buildPlant(id, t, seed); g.userData.t = t; g.visible = i === n - 1; frames.push(g);
  }
  return frames;
}

// Free per-plant geometry; shared (cached) geometry, materials and textures stay alive for reuse.
export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!m.userData.shared) m.dispose(); });
    if (o.isInstancedMesh) o.dispose?.();
  });
}

// A soil plug or ground disc for the plant to stand on
export function ground(kind = 'soil', radius = .35) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), mat('ground:' + kind, () => new THREE.MeshStandardMaterial({ map: kind === 'grass' ? grassTexture() : soilTexture(), roughness: 1 })));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; g.add(top);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .96, radius * .14, 48, 1, true), mat('groundside:' + kind, () => new THREE.MeshStandardMaterial({ color: kind === 'grass' ? '#5a3e2b' : '#3a281c', roughness: 1, side: THREE.DoubleSide })));
  side.position.y = -radius * .07; g.add(side);
  return g;
}

// ---------- the harvest: one picked item, shown on its own ----------
const HARVEST = {
  tomato: ['One tomato', 6], pepper: ['One sweet pepper', 9], chilli: ['One chilli', 7], aubergine: ['One aubergine', 20], cucumber: ['One cucumber', 22],
  'green-beans': ['A handful of green beans', 14], peas: ['A pea pod', 8], 'broad-beans': ['A broad bean pod', 18], courgette: ['One courgette', 22],
  sweetcorn: ['One corn cob', 20], pumpkin: ['One pumpkin', 30], 'butternut-squash': ['One butternut squash', 25], melon: ['One melon', 15], watermelon: ['One watermelon', 35],
  strawberry: ['One strawberry', 4], raspberry: ['One raspberry', 2], blackberry: ['One blackberry', 2.2], blueberry: ['A few blueberries', 1.3], gooseberry: ['One gooseberry', 2.5],
  blackcurrant: ['A string of blackcurrants', 6], grape: ['A bunch of grapes', 18], rhubarb: ['Rhubarb stalks', 40],
  lettuce: ['One lettuce', 20], spinach: ['Spinach leaves', 15], kale: ['A kale leaf', 30], rocket: ['Rocket leaves', 10], 'swiss-chard': ['Swiss chard stalks', 35], 'pak-choi': ['One pak choi', 20], celery: ['Celery sticks', 30],
  broccoli: ['A head of broccoli', 15], cauliflower: ['One cauliflower', 16], cabbage: ['One cabbage', 18], 'brussels-sprouts': ['A few sprouts', 3], asparagus: ['Asparagus spears', 20],
  carrot: ['One carrot', 18], parsnip: ['One parsnip', 25], radish: ['One radish', 3.5], beetroot: ['One beetroot', 7], turnip: ['One turnip', 8], potato: ['One potato', 8], 'sweet-potato': ['One sweet potato', 15],
  onion: ['One onion', 7], garlic: ['A bulb of garlic', 5], leek: ['One leek', 30], 'spring-onion': ['A bunch of spring onions', 25], chives: ['A bunch of chives', 20],
  basil: ['A sprig of basil', 12], mint: ['A sprig of mint', 12], sage: ['A sprig of sage', 10], rosemary: ['A sprig of rosemary', 12], thyme: ['A sprig of thyme', 10], parsley: ['A sprig of parsley', 12], coriander: ['A sprig of coriander', 12], dill: ['A sprig of dill', 15],
  sunflower: ['A sunflower head', 25], apple: ['One apple', 8], pear: ['One pear', 10], plum: ['One plum', 5], cherry: ['A pair of cherries', 2.2], peach: ['One peach', 7], fig: ['One fig', 6], lemon: ['One lemon', 8], orange: ['One orange', 8],
  rowan: ['A bunch of rowan berries', 8], birch: ['A birch leaf and catkin', 5], oak: ['An oak leaf and acorn', 9], beech: ['A beech leaf and nut', 8], 'scots-pine': ['A pine cone', 5],
};
export function harvestInfo(id) { const h = HARVEST[id] || ['The harvest', 10]; return { label: h[0], sizeCm: h[1] }; }

// one item + its little extras (calyx, stalk, leaf), centred and scaled to its real size
export function buildHarvest(id) {
  const L = LOOKS[id] || LOOKS.basil, b = new Builder({ ...L, leafK: 1 }, 1, 5);
  b.leafSizeK = 1;
  const f = L.fruit || L.head || L.root;
  const one = (kind, sc, pos = V(), q = new THREE.Quaternion(), color) => {
    const m = new THREE.Mesh(fruitGeo(kind), fruitMat(kind));
    m.position.copy(pos); m.quaternion.copy(q); m.scale.copy(typeof sc === 'number' ? V(sc, sc, sc) : sc);
    m.material = fruitMat(kind).clone(); m.material.color.set(color || f?.color || '#ffffff'); m.castShadow = true; b.group.add(m); return m;
  };
  const leafOn = (pos, dir, size, type = L.leaf || 'oval', color = L.leafColor) => {
    const t = type === 'compound' ? 'serrate' : type === 'pinnate' ? 'oval' : type === 'trifoliate' ? 'serrate' : type;
    if (type === 'compound' || type === 'pinnate' || type === 'trifoliate' || type === 'feather') { const n0 = b.leaves.length; b.leaf(pos, dir, size / b.leafSizeK, type); return; }
    const m = new THREE.Mesh(leafGeo(t), leafMat(t, L.glossy)); m.material = m.material.clone(); m.material.color.set(color);
    m.applyMatrix4(b.frame(pos, dir, size, V(0, 1, .3))); b.group.add(m);
  };
  const sprig = () => { // a cut stem lying on the board, leaves in pairs facing up
    const n = id === 'thyme' || id === 'rosemary' ? 9 : 5, len = .12;
    b.stem([V(0, .004, 0), V(len * .5, .006, .004), V(len, .005, 0)], .0022);
    for (let i = 1; i <= n; i++) {
      const x = i / (n + .5) * len, s = L.leafSize * (1.2 - i / (n * 1.6)) * (L.leafK || 1.7) * (L.leaf === 'feather' || L.leaf === 'compound' || L.leaf === 'trifoliate' ? .45 : .62);
      for (const sg of [1, -1]) leafOn(V(x, .006, 0), V(.45, .08, sg), s, L.leaf, L.leafColor);
    }
    leafOn(V(len, .006, 0), V(1, .08, 0), L.leafSize * (L.leafK || 1.7) * .5, L.leaf, L.leafColor);
  };
  switch (true) {
    case ['basil', 'mint', 'sage', 'rosemary', 'thyme', 'parsley', 'coriander', 'dill'].includes(id): sprig(); break;
    case id === 'sunflower': { b.stem([V(0, 0, 0), V(0, .03, -.06)], .008, '#5f8a3a'); sunHead(b, V(0, .03, 0), V(0, 1, .25).normalize(), .12); break; }
    case ['lettuce', 'spinach', 'kale', 'rocket'].includes(id): BUILD.rosette(b); b.look = L; break;
    case ['swiss-chard', 'pak-choi', 'celery', 'rhubarb'].includes(id): b.look = { ...L, count: 4 }; BUILD.stalks(b); b.look = L; break;
    case ['broccoli', 'cauliflower', 'cabbage'].includes(id): { const R = L.head.r; if (L.head.kind === 'broccoli') { for (let i = 0; i < 18; i++) { const y = 1 - (i + .5) / 18 * .6, rr = Math.sqrt(1 - y * y), a = i * 2.39996; const p = V(Math.cos(a) * rr * R, R * .3 + y * R * .6, Math.sin(a) * rr * R); b.stem([V(0, -R * .6, 0), p], R * .12, '#9fbf7a'); one('broccoli', R * .38, p, undefined, L.head.color); } } else one(L.head.kind, R, V(0, L.head.kind === 'cauliflower' ? 0 : R * .8, 0), undefined, L.head.color); break; }
    case id === 'brussels-sprouts': for (let i = 0; i < 4; i++) one('sprout', .018, V(i * .04 - .06, .016, (i % 2) * .03)); break;
    case id === 'asparagus': for (let i = 0; i < 5; i++) { const x = (i - 2) * .018; b.stem([V(x, 0, 0), V(x, .2, 0)], .0075, '#6f9a45', stdMat('#6f9a45', .5)); one('cone', V(.0085, .016, .0085), V(x, .206, 0), undefined, '#7a5a8a'); } b.group.rotation.z = -1.4; break;
    case id === 'sweetcorn': { one('cob', .025, V(0, .095, 0)); for (let h = 0; h < 5; h++) { const a = h * 1.26; const m = new THREE.Mesh(leafGeo('strap'), leafMat('strap')); m.material = m.material.clone(); m.material.color.set(h % 2 ? '#b9cf8a' : '#9fbd72'); m.applyMatrix4(b.frame(V(Math.cos(a) * .02, 0, Math.sin(a) * .02), V(Math.cos(a) * (h < 3 ? .12 : .55), 1, Math.sin(a) * (h < 3 ? .12 : .55)), V(.32, .12, .32), V(Math.cos(a), 0, Math.sin(a)))); b.group.add(m); } b.stem([V(0, .19, 0), V(.01, .23, 0)], .004, '#c8a86a'); break; }
    case id === 'grape' || id === 'rowan': { b.look = { ...L, fruit: { ...L.fruit, r: id === 'rowan' ? .005 : .009 } }; b.t = 1; b.fruitAt(V(0, .15, 0), .01); b.look = L; if (id === 'rowan') leafOn(V(0, .16, 0), V(.8, .3, .2), .07, 'pinnate'); else leafOn(V(0, .16, 0), V(.7, .5, .3), .09, 'palm'); break; }
    case id === 'blackcurrant': { b.look = L; b.t = 1; b.fruitAt(V(0, .1, 0), .006); b.stem([V(0, .108, 0), V(0, .03, 0)], .0008, '#5a4a2a'); b.group.rotation.z = -1.3; break; }
    case id === 'blueberry': [[0, 0], [.014, .004], [-.01, .012], [.004, -.014]].forEach(([x, z]) => one('blueberry', .0065, V(x, .006, z))); break;
    case id === 'cherry': { one('cherry', .011, V(-.013, .01, 0)); one('cherry', .011, V(.013, .01, 0)); b.stem([V(-.013, .02, 0), V(0, .06, 0), V(.013, .02, 0)], .0012, '#5a4128'); leafOn(V(0, .06, 0), V(.6, .4, .3), .06); break; }
    case id === 'oak' || id === 'birch' || id === 'beech' || id === 'scots-pine': {
      if (id === 'scots-pine') { one('cone', V(.022, .032, .022), V(0, .022, 0), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), 1.45), '#ffffff'); leafOn(V(.03, .004, .01), V(1, .05, .3), .05, 'needle', '#2f5a44'); break; }
      leafOn(V(0, 0, 0), V(1, .2, 0), id === 'oak' ? .1 : id === 'beech' ? .08 : .05, L.leaf);
      if (id === 'oak') { one('acorn', .016, V(-.035, .016, .03), undefined, '#8a6a2c'); one('cauliflower', V(.011, .01, .011), V(-.035, .026, .03), new THREE.Quaternion(), '#6a5534'); }
      if (id === 'beech') { for (let i = 0; i < 2; i++) one('beechnut', .012, V(-.03 + i * .02, .012, .03), undefined, '#7a5a34'); }
      if (id === 'birch') { one('catkin', V(.012, .025, .012), V(-.02, .02, .02), new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), .4), '#8a7a46'); }
      break;
    }
    case !!L.root: {
      const R = L.root;
      if (R.kind === 'carrot') { one('carrot', V(R.r, R.len / 2, R.r), V(0, R.len / 2, 0)); for (let i = 0; i < 6; i++) leafOn(V(0, R.len, 0), V(Math.cos(i) * .3, 1, Math.sin(i) * .3), .08, L.leaf); b.group.rotation.z = Math.PI / 2 - .15; }
      else if (R.kind === 'leek') { one('leek', V(.022, .022, .022), V()); for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1; const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, .25, 0), V(s * .02, .35, 0), V(s * .05, .45, 0)]), 8, .012, 4); g.scale(1, 1, .3); b.group.add(new THREE.Mesh(g, stdMat(L.leafColor, .55, { side: THREE.DoubleSide }))); } b.group.rotation.z = -1.4; }
      else if (['onion', 'garlic'].includes(R.kind) && (L.bunch || L.tuft)) { for (let i = 0; i < (L.bunch || 8); i++) { const x = (i - 2) * .008; b.stem([V(x, 0, 0), V(x, .25, 0)], L.tuft ? .0025 : .005, L.leafColor); if (!L.tuft) one('onion', V(.01, .016, .01), V(x, .005, 0), undefined, '#f4f2ea'); } b.group.rotation.z = -1.45; }
      else { one(R.kind, R.r, V(0, R.r * .9, 0)); if (R.kind === 'beet' || R.kind === 'radish' || R.kind === 'turnip') for (let i = 0; i < 4; i++) leafOn(V(0, R.r * 1.7, 0), V(Math.cos(i * 1.6) * .4, 1, Math.sin(i * 1.6) * .4), R.r * 2.4, L.leaf); }
      break;
    }
    case !!f: {
      const kind = f.kind, R = ['cucumber', 'courgette', 'pod'].includes(kind) ? V(f.r, f.len / (kind === 'pod' ? 5 : 4), f.r) : f.r;
      const lying = ['cucumber', 'courgette', 'pod', 'aubergine', 'chilli', 'squash'].includes(kind);
      const q = lying ? new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2) : new THREE.Quaternion();
      const fr = one(kind, R, V(0, typeof R === 'number' ? R * (kind === 'pumpkin' ? .62 : .85) : f.r, 0), q);
      if (id === 'green-beans') for (let i = 1; i < 5; i++) one('pod', V(f.r, f.len / 5, f.r), V(0, f.r * (1 + i * 1.2), (i - 2) * .012), q);
      if (L.calyx && kind !== 'aubergine') { const c = new THREE.Mesh(calyxGeo(), stdMat('#3d6e2a', .7, { side: THREE.DoubleSide })); const s = typeof R === 'number' ? R : f.r; c.position.set(0, fr.position.y + s * (kind === 'strawberry' ? .9 : .8), 0); c.scale.set(s * .7, s, s * .7); b.group.add(c); b.stem([c.position.clone(), c.position.clone().add(V(.004, s * .5, 0))], s * .07, '#3d6e2a'); }
      if (f.stalk || ['tomato', 'pepper', 'pumpkin', 'peach', 'fig', 'lemon', 'orange'].includes(kind)) { const s = typeof R === 'number' ? R : f.r; const top = fr.position.clone().add(V(0, s * (kind === 'pear' ? 1.18 : kind === 'pumpkin' ? .55 : .7), 0)); b.stem([top, top.clone().add(V(s * .1, s * (kind === 'pumpkin' ? .3 : .45), 0))], s * (kind === 'pumpkin' ? .12 : .06), '#5a4128'); if (['apple', 'pear', 'plum', 'peach', 'lemon', 'orange', 'fig'].includes(kind)) leafOn(top.clone().add(V(0, s * .3, 0)), V(.8, .45, .2), s * 1.6, L.leaf); }
      if (kind === 'aubergine') { const c = new THREE.Mesh(calyxGeo(), stdMat('#3d6e2a', .7, { side: THREE.DoubleSide })); c.position.set(-f.r * 1, f.r, 0); c.quaternion.copy(q); c.scale.set(f.r * 1.2, f.r, f.r * 1.2); b.group.add(c); }
    }
  }
  const g = b.finish();
  const wrap = new THREE.Group(); wrap.add(g);
  // centre on the plate and scale to its real size
  const box = new THREE.Box3().setFromObject(wrap), size = box.getSize(V()), c = box.getCenter(V());
  const k = (harvestInfo(id).sizeCm / 100) / Math.max(size.x, size.y, size.z, 1e-6);
  g.position.sub(V(c.x, box.min.y, c.z));
  wrap.scale.setScalar(k);
  return wrap;
}
