// Low-poly herbs and leafy greens in the same soft, flat-shaded style as the Kenney food models:
// faceted leaves, simple stems, a small terracotta pot. Used when no downloaded model exists.
import * as THREE from 'three';
import { rng } from './plants3d-rng.js';

const UP = new THREE.Vector3(0, 1, 0);
const mats = new Map();
const mat = (color) => { if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .78, metalness: 0, side: THREE.DoubleSide })); return mats.get(color); };
mats.forEach((m) => { m.userData.shared = true; });
const geos = new Map();
const cached = (k, make) => { if (!geos.has(k)) { const g = make(); g.userData.shared = true; geos.set(k, g); } return geos.get(k); };

// A faceted leaf: a few points around an outline, folded along the midrib so it catches light in two planes.
function leafGeo(shape) {
  return cached('leaf:' + shape, () => {
    const W = { oval: .5, round: .8, long: .28, frill: .7, needle: .09, lobe: .75, broad: .62 }[shape] ?? .5;
    const n = shape === 'frill' || shape === 'lobe' ? 7 : 5;
    const pos = [], idx = [];
    pos.push(0, 0, 0); // base
    for (let i = 1; i <= n; i++) { // right edge then tip then left edge
      const y = i / (n + 1);
      let w = Math.sin(Math.PI * Math.pow(y, .75)) * W * .5;
      if ((shape === 'frill' || shape === 'lobe') && i % 2) w *= .62;
      pos.push(w, y, 0);
    }
    pos.push(0, 1, 0); // tip
    for (let i = n; i >= 1; i--) { const x = pos[i * 3], y = pos[i * 3 + 1]; pos.push(-x, y, 0); }
    // midrib points for the fold
    const mid = [];
    for (let i = 1; i <= n; i++) { mid.push(pos.length / 3); pos.push(0, i / (n + 1), 0); }
    const tip = n + 1, R = (i) => i, L = (i) => n + 1 + (n - i + 1);
    for (let i = 0; i < n; i++) {
      const m0 = i === 0 ? 0 : mid[i - 1], m1 = mid[i];
      idx.push(m0, R(i + 1), m1); if (i > 0) idx.push(m0, R(i), R(i + 1));
      idx.push(m0, m1, L(i + 1)); if (i > 0) idx.push(m0, L(i + 1), L(i));
    }
    idx.push(mid[n - 1], R(n), tip, mid[n - 1], tip, L(n));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.abs(x) * .55 - y * y * .12); } // fold up, curl back
    g.computeVertexNormals();
    return g;
  });
}
const stemGeo = () => cached('stem', () => { const g = new THREE.CylinderGeometry(.5, .7, 1, 5, 1); g.translate(0, .5, 0); return g; });

function place(group, geo, material, pos, dir, scale) {
  const m = new THREE.Mesh(geo, material);
  m.position.copy(pos);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  m.quaternion.copy(q);
  m.scale.setScalar(scale);
  m.castShadow = true;
  group.add(m);
  return m;
}
function stem(group, a, b, r, color) {
  const d = b.clone().sub(a), len = d.length();
  const m = new THREE.Mesh(stemGeo(), mat(color));
  m.position.copy(a); m.quaternion.setFromUnitVectors(UP, d.normalize()); m.scale.set(r, len, r);
  m.castShadow = true; group.add(m);
}

// What each herb looks like
export const HERBS = {
  basil:       { leaf: 'oval', color: '#5fbf63', stem: '#4f9e4f', stems: 4, h: .34, pairs: 4, size: .075 },
  mint:        { leaf: 'oval', color: '#58ad69', stem: '#5c7d4c', stems: 6, h: .32, pairs: 5, size: .05 },
  parsley:     { leaf: 'frill', color: '#3f9a4b', stem: '#4c8f45', stems: 14, h: .24, tuft: true, size: .085, extra: 2 },
  coriander:   { leaf: 'lobe', color: '#69b860', stem: '#5f9d4f', stems: 14, h: .25, tuft: true, size: .08, extra: 2 },
  chives:      { blades: true, color: '#4f9f4f', flower: '#b98bd8', stems: 14, h: .34 },
  rosemary:    { leaf: 'needle', color: '#5f8f6c', stem: '#7b6a52', stems: 5, h: .38, pairs: 12, size: .05, woody: true },
  thyme:       { leaf: 'oval', color: '#7c9f68', stem: '#7d6a4f', stems: 14, h: .16, pairs: 6, size: .026, woody: true, fine: true },
  sage:        { leaf: 'long', color: '#93b08f', stem: '#7f9478', stems: 5, h: .3, pairs: 4, size: .085 },
  dill:        { leaf: 'needle', color: '#6fae58', stem: '#6c9d4d', stems: 4, h: .48, pairs: 10, size: .06, umbel: '#e6cf4f' },
  kale:        { leaf: 'frill', color: '#3d6e4c', stem: '#6b8f63', stems: 12, h: .34, tuft: true, size: .22, low: .55 },
  spinach:     { leaf: 'broad', color: '#3f8a45', stem: '#6aa154', stems: 14, h: .12, tuft: true, size: .15, low: .9 },
  rocket:      { leaf: 'lobe', color: '#4f9a4a', stem: '#6fa556', stems: 16, h: .13, tuft: true, size: .13, low: .9 },
  'swiss-chard': { leaf: 'broad', color: '#2f7a3f', stem: '#d8414f', stems: 10, h: .3, tuft: true, size: .19, low: .45, stalks: ['#d8414f', '#f2c33d', '#f08a2c', '#f4f0e6'] },
  'pak-choi':  { leaf: 'broad', color: '#3f8f45', stem: '#eef3e6', stems: 9, h: .3, tuft: true, size: .13, upright: true, thick: true },
  rhubarb:     { leaf: 'lobe', color: '#3f8a45', stem: '#c8394c', stems: 7, h: .55, tuft: true, size: .28, thick: true },
};
export const isHerb = (id) => id in HERBS;
const GREENS = new Set(['kale', 'spinach', 'rocket', 'swiss-chard', 'pak-choi', 'rhubarb']);

function herbBody(id, seed = 3, scale = 1) {
  const H = HERBS[id], r = rng(seed), g = new THREE.Group();
  if (H.blades) { // chives: tall hollow blades with lilac pom-poms
    for (let i = 0; i < H.stems; i++) {
      const a = i * 2.4, lean = .05 + r() * .12, h = H.h * (.75 + r() * .3);
      const top = new THREE.Vector3(Math.cos(a) * lean, h, Math.sin(a) * lean);
      stem(g, new THREE.Vector3(Math.cos(a) * .012, 0, Math.sin(a) * .012), top, .006, H.color);
      if (i % 3 === 0) { const f = new THREE.Mesh(cached('pom', () => new THREE.IcosahedronGeometry(1, 0)), mat(H.flower)); f.position.copy(top); f.scale.setScalar(.015); g.add(f); }
    }
    return g;
  }
  for (let s = 0; s < H.stems; s++) {
    const a = s * 2.39996 + r() * .3;
    const spread = H.tuft ? .35 + r() * .5 + (H.low || 0) : .12 + r() * .18;
    const len = H.h * (.7 + r() * .35);
    const dir = new THREE.Vector3(Math.cos(a) * spread, 1, Math.sin(a) * spread).normalize();
    const base = new THREE.Vector3(Math.cos(a) * .01, 0, Math.sin(a) * .01);
    const top = base.clone().addScaledVector(dir, len);
    const stemCol = H.stalks ? H.stalks[s % H.stalks.length] : H.stem;
    stem(g, base, top, H.thick ? .012 : H.fine ? .0028 : H.woody ? .0045 : .0035, stemCol);
    if (H.tuft) { // leafy greens and parsley-like herbs: one big leaf at the end of each stalk
      const ld = dir.clone().add(new THREE.Vector3(Math.cos(a) * .3, H.upright ? .6 : .1, Math.sin(a) * .3)).normalize();
      place(g, leafGeo(H.leaf), mat(H.color), top.clone().addScaledVector(dir, -len * .25), ld, H.size * (.8 + r() * .35));
      for (let e = 1; e <= (H.extra || 0); e++) { // extra leaflets along the stalk: bushier parsley and coriander
        const p = base.clone().lerp(top, .5 + e * .12), side = (e % 2 ? 1 : -1);
        const ed = dir.clone().add(new THREE.Vector3(Math.cos(a + side) * .6, .2, Math.sin(a + side) * .6)).normalize();
        place(g, leafGeo(H.leaf), mat(H.color), p, ed, H.size * .7);
      }
      continue;
    }
    for (let k = 1; k <= H.pairs; k++) { // pairs of leaves up the stem, smaller toward the tip
      const t = k / (H.pairs + .5), p = base.clone().lerp(top, t);
      const sz = H.size * (1.15 - t * .55);
      const rot = a + k * Math.PI / 2;
      for (const sgn of [1, -1]) {
        const ld = new THREE.Vector3(Math.cos(rot) * sgn, H.leaf === 'needle' ? .9 : .45, Math.sin(rot) * sgn).normalize();
        place(g, leafGeo(H.leaf), mat(H.color), p, ld, sz);
      }
    }
    if (H.umbel) { // dill flower umbrellas
      for (let u = 0; u < 7; u++) { const ua = u * .9, tip = top.clone().add(new THREE.Vector3(Math.cos(ua) * .035, .03, Math.sin(ua) * .035)); stem(g, top, tip, .0015, H.stem); const f = new THREE.Mesh(cached('pom', () => new THREE.IcosahedronGeometry(1, 0)), mat(H.umbel)); f.position.copy(tip); f.scale.setScalar(.007); g.add(f); }
    }
  }
  g.scale.setScalar(scale);
  return g;
}

// A small terracotta pot with soil, faceted like the rest of the set
function pot(radius) {
  const g = new THREE.Group();
  const prof = [[0, 0], [radius * .74, 0], [radius * .9, radius * .95], [radius, radius * .95], [radius, radius * 1.18], [radius * .86, radius * 1.18], [radius * .82, radius * 1.05]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 10), mat('#e8865b'));
  body.castShadow = body.receiveShadow = true; g.add(body);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(radius * .84, 10), mat('#6b4a36'));
  soil.rotation.x = -Math.PI / 2; soil.position.y = radius * 1.05; g.add(soil);
  return g;
}

export function buildHerbPlant(id) {
  const H = HERBS[id]; if (!H) return null;
  const R = .085;
  const g = new THREE.Group();
  g.add(pot(R));
  const body = herbBody(id, 3);
  body.position.y = R * 1.05;
  g.add(body);
  return g;
}

// The harvest: a small bunch, tied with string (greens: a few leaves; pak choi and chard: a whole head)
export function buildHerbHarvest(id) {
  const H = HERBS[id]; if (!H) return null;
  const g = new THREE.Group();
  if (GREENS.has(id)) { // leafy greens are picked as a standing head or bunch of leaves
    const head = herbBody(id, 9, .8);
    g.add(head);
    return g;
  }
  const bunch = herbBody(id, 9, 1);
  // lay it down like a picked bunch
  const holder = new THREE.Group(); holder.add(bunch);
  holder.rotation.z = Math.PI / 2 - .25; holder.position.set(-H.h * .35, .025, 0);
  g.add(holder);
  if (!H.tuft || H.leaf === 'frill' || H.leaf === 'lobe') {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(.016, .004, 4, 10), mat('#d9c39a'));
    tie.position.set(-H.h * .35 + .03, .03, 0); tie.rotation.y = Math.PI / 2; g.add(tie);
  }
  return g;
}
