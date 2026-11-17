// Procedural 3D plants. Every plant is built in code from its "look" (habit, leaf, fruit),
// so one small engine draws all 24 plants at any growth stage, from seed (t=0) to fruiting (t=1).
import * as THREE from 'three';
import { rng } from './plants3d-rng.js';
import { leafTexture, LEAF_ASPECT, barkTexture, soilTexture, grassTexture, fruitTexture } from './textures.js';

const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export { rng };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- The look of each plant ----------
// habit decides the builder; the rest tunes it. Sizes are metres at full growth.
export const LOOKS = {
  tomato:     { habit: 'vine', calyx: true, h: 1.5, leaf: 'compound', leafSize: .2, leafColor: '#3d7a35', stake: true, fruit: { kind: 'sphere', r: .042, color: '#d9301c', truss: 4, count: 6 }, flower: '#f4d21f' },
  pepper:     { habit: 'fork', glossy: true, h: .7, leaf: 'oval', leafSize: .11, leafColor: '#2f6e2c', fruit: { kind: 'pepper', r: .036, color: '#c9221a', count: 5 } , flower: '#f6f4ea' },
  chilli:     { habit: 'fork', h: .6, leaf: 'lance', leafSize: .08, leafColor: '#33702e', fruit: { kind: 'chilli', r: .014, color: '#d61c12', count: 16 }, flower: '#f6f4ea' },
  cucumber:   { habit: 'climber', h: 1.8, leaf: 'heart', leafSize: .17, leafColor: '#3c7d33', support: 'trellis', fruit: { kind: 'long', r: .025, len: .26, color: '#2d5e1f', count: 4 }, flower: '#f2cf1d' },
  'green-beans': { habit: 'climber', h: 2.0, leaf: 'trifoliate', leafSize: .14, leafColor: '#46852f', support: 'canes', fruit: { kind: 'pod', r: .007, len: .15, color: '#58a33a', count: 14 }, flower: '#e64a3a' },
  peas:       { habit: 'climber', h: 1.2, leaf: 'pinnate', leafSize: .05, leafColor: '#6aa349', support: 'twigs', fruit: { kind: 'pod', r: .011, len: .08, color: '#6fb24a', count: 12 }, flower: '#f7f5f0' },
  courgette:  { habit: 'giantleaf', h: .7, leaf: 'lobed', leafSize: .3, leafK: 1.3, leafColor: '#2d6a2a', fruit: { kind: 'long', r: .045, len: .3, color: '#2f5a22', count: 3 }, flower: '#f2b01d' },
  strawberry: { habit: 'crown', calyx: true, h: .16, leaf: 'trifoliate', leafSize: .1, leafColor: '#357a2f', fruit: { kind: 'strawberry', r: .028, color: '#d4202a', count: 9 }, flower: '#ffffff' },
  raspberry:  { habit: 'canes', h: 1.6, leaf: 'pinnate', leafSize: .09, leafColor: '#3a7432', fruit: { kind: 'raspberry', r: .016, color: '#c2183b', count: 26 }, flower: '#fbfbf5' },
  blueberry:  { habit: 'shrub', h: 1.2, leaf: 'oval', leafSize: .06, leafColor: '#3f6f3a', wood: '#7a4b35', fruit: { kind: 'sphere', r: .009, color: '#3a4f9c', count: 40, cluster: true }, flower: '#f6efe8' },
  basil:      { habit: 'herb', glossy: true, h: .45, leaf: 'oval', leafSize: .065, leafColor: '#3e9a36', stems: 4 },
  mint:       { habit: 'herb', h: .5, leaf: 'serrate', leafSize: .05, leafColor: '#4b9a49', stems: 7 },
  lettuce:    { habit: 'rosette', h: .22, leaf: 'frilly', leafSize: .17, leafColor: '#86c04a', count: 22 },
  spinach:    { habit: 'rosette', h: .25, leaf: 'oval', leafSize: .15, leafColor: '#2f6f2b', count: 16, petiole: .08 },
  kale:       { habit: 'rosette', h: .6, leaf: 'frilly', leafSize: .28, leafColor: '#36543a', count: 14, petiole: .2, tall: true },
  carrot:     { habit: 'root', h: .35, leaf: 'feather', leafSize: .22, leafColor: '#3f8b33', root: { kind: 'carrot', color: '#ec7a14', len: .17, r: .022 } },
  radish:     { habit: 'root', h: .15, leaf: 'oval', leafSize: .09, leafColor: '#4a8f3a', root: { kind: 'radish', color: '#d6214f', r: .022 } },
  potato:     { habit: 'potato', h: .6, leaf: 'compound', leafSize: .13, leafColor: '#3a7232', root: { kind: 'potato', color: '#b98a52', r: .055 }, flower: '#e8e2f2' },
  onion:      { habit: 'allium', h: .45, leafColor: '#4f8a49', root: { kind: 'onion', color: '#b4652b', r: .045 } },
  garlic:     { habit: 'allium', h: .5, leafColor: '#5f8f53', flat: true, root: { kind: 'garlic', color: '#efe9dc', r: .03 } },
  apple:      { habit: 'tree', h: 3.2, leaf: 'oval', leafSize: .07, leafColor: '#3c7a34', bark: 'apple', fruit: { kind: 'apple', r: .04, color: '#c22a21', count: 46 }, flower: '#f8dfe6', depth: 4 },
  lemon:      { habit: 'tree', glossy: true, h: 2.4, leaf: 'oval', leafSize: .08, leafColor: '#2d5f2a', bark: '#6a5a46', fruit: { kind: 'lemon', r: .04, color: '#f3d221', count: 26 }, flower: '#ffffff', depth: 4, dense: true },
  birch:      { habit: 'tree', h: 14, leaf: 'birch', leafSize: .24, leafColor: '#6c9636', bark: 'birch', depth: 5, slender: true },
  oak:        { habit: 'tree', h: 16, leaf: 'oak', leafSize: .42, leafColor: '#3c6a2c', bark: 'oak', fruit: { kind: 'acorn', r: .12, color: '#8a6a2c', count: 30 }, depth: 5, wide: true },
};

// ---------- Geometry factories (cached) ----------
const geoCache = new Map();
function cached(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }

// A leaf is a flat outline (base at origin, tip at +Y=1) bent along its midrib.
function leafGeo(type) {
  return cached('leaf:' + type, () => {
    const W = LEAF_ASPECT[type] ?? .55;
    const g = new THREE.PlaneGeometry(W, 1, 8, 14);
    g.translate(0, .5, 0);
    const p = g.attributes.position;
    const fold = type === 'frilly' ? .06 : type === 'feather' ? .02 : .16, curl = type === 'frilly' ? .22 : type === 'lobed' ? .12 : .3;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), nx = Math.abs(x) / (W / 2);
      let z = -curl * y * y + fold * Math.abs(x) * (1 - y * .4);
      if (type === 'frilly' || type === 'lobed') z += Math.sin(y * 19 + x * 9) * .035 * nx * nx;
      z += Math.sin(y * 7 + x * 3) * .01; // a little life in the blade
      p.setZ(i, z);
    }
    g.computeVertexNormals();
    return g;
  });
}
function fruitGeo(kind) {
  return cached('fruit:' + kind, () => {
    const lathe = (prof) => new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 16);
    switch (kind) {
      case 'sphere': { const g = new THREE.SphereGeometry(1, 16, 12); g.scale(1, .86, 1); return g; }
      case 'apple': return lathe([[0, -.85], [.5, -.95], [.95, -.45], [1, .1], [.8, .7], [.35, .82], [0, .62]]);
      case 'lemon': { const g = new THREE.SphereGeometry(1, 16, 12); g.scale(.78, 1.15, .78); return g; }
      case 'pepper': return lathe([[0, -1.1], [.55, -1.05], [.9, -.6], [1, .2], [.95, .8], [.4, 1], [0, .95]]);
      case 'chilli': return lathe([[0, -6], [.25, -5], [.6, -3], [.9, -1], [1, .5], [.6, 1], [0, 1]]);
      case 'long': { const g = new THREE.CapsuleGeometry(1, 2, 6, 12); return g; }
      case 'pod': { const g = new THREE.CapsuleGeometry(1, 3, 4, 8); g.scale(1, 1, .55); return g; }
      case 'strawberry': return lathe([[0, -1.3], [.45, -1], [.85, -.2], [1, .45], [.7, .85], [0, .9]]);
      case 'raspberry': { const g = new THREE.IcosahedronGeometry(1, 2); g.scale(.9, 1.1, .9); return g; }
      case 'acorn': return lathe([[0, -1], [.5, -.8], [.62, 0], [.66, .4], [.7, .45], [.6, .9], [0, 1]]);
      case 'carrot': return lathe([[0, -1], [.08, -.8], [.3, -.3], [.5, .3], [.62, .85], [.45, 1], [0, 1]]);
      case 'radish': return lathe([[0, -1.5], [.06, -1.1], [.55, -.75], [.95, -.2], [.95, .3], [.6, .7], [0, .75]]);
      case 'potato': { const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position; const r = rng(7); for (let i = 0; i < p.count; i++) { const k = .85 + r() * .12; p.setXYZ(i, p.getX(i) * k * 1.35, p.getY(i) * k * .8, p.getZ(i) * k); } g.computeVertexNormals(); return g; }
      case 'onion': return lathe([[0, -.95], [.6, -.85], [.98, -.2], [.9, .35], [.4, .8], [.12, 1.1], [0, 1.15]]);
      case 'garlic': return lathe([[0, -.8], [.75, -.7], [1, -.1], [.8, .45], [.3, .85], [.1, 1.1], [0, 1.1]]);
      default: return new THREE.SphereGeometry(1, 12, 10);
    }
  });
}
const flowerGeo = () => cached('flower', () => {
  const g = new THREE.CircleGeometry(1, 5);
  const p = g.attributes.position;
  for (let i = 1; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)); const k = .55 + .45 * Math.abs(Math.cos(a * 2.5)); p.setXY(i, p.getX(i) * k, p.getY(i) * k); }
  g.rotateX(-Math.PI / 2); return g;
});

let birchTex;
function barkMaterial(bark) {
  if (bark === 'birch' || bark === 'oak' || bark === 'apple') return new THREE.MeshStandardMaterial({ map: barkTexture(bark), roughness: .92 });
  if (bark) return new THREE.MeshStandardMaterial({ map: barkTexture('tree'), color: bark, roughness: .9 });
  if (bark === 'birch') {
    if (!birchTex) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const x = c.getContext('2d'); x.fillStyle = '#ece9e0'; x.fillRect(0, 0, 64, 256);
      const r = rng(3); x.fillStyle = '#2b2622';
      for (let i = 0; i < 26; i++) { const y = r() * 256, w = 6 + r() * 30, h = 1.5 + r() * 4; x.fillRect(r() * 64 - w / 2, y, w, h); }
      birchTex = new THREE.CanvasTexture(c); birchTex.wrapS = birchTex.wrapT = THREE.RepeatWrapping; birchTex.repeat.set(1, 3);
      birchTex.colorSpace = THREE.SRGBColorSpace;
    }
    return new THREE.MeshStandardMaterial({ map: birchTex, roughness: .9 });
  }
  return new THREE.MeshStandardMaterial({ color: bark || '#4c6b2c', roughness: .85 });
}

// A tube that narrows toward its end, like a real stem or branch
function taperedTube(curve, segs, radius, endScale = .5, radial = 7) {
  const g = new THREE.TubeGeometry(curve, segs, radius, radial, false);
  const p = g.attributes.position, c = new THREE.Vector3(), v = new THREE.Vector3();
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
    this.leaves = []; this.fruits = []; this.flowers = []; this.stems = [];
    this.leafSizeK = lerp(.35, 1, smooth(0, .7, t)) * (look.leafK ?? 1.7);
    this.dummy = new THREE.Object3D();
  }
  // Orient something whose local +Y should point along `dir`, with its face (+Z) as close to `face` as possible.
  frame(pos, dir, scale, face = UP) {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
    const n = Z.clone().applyQuaternion(q);
    const want = face.clone().sub(dir.clone().normalize().multiplyScalar(face.dot(dir.clone().normalize())));
    if (want.lengthSq() > 1e-6) {
      want.normalize();
      let ang = n.angleTo(want);
      const cross = new THREE.Vector3().crossVectors(n, want);
      if (cross.dot(dir) < 0) ang = -ang;
      q.premultiply(new THREE.Quaternion().setFromAxisAngle(dir.clone().normalize(), ang));
    }
    const m = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(scale.x ?? scale, scale.y ?? scale, scale.z ?? scale));
    return m;
  }
  leaf(pos, dir, size, type = this.look.leaf) {
    const s = size * this.leafSizeK * (0.85 + this.r() * .3);
    if (s < 1e-4) return;
    if (type === 'compound' || type === 'pinnate' || type === 'trifoliate' || type === 'feather') {
      // a petiole with leaflets in pairs and one at the tip
      const d = dir.clone().normalize();
      const pairs = type === 'trifoliate' ? 1 : type === 'feather' ? 3 : type === 'pinnate' ? 3 : 4;
      const len = s * (type === 'feather' ? 1 : 1.6);
      const end = pos.clone().addScaledVector(d, len);
      this.stem([pos, pos.clone().addScaledVector(d, len * .5).add(new THREE.Vector3(0, len * .08, 0)), end], s * .025, this.look.leafColor);
      const side = new THREE.Vector3().crossVectors(d, UP); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
      const lt = type === 'feather' ? 'feather' : type === 'compound' ? 'serrate' : 'oval';
      for (let i = 0; i < pairs; i++) {
        const k = type === 'trifoliate' ? 1 : (i + 1) / (pairs + 1);
        const p = pos.clone().addScaledVector(d, len * k);
        const ls = s * (type === 'feather' ? .45 : .55) * (1 - k * .25);
        for (const sg of [1, -1]) {
          const dd = side.clone().multiplyScalar(sg).addScaledVector(d, .5).add(new THREE.Vector3(0, .15, 0)).normalize();
          this.leaves.push(this.frame(p, dd, ls));
        }
      }
      this.leaves.push(this.frame(end, d.clone().add(new THREE.Vector3(0, .1, 0)).normalize(), s * (type === 'feather' ? .45 : .62)));
      return;
    }
    this.leaves.push(this.frame(pos, dir.clone().normalize(), s, UP));
    this.leafType = type;
  }
  stem(points, radius, color = this.look.leafColor, mat) {
    if (points.length < 2 || radius <= 0) return;
    const curve = new THREE.CatmullRomCurve3(points);
    const g = taperedTube(curve, Math.max(4, points.length * 4), Math.max(radius, .002), .45);
    const m = new THREE.Mesh(g, mat || new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(.8), roughness: .7 }));
    m.castShadow = true; this.group.add(m);
  }
  fruitAt(pos, size, hang = true, kind) {
    const f = this.look.fruit || this.look.root; if (!f) return;
    const k = smooth(.72, .98, this.t); if (k <= 0) return;
    const ripe = this.t;
    const sz = size * k;
    const q = new THREE.Quaternion();
    if (hang && (f.kind === 'chilli' || f.kind === 'long' || f.kind === 'pod')) {
      q.setFromAxisAngle(new THREE.Vector3(1, 0, 0).applyAxisAngle(UP, this.r() * 6.28), (this.r() - .5) * .5);
    } else q.setFromAxisAngle(UP, this.r() * 6.28);
    let sc;
    if (f.kind === 'long' || f.kind === 'pod') sc = new THREE.Vector3(f.r, f.len / (f.kind === 'pod' ? 5 : 4), f.r).multiplyScalar(k);
    else if (f.kind === 'chilli') sc = new THREE.Vector3(f.r, f.r * 1.3, f.r).multiplyScalar(k);
    else sc = new THREE.Vector3(sz, sz, sz);
    const p = pos.clone();
    if (hang && (f.kind === 'long' || f.kind === 'pod')) p.y -= f.len * .5 * k;
    this.fruits.push({ m: new THREE.Matrix4().compose(p, q, sc), ripe });
  }
  flowerAt(pos, size) {
    if (!this.look.flower) return;
    const k = smooth(.5, .62, this.t) * (1 - smooth(.86, .97, this.t));
    if (k <= 0) return;
    this.flowers.push(new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(UP, this.r() * 6), new THREE.Vector3(size * k, size * k, size * k)));
  }
  finish() {
    const L = this.look;
    if (this.leaves.length) {
      const type = (L.leaf === 'compound') ? 'serrate' : L.leaf === 'pinnate' ? 'oval' : L.leaf === 'trifoliate' ? 'serrate' : (L.leaf || 'oval');
      const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: leafTexture(type), alphaTest: .45, side: THREE.DoubleSide, roughness: L.glossy ? .38 : .62 });
      const im = new THREE.InstancedMesh(leafGeo(type), mat, this.leaves.length);
      const base = new THREE.Color(L.leafColor); const c = new THREE.Color();
      this.leaves.forEach((m, i) => { im.setMatrixAt(i, m); c.copy(base).offsetHSL((this.r() - .5) * .03, (this.r() - .5) * .08, (this.r() - .5) * .08); im.setColorAt(i, c); });
      im.castShadow = true; this.group.add(im);
    }
    const f = L.fruit || L.root;
    if (this.fruits.length && f) {
      const mat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: fruitTexture(f.kind), roughness: f.kind === 'apple' || f.kind === 'pepper' || f.kind === 'sphere' ? .28 : f.kind === 'lemon' ? .45 : .6, clearcoat: f.kind === 'pepper' || f.kind === 'sphere' || f.kind === 'apple' ? .6 : 0, clearcoatRoughness: .25 });
      const im = new THREE.InstancedMesh(fruitGeo(f.kind), mat, this.fruits.length);
      const ripeC = new THREE.Color(f.color), green = new THREE.Color(L.root ? f.color : '#6aa040');
      this.fruits.forEach((o, i) => { im.setMatrixAt(i, o.m); im.setColorAt(i, green.clone().lerp(ripeC, smooth(.8, 1, o.ripe))); });
      im.castShadow = true; this.group.add(im);
      if (L.calyx) { // the green star of sepals on top of each tomato or strawberry
        const cg = cached('calyx', () => { const g = new THREE.CircleGeometry(1, 10); const p = g.attributes.position; for (let i = 1; i < p.count; i++) { const k = (i % 2) ? 1 : .35; p.setXY(i, p.getX(i) * k, p.getY(i) * k); } g.rotateX(-Math.PI / 2); return g; });
        const cm = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ color: '#3d6e2a', side: THREE.DoubleSide, roughness: .7 }), this.fruits.length);
        const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), m = new THREE.Matrix4();
        this.fruits.forEach((o, i) => { o.m.decompose(pos, q, sc); const top = L.fruit.kind === 'strawberry' ? .9 : .84; m.compose(pos.clone().add(new THREE.Vector3(0, sc.y * top, 0)), new THREE.Quaternion().setFromAxisAngle(UP, i), new THREE.Vector3(sc.x * .7, sc.x, sc.x * .7)); cm.setMatrixAt(i, m); });
        this.group.add(cm);
      }
    }
    if (this.flowers.length) {
      const im = new THREE.InstancedMesh(flowerGeo(), new THREE.MeshStandardMaterial({ color: L.flower, side: THREE.DoubleSide, roughness: .6 }), this.flowers.length);
      this.flowers.forEach((m, i) => im.setMatrixAt(i, m));
      this.group.add(im);
    }
    return this.group;
  }
}

// Wobbly upward path
function upPath(r, base, height, n, wobble, lean = new THREE.Vector3()) {
  const pts = [base.clone()];
  for (let i = 1; i <= n; i++) {
    const k = i / n;
    pts.push(new THREE.Vector3(base.x + lean.x * k * height + (r() - .5) * wobble, base.y + height * k, base.z + lean.z * k * height + (r() - .5) * wobble));
  }
  return pts;
}

const BUILD = {
  vine(b) {
    const L = b.look, H = L.h * b.t ** .9, r = b.r;
    const nodes = Math.max(2, Math.round(lerp(2, 16, b.t)));
    const pts = upPath(r, new THREE.Vector3(), H, nodes, .05);
    b.stem(pts, .012 * (.4 + b.t));
    if (L.stake && b.t > .3) b.stem([new THREE.Vector3(.06, -.1, 0), new THREE.Vector3(.06, L.h * 1.05, 0)], .009, '#a07b52');
    pts.forEach((p, i) => {
      if (i === 0) return;
      const az = i * 2.4;
      const dir = new THREE.Vector3(Math.cos(az), .25, Math.sin(az));
      b.leaf(p, dir, L.leafSize * (1 - i / (nodes * 1.6)));
      if (i % 3 === 1 && i < nodes - 1) {
        // a truss of flowers turning into fruit
        const tp = p.clone().addScaledVector(new THREE.Vector3(Math.cos(az + 3.1), -.3, Math.sin(az + 3.1)), .08);
        b.stem([p, tp], .004);
        const n = L.fruit.truss || 4;
        for (let j = 0; j < n; j++) {
          const fp = tp.clone().add(new THREE.Vector3((r() - .5) * .09, -.03 - j * .035, (r() - .5) * .09));
          b.fruitAt(fp, L.fruit.r * (.8 + r() * .35));
          b.flowerAt(fp.clone().add(new THREE.Vector3(0, .02, 0)), .018);
        }
      }
    });
  },
  fork(b) {
    const L = b.look, H = L.h * b.t ** .9, r = b.r;
    const trunk = [new THREE.Vector3(), new THREE.Vector3(0, H * .35, 0)];
    b.stem(trunk, .01 * (.4 + b.t));
    for (let k = 1; k <= 4; k++) b.leaf(new THREE.Vector3(0, H * .35 * k / 4.5, 0), new THREE.Vector3(Math.cos(k * 2.4), .3, Math.sin(k * 2.4)), L.leafSize * 1.1);
    const tips = [];
    const grow = (p, dir, len, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      b.stem([p, p.clone().lerp(end, .5).add(new THREE.Vector3((r() - .5) * .02, 0, 0)), end], .007 * (depth + 1) / 3);
      for (let k = 1; k <= 3; k++) b.leaf(p.clone().lerp(end, k / 3), new THREE.Vector3(r() - .5, .3, r() - .5), L.leafSize);
      if (depth > 0 && b.t > .25) for (let s of [-1, 1]) {
        const nd = dir.clone().applyAxisAngle(UP, r() * 3).add(new THREE.Vector3(s * .35, .1, (r() - .5) * .4)).normalize();
        grow(end, nd, len * .78, depth - 1);
      } else tips.push(end);
    };
    grow(trunk[1], new THREE.Vector3(0, 1, 0), H * .25, 2);
    for (let i = 0; i < L.fruit.count && b.t > .5; i++) {
      const tp = tips[i % tips.length].clone().add(new THREE.Vector3((r() - .5) * .1, -.06 - r() * .1, (r() - .5) * .1));
      b.fruitAt(tp, L.fruit.r, true);
      b.flowerAt(tp.clone().add(new THREE.Vector3(0, .05, 0)), .014);
    }
  },
  climber(b) {
    const L = b.look, H = L.h * b.t ** .85, r = b.r;
    if (b.t > .2) {
      if (L.support === 'trellis') { for (const x of [-.18, .18]) b.stem([new THREE.Vector3(x, -.1, -.05), new THREE.Vector3(x, L.h, -.05)], .008, '#9a7a55'); for (let y = .3; y < L.h; y += .3) b.stem([new THREE.Vector3(-.18, y, -.05), new THREE.Vector3(.18, y, -.05)], .004, '#9a7a55'); }
      else if (L.support === 'canes') for (const a of [0, 2.1, 4.2]) b.stem([new THREE.Vector3(Math.cos(a) * .15, -.1, Math.sin(a) * .15), new THREE.Vector3(0, L.h * 1.05, 0)], .008, '#b49058');
      else b.stem([new THREE.Vector3(.05, -.1, -.05), new THREE.Vector3(.02, L.h, -.06), new THREE.Vector3(-.04, L.h * .9, -.04)], .006, '#8a6a4a');
    }
    const n = Math.max(3, Math.round(lerp(3, 22, b.t)));
    const pts = [];
    for (let i = 0; i <= n; i++) { const k = i / n, a = k * 9 + .5; const rad = L.support === 'canes' ? .15 * (1 - k) + .02 : .06; pts.push(new THREE.Vector3(Math.cos(a) * rad, H * k, Math.sin(a) * rad - .02)); }
    b.stem(pts, .006 * (.5 + b.t));
    pts.forEach((p, i) => {
      if (i === 0) return;
      const az = i * 2.2;
      b.leaf(p, new THREE.Vector3(Math.cos(az), .2, Math.sin(az) + .6), L.leafSize);
      if (i % 2 === 0 && i > 2) {
        const fp = p.clone().add(new THREE.Vector3(Math.cos(az + 2) * .07, -.02, Math.sin(az + 2) * .07 + .05));
        b.fruitAt(fp, L.fruit.r, true);
        b.flowerAt(fp.clone().add(new THREE.Vector3(0, .03, 0)), .02);
      }
    });
  },
  giantleaf(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(2, 11, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, rise = .25 + r() * .4, len = L.h * (.5 + r() * .5) * b.t ** .6;
      const end = new THREE.Vector3(Math.cos(a) * len * .7, len * rise + .05, Math.sin(a) * len * .7);
      b.stem([new THREE.Vector3(), new THREE.Vector3(end.x * .4, end.y * .9, end.z * .4), end], .01);
      b.leaf(end, new THREE.Vector3(Math.cos(a), .15, Math.sin(a)), L.leafSize);
    }
    for (let i = 0; i < L.fruit.count; i++) {
      const a = i * 2.1 + .4;
      const p = new THREE.Vector3(Math.cos(a) * .12, .04, Math.sin(a) * .12);
      const k = smooth(.72, .98, b.t);
      if (k > 0) { const q = new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(Math.cos(a), .25, Math.sin(a)).normalize()); b.fruits.push({ m: new THREE.Matrix4().compose(p.addScaledVector(new THREE.Vector3(Math.cos(a), .1, Math.sin(a)), L.fruit.len * .45 * k), q, new THREE.Vector3(L.fruit.r, L.fruit.len / 4, L.fruit.r).multiplyScalar(k)), ripe: 1 }); }
      b.flowerAt(new THREE.Vector3(Math.cos(a + 1) * .1, .12, Math.sin(a + 1) * .1), .05);
    }
  },
  crown(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(2, 14, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, len = L.h * (.6 + r() * .5) * (.4 + b.t * .6);
      const end = new THREE.Vector3(Math.cos(a) * len * .5, len, Math.sin(a) * len * .5);
      b.stem([new THREE.Vector3(), end.clone().multiplyScalar(.5).add(new THREE.Vector3(0, len * .2, 0)), end], .003);
      b.leaf(end, new THREE.Vector3(Math.cos(a), .4, Math.sin(a)), L.leafSize, 'trifoliate');
    }
    for (let i = 0; i < L.fruit.count; i++) {
      const a = i * 2.7 + 1, d = .12 + r() * .1;
      const tip = new THREE.Vector3(Math.cos(a) * d, .02 + r() * .03, Math.sin(a) * d);
      b.stem([new THREE.Vector3(0, .02, 0), new THREE.Vector3(tip.x * .5, .1, tip.z * .5), tip.clone().add(new THREE.Vector3(0, .02, 0))], .002);
      b.fruitAt(tip, L.fruit.r * (.8 + r() * .4), false);
      b.flowerAt(tip.clone().add(new THREE.Vector3(0, .03, 0)), .014);
    }
  },
  canes(b) {
    const L = b.look, r = b.r;
    const canes = 5;
    for (let c = 0; c < canes; c++) {
      const a = c * 1.3, H = L.h * (.7 + r() * .3) * b.t ** .8;
      const lean = new THREE.Vector3(Math.cos(a) * .12, 0, Math.sin(a) * .12);
      const pts = upPath(r, new THREE.Vector3(Math.cos(a) * .05, 0, Math.sin(a) * .05), H, 8, .03, lean);
      b.stem(pts, .008, '#7d5a3e');
      pts.forEach((p, i) => {
        if (i < 2) return;
        b.leaf(p, new THREE.Vector3(Math.cos(a + i * 2), .2, Math.sin(a + i * 2)), L.leafSize);
        if (i > 3) for (let k = 0; k < 2; k++) {
          const fp = p.clone().add(new THREE.Vector3((r() - .5) * .12, -.04, (r() - .5) * .12));
          b.fruitAt(fp, L.fruit.r);
          b.flowerAt(fp.clone().add(new THREE.Vector3(0, .02, 0)), .012);
        }
      });
    }
  },
  shrub(b) {
    const L = b.look, r = b.r;
    const tips = [];
    const grow = (p, dir, len, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      b.stem([p, end], .004 * (depth + 1), L.wood);
      for (let k = 1; k <= 6; k++) b.leaf(p.clone().lerp(end, k / 6), new THREE.Vector3(r() - .5, .4, r() - .5), L.leafSize);
      if (depth > 0) for (let i = 0; i < 2; i++) grow(end, dir.clone().add(new THREE.Vector3((r() - .5) * .9, .2, (r() - .5) * .9)).normalize(), len * .75, depth - 1);
      else tips.push(end);
    };
    const S = L.h * b.t ** .8;
    for (let i = 0; i < 4; i++) grow(new THREE.Vector3(), new THREE.Vector3((r() - .5) * .5, 1, (r() - .5) * .5).normalize(), S * .32, b.t > .3 ? 3 : 1);
    tips.forEach((tp) => { for (let k = 0; k < 4; k++) { const fp = tp.clone().add(new THREE.Vector3((r() - .5) * .05, -.03 - r() * .03, (r() - .5) * .05)); b.fruitAt(fp, L.fruit.r); b.flowerAt(fp, .008); } });
  },
  herb(b) {
    const L = b.look, r = b.r;
    for (let s = 0; s < L.stems; s++) {
      const a = s * 2.4, H = L.h * (.6 + r() * .4) * b.t ** .8;
      const pts = upPath(r, new THREE.Vector3(Math.cos(a) * .02, 0, Math.sin(a) * .02), H, 9, .02, new THREE.Vector3(Math.cos(a) * .2, 0, Math.sin(a) * .2));
      b.stem(pts, .004);
      pts.forEach((p, i) => {
        if (i === 0) return;
        const az = a + (i % 2) * Math.PI / 2;
        const ls = L.leafSize * (1.2 - i / 11);
        b.leaf(p, new THREE.Vector3(Math.cos(az), .35, Math.sin(az)), ls);
        b.leaf(p, new THREE.Vector3(-Math.cos(az), .35, -Math.sin(az)), ls);
      });
    }
  },
  rosette(b) {
    const L = b.look, r = b.r;
    const n = Math.round(lerp(3, L.count, b.t));
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996, k = i / n; // outer leaves are older
      const tilt = lerp(.15, 1.2, k);
      const base = new THREE.Vector3(0, L.tall ? (1 - k) * L.h * .5 * b.t : .01, 0);
      const pl = (L.petiole || 0) * (1 - k * .5) * b.t;
      const dir = new THREE.Vector3(Math.cos(a), tilt, Math.sin(a)).normalize();
      const start = base.clone().addScaledVector(dir, pl);
      if (pl > 0) b.stem([base, start], .004);
      b.leaf(start, dir, L.leafSize * lerp(1, .55, k));
    }
  },
  root(b) {
    const L = b.look, R = L.root, r = b.r;
    const n = Math.round(lerp(2, 9, b.t));
    for (let i = 0; i < n; i++) { const a = i * 2.4; b.leaf(new THREE.Vector3(0, .01, 0), new THREE.Vector3(Math.cos(a) * .5, 1, Math.sin(a) * .5), L.leafSize * (.7 + r() * .3)); }
    const k = smooth(.3, 1, b.t);
    if (k > 0) {
      // one root still in the ground (shoulders showing), one pulled and lying beside it
      const s = (R.r) * k;
      const sc = R.kind === 'carrot' ? new THREE.Vector3(s, R.len / 2 * k, s) : new THREE.Vector3(s, s, s);
      b.fruits.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(0, R.kind === 'carrot' ? -R.len / 2 * k + .015 : -s * .2, 0), new THREE.Quaternion(), sc), ripe: 1 });
      if (b.t > .9) b.fruits.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(.2, s * .8, .12), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, .3, 1).normalize(), 1.45), sc), ripe: 1 });
    }
  },
  potato(b) {
    BUILD.fork(Object.assign(b, { look: { ...b.look, fruit: { kind: 'sphere', r: 0, count: 0 } } }));
    const R = b.look.root;
    const k = smooth(.75, 1, b.t);
    for (let i = 0; i < 5 && k > 0; i++) {
      const a = i * 1.25 - 2.5;
      b.fruits.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(.25 + Math.cos(a) * .12, R.r * .7, .1 + Math.sin(a) * .12), new THREE.Quaternion().setFromAxisAngle(UP, i), new THREE.Vector3(R.r, R.r, R.r).multiplyScalar(k * (.7 + (i % 3) * .2))), ripe: 1 });
    }
    b.look = { ...b.look, fruit: undefined };
  },
  allium(b) {
    const L = b.look, R = L.root, r = b.r;
    const n = Math.round(lerp(1, 8, b.t));
    const k = smooth(.2, 1, b.t);
    const bulbR = R.r * k;
    const mat = new THREE.MeshStandardMaterial({ color: L.leafColor, roughness: .6, side: THREE.DoubleSide });
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, H = L.h * (.7 + r() * .3) * b.t ** .7;
      const pts = [new THREE.Vector3(0, bulbR, 0), new THREE.Vector3(Math.cos(a) * .03, H * .5, Math.sin(a) * .03), new THREE.Vector3(Math.cos(a) * .12, H, Math.sin(a) * .12), new THREE.Vector3(Math.cos(a) * .2, H * .85, Math.sin(a) * .2)];
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, L.flat ? .008 : .006, 5);
      if (L.flat) g.scale(1, 1, .4);
      b.group.add(new THREE.Mesh(g, mat));
    }
    if (bulbR > 0) b.fruits.push({ m: new THREE.Matrix4().compose(new THREE.Vector3(0, bulbR * .6, 0), new THREE.Quaternion(), new THREE.Vector3(bulbR, bulbR, bulbR)), ripe: 1 });
  },
  tree(b) {
    const L = b.look, r = b.r;
    const H = L.h * lerp(.06, 1, b.t ** 1.1);
    const mat = barkMaterial(L.bark);
    const tips = [];
    const depthMax = b.t < .3 ? 2 : b.t < .6 ? L.depth - 1 : L.depth;
    const grow = (p, dir, len, rad, depth) => {
      const end = p.clone().addScaledVector(dir, len);
      const mid = p.clone().lerp(end, .5).add(new THREE.Vector3((r() - .5) * len * .1, 0, (r() - .5) * len * .1));
      const g = taperedTube(new THREE.CatmullRomCurve3([p, mid, end]), 6, rad, .62, 8);
      const m = new THREE.Mesh(g, mat); m.castShadow = true; b.group.add(m);
      if (depth >= depthMax) { tips.push({ p: end, dir }); return; }
      const kids = depth === 0 ? (L.slender ? 4 : 3) : 2 + (r() > .5 ? 1 : 0);
      for (let i = 0; i < kids; i++) {
        const spread = L.wide ? .95 : L.slender ? .45 : .7;
        let nd = dir.clone().add(new THREE.Vector3(Math.cos(i * 2.4 + r()) * spread, .15 + r() * .3, Math.sin(i * 2.4 + r()) * spread));
        if (L.slender && depth >= 2) nd.y -= .5; // birch twigs droop
        nd.normalize();
        const start = depth === 0 ? p.clone().lerp(end, (L.slender ? .5 : .62) + i * ((L.slender ? .5 : .38) / kids)) : end;
        grow(start, nd, len * (L.slender ? .62 : .68), rad * .6, depth + 1);
      }
    };
    grow(new THREE.Vector3(), UP.clone(), H * (L.slender ? .55 : .42), H * (L.slender ? .018 : .03), 0);
    // leaves gather at the twig tips
    const per = L.dense ? 30 : L.slender ? 26 : 24;
    tips.forEach(({ p, dir }) => {
      for (let i = 0; i < per; i++) {
        const q = p.clone().add(new THREE.Vector3((r() - .5), (r() - .5) * .8, (r() - .5)).multiplyScalar(H * (L.slender ? .07 : .09)));
        b.leaf(q, new THREE.Vector3(r() - .5, L.slender ? -.4 : .3, r() - .5), L.leafSize * .8 * (H / L.h) ** .3);
      }
      if (L.fruit) for (let i = 0; i < Math.ceil(L.fruit.count / tips.length) && b.t > .7; i++) {
        const q = p.clone().add(new THREE.Vector3((r() - .5), -.4 - r() * .3, (r() - .5)).multiplyScalar(H * .08));
        b.fruitAt(q, L.fruit.r * (H / 2) ** .15);
        b.flowerAt(q.clone().add(new THREE.Vector3(0, .03, 0)), .02 * (H / 2));
      }
    });
  },
};

// Build a plant group for `id` at growth t (0 seed .. 1 fruiting).
export function buildPlant(id, t = 1, seed = 11) {
  const look = LOOKS[id] || LOOKS.basil;
  if (t < .08) { // just a seed in the soil
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), new THREE.MeshStandardMaterial({ color: '#8a6a3e' }));
    s.scale.set(1.3, .8, 1); s.position.y = .006; g.add(s);
    return g;
  }
  if (t < .2) { // sprout: two seed leaves
    const b = new Builder({ ...look, leaf: 'oval', leafSize: .035, fruit: null, root: null, flower: null }, 1, seed);
    const h = .03 + (t - .08) * .5;
    b.stem([new THREE.Vector3(), new THREE.Vector3(.004, h * .6, 0), new THREE.Vector3(0, h, 0)], .0025);
    b.leafSizeK = .6 + (t - .08) * 3;
    b.leaf(new THREE.Vector3(0, h, 0), new THREE.Vector3(1, .5, 0), .035, 'oval');
    b.leaf(new THREE.Vector3(0, h, 0), new THREE.Vector3(-1, .5, 0), .035, 'oval');
    return b.finish();
  }
  const b = new Builder(look, t, seed);
  BUILD[look.habit](b);
  return b.finish();
}

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && ![...geoCache.values()].includes(o.geometry)) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); // textures are shared and cached, so they stay
  });
}

// A soil plug or ground disc for the plant to stand on
export function ground(kind = 'soil', radius = .35) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), new THREE.MeshStandardMaterial({ map: kind === 'grass' ? grassTexture() : soilTexture(), roughness: 1 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; g.add(top);
  const side = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * .96, radius * .14, 48, 1, true), new THREE.MeshStandardMaterial({ color: kind === 'grass' ? '#5a3e2b' : '#3a281c', roughness: 1, side: THREE.DoubleSide }));
  side.position.y = -radius * .07; g.add(side);
  return g;
}
