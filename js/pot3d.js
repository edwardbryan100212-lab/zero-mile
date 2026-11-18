// A terracotta pot with a little LCD module on the front: a dark bevelled bezel around a black screen
// showing Pip's green pixel face (drawn by js/face.js), which blinks, wiggles and changes with the mood.
import * as THREE from 'three';
import { drawFace } from './face.js';
import { soilTexture } from './textures.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// better moods hop, worse ones droop
const RANK = { poorly: 0, thirsty: 1, sleepy: 2, okay: 2, new: 2, happy: 3, thriving: 4 };
const LIGHT = { thriving: '#7dff9e', happy: '#7dff9e', okay: '#5fe08a', new: '#4fd67e', sleepy: '#9fb8ff', thirsty: '#ffd25e', poorly: '#ff8a6b' };

export function makePot(radius = .14) {
  const R = radius, H = R * 1.25;
  const g = new THREE.Group();
  const clay = new THREE.MeshStandardMaterial({ color: '#c8693f', roughness: .82 });
  const prof = [[0, -H], [R * .74, -H], [R * .78, -H + .01], [R * .96, -H * .12], [R * 1.0, -H * .1], [R * 1.08, -H * .1], [R * 1.1, 0], [R * 1.02, .002], [R * .98, -H * .05]];
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), clay);
  body.castShadow = body.receiveShadow = true; g.add(body);
  const soilY = -H * .06;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(R * .98, 48), new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1 }));
  soil.rotation.x = -Math.PI / 2; soil.position.y = soilY; g.add(soil);

  // radius of the pot wall at height y, so the screen module sits snug on the slope
  const y0 = -H + .01, y1 = -H * .12;
  const wall = (y) => R * .78 + (y - y0) / (y1 - y0) * R * .18;
  const midY = -H * .41, tilt = Math.atan2(R * .18, y1 - y0);

  // the LCD module: a chunky dark bezel (rounded, bevelled box) with a flat black screen in it
  const BW = R * 1.0, BH = R * .64, BD = R * .16, BV = R * .03;
  const shape = new THREE.Shape();
  { const x = -BW / 2, y = -BH / 2, r = R * .2;
    shape.moveTo(x + r, y); shape.lineTo(x + BW - r, y); shape.quadraticCurveTo(x + BW, y, x + BW, y + r);
    shape.lineTo(x + BW, y + BH - r); shape.quadraticCurveTo(x + BW, y + BH, x + BW - r, y + BH);
    shape.lineTo(x + r, y + BH); shape.quadraticCurveTo(x, y + BH, x, y + BH - r);
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y); }
  const bezGeo = new THREE.ExtrudeGeometry(shape, { depth: BD, bevelEnabled: true, bevelThickness: BV, bevelSize: BV, bevelSegments: 5, curveSegments: 12 });
  const bez = new THREE.Mesh(bezGeo, new THREE.MeshStandardMaterial({ color: '#1b211d', roughness: .42, metalness: .05 }));
  bez.castShadow = true;
  const mod = new THREE.Group();
  const zb = Math.sqrt(Math.max(0, wall(midY) ** 2 - (BW / 2) ** 2)) - R * .03; // back corners tuck into the wall
  bez.position.z = zb; mod.add(bez);

  // the screen: the face canvas, crisp pixels (nearest filter), unlit so the green reads as light
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false;
  const SW = R * .86, SH = SW * c.height / c.width;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: .5, toneMapped: false }));
  scr.position.z = zb + BD + BV + R * .004; mod.add(scr);
  mod.position.y = midY; mod.rotation.x = tilt;
  g.add(mod);

  // a little antenna on the rim with a light that shows the mood
  const ant = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(R * .016, R * .022, R * .4, 10), new THREE.MeshStandardMaterial({ color: '#33443a', roughness: .5 }));
  stem.position.y = R * .2; ant.add(stem);
  const bulbMat = new THREE.MeshStandardMaterial({ color: LIGHT.new, emissive: LIGHT.new, emissiveIntensity: .9, roughness: .3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(R * .065, 20, 14), bulbMat);
  bulb.position.y = R * .42; ant.add(bulb);
  const aa = 1.15; // around the rim, to the right of the face
  ant.position.set(Math.sin(aa) * R * 1.04, -H * .02, Math.cos(aa) * R * 1.04);
  ant.rotation.set(Math.cos(aa) * .22, 0, -Math.sin(aa) * .22); // leans out a little
  g.add(ant);

  // a saucer
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(R * .95, R * .85, R * .08, 48), clay);
  saucer.position.y = -H - R * .04; saucer.receiveShadow = true; g.add(saucer);
  const bottom = -H - R * .08;

  let mood = 'new', t = 0, since = 0;
  function draw() {
    const x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    drawFace(x, c.width, c.height, mood, t, { bg: false });
    tex.needsUpdate = true;
  }
  draw();

  // the react animation: a hop for a better mood, a droop for a worse one (600 ms, one overshoot at most)
  let react = null, moved = 0;
  const bump = (p, a, b) => (p > a && p < b ? Math.sin(Math.PI * (p - a) / (b - a)) : 0);
  function animate(dt) {
    if (!react) return;
    react.p = Math.min(1, react.p + dt / .6);
    const p = react.p, s0 = react.s, up = react.up;
    let sy, dy;
    if (up) { // crouch, hop with a stretch, land with a squash, settle
      sy = 1 - .1 * bump(p, 0, .18) + .06 * bump(p, .18, .62) - .07 * bump(p, .62, .82);
      dy = R * .28 * bump(p, .18, .66);
    } else { // sag down, then one small lift back
      sy = 1 - .09 * bump(p, 0, .62) + .025 * bump(p, .62, 1);
      dy = 0;
    }
    const sx = 1 / Math.sqrt(sy);
    g.scale.set(s0 * sx, s0 * sy, s0 * sx);
    g.position.y = react.y + s0 * (dy + bottom * (1 - sy)); // squash about the saucer, not the rim
    // the plant sits in the soil, so it rides along with the hop and the squash
    const lift = s0 * (dy + (sy - 1) * (soilY - bottom));
    for (const o of g.parent?.children || []) if (o !== g) o.position.y += lift - moved;
    moved = lift;
    if (p >= 1) { g.scale.setScalar(s0); g.position.y = react.y; react = null; moved = 0; }
  }

  return {
    group: g, height: H,
    setMood(m) {
      if (m === mood) return;
      const prev = mood; mood = m;
      bulbMat.color.set(LIGHT[m] || LIGHT.okay); bulbMat.emissive.set(LIGHT[m] || LIGHT.okay);
      draw();
      if (reduce.matches || (RANK[m] ?? 2) === (RANK[prev] ?? 2)) return;
      if (react) { g.scale.setScalar(react.s); g.position.y = react.y; for (const o of g.parent?.children || []) if (o !== g) o.position.y -= moved; moved = 0; }
      react = { p: 0, up: (RANK[m] ?? 2) > (RANK[prev] ?? 2), s: g.scale.y, y: g.position.y };
    },
    tick(dt) { // idle life at about 16 fps, only while the viewer is rendering
      t += dt; since += dt;
      animate(dt);
      bulb.position.y = R * (.42 + Math.sin(t * 2.4) * .015);
      if (since >= 1 / 16) { since = 0; draw(); }
    },
  };
}
